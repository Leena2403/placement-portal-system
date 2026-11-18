// frontend/static/component/chat_widget.js
// Floating Placement Assistant (Hugging Face) shown on the student dashboard.

const ChatWidget = {
    template: `
    <div class="chat-widget-root">
        <style>
            .chat-widget-root { position: fixed; bottom: 24px; right: 24px; z-index: 2500; }
            .chat-widget-toggle { border-radius: 30px; background-color: #009ac4; border: none; }
            .chat-widget-toggle:hover { background-color: #0086ab; }
            .chat-widget-panel { width: 360px; height: 500px; border-radius: 15px; overflow: hidden; }
            .chat-widget-header { background-color: #009ac4; }
            .chat-widget-body { background-color: #f4f7f6; overflow-y: auto; }
            .chat-widget-msg { max-width: 85%; white-space: pre-wrap; word-wrap: break-word; font-size: 0.9rem; }
            .chat-widget-msg.user { background-color: #009ac4; color: #fff; border-radius: 15px 15px 4px 15px; }
            .chat-widget-msg.assistant { background-color: #fff; color: #212529; border-radius: 15px 15px 15px 4px; }
            .chat-widget-chip { border-radius: 20px; font-size: 0.8rem; }
            @media (max-width: 480px) { .chat-widget-panel { width: calc(100vw - 32px); } }
        </style>

        <button v-if="!isOpen" @click="isOpen = true" class="btn btn-primary chat-widget-toggle shadow-lg px-4 py-2 fw-bold">
            💬 Ask Assistant
        </button>

        <div v-else class="card chat-widget-panel shadow-lg border-0 d-flex flex-column">
            <div class="chat-widget-header text-white d-flex justify-content-between align-items-center px-3 py-2">
                <div>
                    <div class="fw-bold">Placement Assistant</div>
                    <small class="opacity-75">Drives, eligibility and interview prep</small>
                </div>
                <button @click="isOpen = false" class="btn-close btn-close-white" aria-label="Close"></button>
            </div>

            <div ref="chatBody" class="chat-widget-body flex-grow-1 p-3 d-flex flex-column gap-2">
                <div v-if="messages.length === 0" class="text-muted small">
                    <p class="mb-2">Hi {{ displayName }}! Ask me about open drives, your eligibility, your applications or interview prep.</p>
                    <button v-for="q in suggestions" :key="q" @click="send(q)"
                        class="btn btn-outline-secondary btn-sm chat-widget-chip d-block text-start mb-2">{{ q }}</button>
                </div>

                <div v-for="(m, i) in messages" :key="i"
                    :class="['chat-widget-msg', 'px-3', 'py-2', 'shadow-sm', m.role, m.role === 'user' ? 'align-self-end' : 'align-self-start']">
                    {{ m.content }}
                </div>

                <div v-if="isLoading" class="chat-widget-msg assistant align-self-start px-3 py-2 shadow-sm text-muted">
                    <span class="spinner-border spinner-border-sm me-2"></span>Thinking…
                </div>
                <div v-if="errorMsg" class="alert alert-danger py-2 small mb-0">{{ errorMsg }}</div>
            </div>

            <form @submit.prevent="send()" class="border-top bg-white p-2 d-flex gap-2">
                <input v-model="draft" type="text" class="form-control" placeholder="Type your question…"
                    maxlength="500" :disabled="isLoading">
                <button type="submit" class="btn btn-primary fw-bold px-3" style="background-color: #009ac4; border: none;"
                    :disabled="isLoading || !draft.trim()">Send</button>
            </form>
        </div>
    </div>`,

    data() {
        return {
            isOpen: false,
            isLoading: false,
            draft: '',
            errorMsg: '',
            messages: [],
            displayName: localStorage.getItem('user_name') || 'there',
            suggestions: [
                'Which drives am I eligible for?',
                'What is the status of my applications?',
                'Any deadlines coming up soon?',
                'How should I prepare for a technical interview?'
            ]
        };
    },

    methods: {
        scrollToBottom() {
            this.$nextTick(() => {
                const body = this.$refs.chatBody;
                if (body) body.scrollTop = body.scrollHeight;
            });
        },

        async send(text) {
            const message = (text ?? this.draft).trim();
            if (!message || this.isLoading) return;

            const history = this.messages.slice(-6);
            this.messages.push({ role: 'user', content: message });
            this.draft = '';
            this.errorMsg = '';
            this.isLoading = true;
            this.scrollToBottom();

            try {
                const res = await fetch('/api/student/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ message, history })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Something went wrong');
                this.messages.push({ role: 'assistant', content: data.reply });
            } catch (err) {
                this.errorMsg = err.message;
            } finally {
                this.isLoading = false;
                this.scrollToBottom();
            }
        }
    }
};

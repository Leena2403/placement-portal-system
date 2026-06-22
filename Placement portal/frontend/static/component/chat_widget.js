// frontend/static/component/chat_widget.js

const ChatWidget = {
    template: `
    <div class="chat-widget-container" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
        <button v-if="!isOpen" @click="isOpen = true" class="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; font-size: 24px; transition: transform 0.2s;">
            💬
        </button>

        <div v-if="isOpen" class="card shadow-lg border-0" style="width: 350px; height: 450px; display: flex; flex-direction: column;">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center rounded-top">
                <h6 class="mb-0 fw-bold">Placement Assistant</h6>
                <button @click="isOpen = false" class="btn-close btn-close-white btn-sm"></button>
            </div>
            
            <div class="card-body bg-light overflow-auto d-flex flex-column gap-2" style="flex-grow: 1;" id="chatBody">
                <div v-for="(msg, index) in messages" :key="index" 
                     class="p-2 rounded-3 shadow-sm"
                     :class="msg.role === 'user' ? 'bg-primary text-white align-self-end' : 'bg-white text-dark border align-self-start'"
                     style="max-width: 85%;">
                    <small style="white-space: pre-wrap;">{{ msg.text }}</small>
                </div>
            </div>

            <div class="card-footer bg-white border-top p-2">
                <div class="input-group">
                    <input type="text" v-model="userInput" @keyup.enter="sendMessage" 
                           class="form-control form-control-sm shadow-none border-secondary" placeholder="Ask a question...">
                    <button @click="sendMessage" class="btn btn-primary btn-sm fw-bold px-3" :disabled="!userInput.trim()">Send</button>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            isOpen: false,
            userInput: '',
            messages: [
                { role: 'assistant', text: 'Hello! I am your AI placement assistant. How can I help you today?' }
            ]
        };
    },
    methods: {
        async sendMessage() {
            if (!this.userInput.trim()) return;
            
            // 1. Add user message to UI
            this.messages.push({ role: 'user', text: this.userInput });
            const payload = { message: this.userInput };
            this.userInput = '';

            // Scroll down so the latest message is visible
            this.scrollToBottom();

            try {
                // 2. Call your LangChain Flask API
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Grab the token exactly how you do it in the dashboard
                        'Authentication-Token': localStorage.getItem('auth_token') 
                    },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                
                // 3. Add AI response to UI
                if (data.response) {
                    this.messages.push({ role: 'assistant', text: data.response });
                } else if (data.error) {
                    this.messages.push({ role: 'assistant', text: "Error: " + data.error });
                }
            } catch (error) {
                console.error("Chat API error:", error);
                this.messages.push({ role: 'assistant', text: "Sorry, I'm having trouble connecting to the server right now." });
            }

            this.scrollToBottom();
        },
        
        scrollToBottom() {
            this.$nextTick(() => {
                const box = document.getElementById('chatBody');
                if(box) box.scrollTop = box.scrollHeight;
            });
        }
    }
};
const Register = {
    template: `
    <div class="row justify-content-center align-items-center" style="min-height: 80vh;">
        <div class="col-md-8 col-lg-6">
            <div class="card shadow-lg border-0 p-4 p-md-5 bg-white" style="border-radius: 20px;">
                
                <div v-if="!selectedRole">
                    <h2 class="text-center mb-4 fw-bold" style="color: #4B0082;">Join the Portal</h2>
                    <p class="text-center text-muted mb-5">Select your account type to get started.</p>
                    <div class="row g-3 text-center">
                        <div class="col-6">
                            <button @click="selectRole('student')" class="btn btn-outline-primary w-100 py-4 fw-bold shadow-sm">
                                <div class="fs-2 mb-2">🎓 Student</div>
                            </button>
                        </div>
                        <div class="col-6">
                            <button @click="selectRole('company')" class="btn btn-outline-success w-100 py-4 fw-bold shadow-sm">
                                <div class="fs-2 mb-2">🏢 Company</div>
                            </button>
                        </div>
                    </div>
                </div>

                <div v-else>
                    <button @click="resetForm" class="btn btn-sm btn-link text-muted mb-3 p-0 text-decoration-none">
                        &larr; Change account type
                    </button>
                    
                    <h3 class="mb-4 fw-bold text-capitalize">Register as {{ selectedRole }}</h3>
                    
                    <form @submit.prevent="handleRegister" class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Email</label>
                            <input type="email" class="form-control" v-model="formData.email" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-semibold">Password</label>
                            <input type="password" class="form-control" v-model="formData.password" required>
                        </div>

                        <template v-if="selectedRole === 'student'">
                            <div class="col-md-12">
                                <label class="form-label fw-semibold">Full Name</label>
                                <input type="text" class="form-control" v-model="formData.name" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">Phone</label>
                                <input type="text" class="form-control" v-model="formData.phone">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">Branch</label>
                                <input type="text" class="form-control" v-model="formData.branch">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">CGPA</label>
                                <input type="number" step="0.01" class="form-control" v-model="formData.cgpa">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">Year of Study</label>
                                <input type="number" class="form-control" v-model="formData.year_of_study">
                            </div>
                        </template>

                        <template v-if="selectedRole === 'company'">
                            <div class="col-md-12">
                                <label class="form-label fw-semibold">Company Name</label>
                                <input type="text" class="form-control" v-model="formData.company_name" required>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">HR Contact</label>
                                <input type="text" class="form-control" v-model="formData.hr_contact">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label fw-semibold">Website</label>
                                <input type="url" class="form-control" v-model="formData.website">
                            </div>
                        </template>

                        <div class="col-12 mt-4">
                            <button type="submit" class="btn btn-primary btn-lg w-100 shadow-sm fw-bold">Register Now</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>`,
    data() {
        return {
            selectedRole: null,
            formData: {
                email: '',
                password: '',
                name: '', // Student
                phone: '',
                cgpa: null,
                branch: '',
                year_of_study: null,
                company_name: '', // Company
                hr_contact: '',
                website: ''
            }
        }
    },
    methods: {
        selectRole(role) {
            this.selectedRole = role;
        },
        resetForm() {
            this.selectedRole = null;
        },
        async handleRegister() {
            // Determine endpoint based on selection
            const url = this.selectedRole === 'student' ? '/api/student_register' : '/api/company_register';
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.formData)
                });

                const data = await response.json();

                if (response.status === 201) {
                    alert(data.message);
                    this.$router.push('/login');
                } else {
                    alert(data.message || "Registration failed");
                }
            } catch (error) {
                console.error("Error:", error);
                alert("Server error occurred");
            }
        }
    }
};
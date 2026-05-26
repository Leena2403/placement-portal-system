const Login = {
    template: `
    <div class="row justify-content-center align-items-center" style="min-height: 80vh;">
        <div class="col-md-5 col-lg-4">
            <div class="card shadow-lg border-0" style="border-radius: 15px;">
                <div class="card-body p-5">
                    <div class="text-center mb-4">
                        <h2 class="fw-bold text-primary">Login</h2>
                        <p class="text-muted">Enter your credentials to access the portal</p>
                    </div>

                    <form @submit.prevent="handleLogin">
                        <div class="mb-3">
                            <label class="form-label fw-semibold">Email Address</label>
                            <input type="email" v-model="email" class="form-control form-control-lg" placeholder="name@example.com" required>
                        </div>
                        
                        <div class="mb-4">
                            <label class="form-label fw-semibold">Password</label>
                            <input type="password" v-model="password" class="form-control form-control-lg" placeholder="••••••••" required>
                        </div>

                        <div class="d-grid gap-2">
                            <button type="submit" class="btn btn-primary btn-lg shadow-sm">Sign In</button>
                        </div>
                    </form>

                    <div class="mt-4 text-center">
                        <span class="text-muted">Don't have an account? </span>
                        <router-link to="/register" class="text-decoration-none fw-bold">Sign Up</router-link>
                    </div>
                </div>
            </div>
            
            <div class="text-center mt-4">
                <small class="text-muted">Placement Portal System &copy; 2026</small>
            </div>
        </div>
    </div>`,
    data() {
        return {
            email: '',
            password: ''
        }
    },
    methods: {
        async handleLogin() {
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: this.email,
                        password: this.password
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    localStorage.setItem('auth_token', data.user_details.auth_token);
                    localStorage.setItem('user_name', data.user_details.name);

                    const userName = data.user_details.name || data.user_details.email.split('@')[0];
                    localStorage.setItem('user_name', userName);

                    const role = data.user_details.roles[0];
                    localStorage.setItem('user_role', role);
                    if (role === 'student') {
                        this.$router.push('/student-dashboard');
                    } else if (role === 'company') {
                        this.$router.push('/company-dashboard');
                    } else if (role === 'admin') {
                        this.$router.push('/admin-dashboard');
                    }
                } else {
                    alert(data.message || "Invalid credentials");
                }
            } catch (error) {
                console.error("Login Error:", error);
                alert("Could not connect to the server.");
            }
        }
    }
};
const routes = [
    { path: '/', component: Home },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/student-dashboard', component: StudentDashboard, meta: { hideNavbar: true } },
    { path: '/company-dashboard', component: CompanyDashboard, meta: { hideNavbar: true } },

    { path: '/admin-dashboard', component: AdminDashboard, meta: { requiresAuth: true, role: 'admin', hideNavbar: true } }
];
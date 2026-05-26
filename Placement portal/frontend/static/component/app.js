// frontend/static/component/app.js
const { createApp } = Vue;

//  Define the router FIRST using the routes from route.js
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes: routes // 'routes' comes from route.js
});

const app = createApp({
    data() {
        return {
            isLoggedIn: !!localStorage.getItem('auth_token')
        }
    },
    methods: {
        checkLogin() {
            this.isLoggedIn = !!localStorage.getItem('auth_token');
        }
    },
    watch: {
        '$route'() {
            this.checkLogin();
        }
    }
});

// Add the router to the app
app.use(router);

// Mount the app
app.mount('#app');
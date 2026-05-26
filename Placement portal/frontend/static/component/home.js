// frontend/static/component/home.js
const Home = {
    template: `
    <div class="row align-items-center mt-5">
        <div class="col-md-7">
            <h1 class="display-1 fw-bold text-indigo">
                Placement <br> Portal System
            </h1>
            <p class="h4 text-muted">- designed for MAD II</p>
            <div class="mt-4">
                <router-link to="/login" class="btn btn-lg btn-primary px-5">Get Started</router-link>
            </div>
        </div>
        <div class="col-md-5">
            <img src="/static/img/image.jpg" alt="Home Image" class="img-fluid rounded shadow">
        </div>
    </div>`
};
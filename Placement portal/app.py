import os
from flask import Flask, render_template
from flask_security import utils, Security
from backend.controllers.database import db
from backend.controllers.config import Config
from backend.controllers.user_datastore import user_datastore, cache, mail
from backend.controllers.routes import initialize_routes
from flask_cors import CORS
from celery import Celery

# Resolves the absolute path of the current directory for reliable file referencing.
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Configures and returns a Celery instance tied to the Flask application context.
def make_celery(app):
    celery = Celery(
        app.import_name,
        broker=Config.broker_url,
        backend=Config.result_backend
    )

    # Updates Celery configuration with Redis settings and connection retry logic.
    celery.conf.update(
        broker_url=Config.broker_url,
        result_backend=Config.result_backend,
        task_ignore_result=False,
        timezone="UTC",
        broker_connection_retry_on_startup=True
    )

    # Custom task class ensuring background jobs run within the Flask app context.
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    # Assigns the context-aware task class and scans the controllers for shared tasks.
    celery.Task = ContextTask
    celery.autodiscover_tasks(['backend.controllers'])

    return celery

# Factory function to initialize the Flask application and its various extensions.
def create_app():
    app = Flask(
        __name__,
        template_folder="frontend/templates",
        static_folder="frontend/static",
        static_url_path="/static"
    )

    # Loads configuration settings and registers all API endpoints from the routes module.
    app.config.from_object(Config)
    initialize_routes(app)

    # Links the SQLAlchemy database, Mail, Celery, and Security extensions to the app.
    db.init_app(app)
    mail.init_app(app)
    app.celery = make_celery(app)
    security = Security(app, user_datastore)

    # Initializes the Redis-based caching system for performance optimization.
    cache.init_app(app, config={
        'CACHE_TYPE': 'RedisCache',
        'CACHE_REDIS_HOST': 'localhost',
        'CACHE_REDIS_PORT': 6379,
    })

    # Executes database setup and initial data seeding within the application context.
    with app.app_context():
        db.create_all()

        # Defines the default roles (admin, student, company) required for access control.
        admin_role = user_datastore.find_or_create_role(name='admin', description='Institute Placement Admin')
        user_datastore.find_or_create_role(name='student', description='Student User')
        user_datastore.find_or_create_role(name='company', description='Company User')

        # Creates the master administrator account if it does not already exist.
        if not user_datastore.find_user(email='admin@gmail.com'):
            user_datastore.create_user(
                email='admin@gmail.com',
                password=utils.hash_password('admin123'),
                roles=[admin_role]
            )

        # Persists the default notification hour into the settings table if missing.
        from backend.controllers.models import Settings
        if not Settings.get('reminder_hour'):
            Settings.set('reminder_hour', '8')

        db.session.commit()

    return app

# Instantiates the app, triggers Celery, and enables Cross-Origin Resource Sharing.
app = create_app()
celery_app = app.celery
celery_app.set_default()   
CORS(app)

from celery.schedules import crontab

# Configures the automated execution schedule for monthly reports and daily reminders.
celery_app.conf.beat_schedule = {
    # Schedules the monthly summary report to run on the 1st at 9:00 AM.
    'execute-monthly-report': {
        'task': 'send_monthly_report',
        'schedule': crontab(day_of_month=1, hour=9, minute=0),
    },

    # Schedules an hourly check to see if it is time to send deadline reminders.
    'daily-deadline-reminders': {
        'task': 'send_daily_reminders',
        'schedule': crontab(minute=0),   
    },
}

# Catch-all route to serve the Single Page Application index for any URL path.
@app.route("/")
@app.route("/<path:path>")
def index(path=None):
    return render_template("index.html")

# Entry point to run the Flask development server when the script is executed.
if __name__ == "__main__":
    app.run(debug=True)
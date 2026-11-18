import os
from dotenv import load_dotenv

load_dotenv()   # reads optional settings (mail, API keys) from a .env file


class Config:
    # Needed for session encryption and connecting the app to the SQLite database file.
    SECRET_KEY = 'mysecretkeyhere'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///./site.db'

    # Security hashing and tracking configurations.
    # Needed to securely store passwords using PBKDF2 and disable session tracking for a leaner API.
    SECURITY_PASSWORD_SALT = 'yourpasswordsalthere'
    SECURITY_PASSWORD_HASH = "pbkdf2_sha512"
    SECURITY_TRACKABLE = False 

    # API Token authentication settings.
    # Needed to enable header-based login (via Authentication-Token) instead of using browser cookies.
    SECURITY_TOKEN_AUTHENTICATION_HEADER = "Authentication-Token"
    SECURITY_TOKEN_AUTHENTICATION_ENABLED = True   
    SECURITY_REDIRECT_BEHAVIOR = "none"
    SECURITY_UNAUTHORIZED_VIEW = None              
    SECURITY_REGISTERABLE = False
    SECURITY_SEND_REGISTER_EMAIL = False
    SECURITY_URL_PREFIX = "/api"   
    SECURITY_CONFIRMABLE = False 

    # Celery and Redis task queue settings.
    # Needed to manage asynchronous background jobs and schedule recurring tasks like reminders.
    broker_url = "redis://localhost:6379/0"
    result_backend = "redis://localhost:6379/0"

    task_ignore_result = False
    timezone = "Asia/Kolkata"
    
    # SMTP Mail Server configurations.
    # Default: Mailpit, a local test inbox (run `mailpit`, view mail at http://localhost:8025).
    # No password is needed and no email ever leaves your computer.
    # To send real email instead, set the MAIL_* variables in a .env file (see .env.example).
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'localhost')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 1025))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'false').lower() == 'true'
    MAIL_USE_SSL = os.environ.get('MAIL_USE_SSL', 'false').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = ('Placement Portal', os.environ.get('MAIL_SENDER', 'noreply@placementportal.local'))

    # python3 -m celery -A app.celery_app worker --loglevel=info --pool=solo
    # python3 -m celery -A app.celery_app beat --loglevel=info 

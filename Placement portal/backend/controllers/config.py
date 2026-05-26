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
    # Needed to allow the system to send automated emails (e.g., placement alerts) via Gmail.
    MAIL_SERVER = 'smtp.gmail.com'
    MAIL_PORT = 465
    MAIL_USE_TLS = False
    MAIL_USERNAME = 'leenagoyal2403@gmail.com'
    MAIL_PASSWORD = 'brsehjzzxdquzumq' # Note: Should ideally be an App Password
    MAIL_DEFAULT_SENDER = ('Placement Portal', 'leenagoyal2403@gmail.com')
    MAIL_USE_SSL = True

    # python3 -m celery -A app.celery_app worker --loglevel=info --pool=solo
    # python3 -m celery -A app.celery_app beat --loglevel=info 

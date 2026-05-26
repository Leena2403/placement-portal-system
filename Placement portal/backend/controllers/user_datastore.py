# to prevent circular error

from flask_security import SQLAlchemyUserDatastore
from backend.controllers.models import User, Role
from backend.controllers.database import db

user_datastore = SQLAlchemyUserDatastore(db, User, Role)
from flask_caching import Cache
from flask_mail import Mail

cache = Cache()
mail = Mail()
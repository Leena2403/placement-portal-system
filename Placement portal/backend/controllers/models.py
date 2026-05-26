from backend.controllers.database import db
from flask_security import UserMixin, RoleMixin
from datetime import datetime
import uuid

# Link table for User-Role associations.
# Needed to support many-to-many relationships where a user can have multiple roles.
roles_users = db.Table(
    'roles_users',
    db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
    db.Column('role_id', db.Integer(), db.ForeignKey('role.id'))
)

class Role(db.Model, RoleMixin):
    # Defines user permissions level (e.g., admin, student).
    # Needed to restrict access to specific API endpoints based on user type.
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))


class User(db.Model, UserMixin):
    # Core identity model for authentication.
    # Needed to store credentials and Flask-Security's unique identifiers for session/token management.
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    active = db.Column(db.Boolean(), default=True)
    fs_uniquifier = db.Column(db.String(255), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    fs_token_uniquifier = db.Column(db.String(255), unique=True, nullable=True)
    roles = db.relationship('Role', secondary=roles_users, backref=db.backref('users', lazy='dynamic'))


class StudentProfile(db.Model):
    # Stores personal and academic details for students.
    # Needed to maintain student-specific data without cluttering the core User table.
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('student_profile', uselist=False))
    name = db.Column(db.String(150))
    phone = db.Column(db.String(20))
    cgpa = db.Column(db.Float)
    branch = db.Column(db.String(100))
    year_of_study = db.Column(db.Integer)
    resume_url = db.Column(db.String(500))
    is_blacklisted = db.Column(db.Boolean, default=False)


class CompanyProfile(db.Model):
    # Stores business details and verification status for recruiters.
    # Needed to manage company identities and the administrative approval workflow.
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship('User', backref='company_profile')
    company_name = db.Column(db.String(200), nullable=False)
    hr_contact = db.Column(db.String(100))
    website = db.Column(db.String(255))
    approval_status = db.Column(db.String(50), default='Pending')
    is_blacklisted = db.Column(db.Boolean, default=False)


class PlacementDrive(db.Model):
    # Represents a specific recruitment event posted by a company.
    # Needed to track job descriptions, eligibility criteria, and deadlines for applications.
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('company_profile.id'), nullable=False)
    company = db.relationship('CompanyProfile', backref='drives')
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    min_cgpa = db.Column(db.Float)
    eligible_branch = db.Column(db.String(100))
    eligible_year = db.Column(db.Integer)
    application_deadline = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='Pending')
    created_at = db.Column(db.DateTime)


class Application(db.Model):
    # Tracks student participation in specific placement drives.
    # Needed to manage the status of a student's candidacy for a particular job.
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('student_profile.id'), nullable=False)
    drive_id = db.Column(db.Integer, db.ForeignKey('placement_drive.id'), nullable=False)
    student = db.relationship('StudentProfile', backref='applications')
    drive = db.relationship('PlacementDrive', backref='applications')
    applied_at = db.Column(db.DateTime)
    status = db.Column(db.String(50), default='Applied')
    __table_args__ = (
        db.UniqueConstraint('student_id', 'drive_id', name='unique_application'),
    )


class Notification(db.Model):
    # Stores system alerts for specific users.
    # Needed to keep users updated on application changes or system announcements.
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    user = db.relationship('User', backref='notifications')
    message = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)


class Settings(db.Model):
    # Persists global application configuration in the database.
    # Needed to allow admins to modify system behavior (like reminder times) without a code restart.
    __tablename__ = 'settings'
    key   = db.Column(db.String(100), primary_key=True)
    value = db.Column(db.String(500), nullable=False)

    @staticmethod
    def get(key, default=None):
        row = Settings.query.get(key)
        return row.value if row else default

    @staticmethod
    def set(key, value):
        row = Settings.query.get(key)
        if row:
            row.value = str(value)
        else:
            db.session.add(Settings(key=key, value=str(value)))
        db.session.commit()
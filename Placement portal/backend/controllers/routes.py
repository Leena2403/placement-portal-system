from flask_restful import Api
from backend.controllers.crud_apis import *
from backend.controllers.authentication_apis import (
    LoginAPI,
    LogoutAPI,
    StudentRegisterAPI,
    CompanyRegisterAPI
)

def initialize_routes(app):
    # Initializes the Flask-Restful API with a standard '/api' prefix.
    # Needed to centralize all URL endpoints and ensure consistent routing across the application.
    api = Api(app, prefix="/api")

    # Core Profile Management
    # Handles basic CRUD operations for student and company profile data.
    api.add_resource(StudentCrudAPI, '/students', '/students/<int:student_id>')
    api.add_resource(CompanyCrudAPI, '/companies', '/companies/<int:company_id>')

    # Authentication & Registration
    # Manages user entry, exit, and new account creation for different roles.
    api.add_resource(LoginAPI, '/login')
    api.add_resource(LogoutAPI, '/logout')
    api.add_resource(StudentRegisterAPI, '/student_register')
    api.add_resource(CompanyRegisterAPI, '/company_register')

    # Placement Drive Management
    # Handles the creation, visibility, and administrative approval of recruitment drives.
    api.add_resource(PlacementDriveAPI, '/company/drives')
    api.add_resource(PlacementDriveListAPI, '/drives')
    api.add_resource(DriveApprovalAPI, '/drives/<int:drive_id>/status')
    api.add_resource(PlacementDriveUpdateAPI, '/drives/<int:drive_id>/update')

    # Application Workflow
    # Allows students to apply to drives and enables admins/companies to track application statuses.
    api.add_resource(ApplyToDriveAPI, '/drives/<int:drive_id>/apply')
    api.add_resource(StudentApplicationsAPI, '/student/my-applications')
    api.add_resource(AdminApplicationsAPI, '/admin/applications')
    api.add_resource(DriveApplicantsAPI, '/drives/<int:drive_id>/applicants')
    api.add_resource(ApplicationStatusAPI, '/applications/<int:app_id>/status')

    # Communications & Notifications
    # Facilitates messaging between roles and tracks read/unread status of alerts.
    api.add_resource(AdminNotificationsAPI, '/admin/notifications')
    api.add_resource(ContactAdminAPI, '/contact_admin')
    api.add_resource(AdminNotifyCompanyAPI, '/admin/notify_company')
    api.add_resource(AdminNotifyStudentAPI, '/admin/notify_student')
    api.add_resource(CompanyNotificationsAPI, '/company/notifications')
    api.add_resource(MarkNotificationsReadAPI, '/notifications/read')

    # Analytics & Reporting
    # Provides dashboard statistics and triggers CSV/PDF report generation.
    api.add_resource(AdminStatsAPI, '/admin/stats')
    api.add_resource(StudentStatsAPI, '/student/stats')
    api.add_resource(ExportReportAPI, '/admin/export-report')
    api.add_resource(StudentExportAPI, '/student/export-trigger')
    api.add_resource(InstantReportAPI, '/student/report/download')

    # System Tasks & Reminders
    # Manages admin-controlled background tasks and scheduling via Celery.
    api.add_resource(ReminderSettingsAPI, '/admin/reminder-settings')
    api.add_resource(TriggerRemindersAPI, '/admin/trigger-reminders')
    api.add_resource(TriggerMonthlyReportAPI, '/admin/trigger-monthly-report')
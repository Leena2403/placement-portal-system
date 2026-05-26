from flask import request
from flask_security import auth_token_required, roles_required, current_user
from backend.controllers.database import db
from backend.controllers.models import *

from datetime import datetime
from flask_security import current_user
from flask_restful import Api, Resource

import csv
from io import StringIO
from flask import Response, make_response
from backend.controllers.models import PlacementDrive, Application
from backend.controllers.tasks import export_student_applications
from backend.controllers.user_datastore import cache



class StudentCrudAPI(Resource):
    @auth_token_required
    def get(self, student_id=None):
        if student_id is None:
            # ADMIN viewing the list of all students
            if current_user.has_role('admin'):
                students = StudentProfile.query.all()
                response = []
                for stud in students:
                    response.append({
                        'id': stud.id,
                        'name': stud.name,
                        'email': stud.user.email,
                        'cgpa': stud.cgpa,
                        'branch': stud.branch,
                        'year_of_study': stud.year_of_study,
                        'is_blacklisted': stud.is_blacklisted
                    })
                cache.set('admin_all_students', response, timeout=300)  # 5 minutes
                return response, 200

            # STUDENT fetching their own profile for the dashboard/modal
            elif current_user.has_role('student'):
                stud = StudentProfile.query.filter_by(user_id=current_user.id).first()
                if not stud:
                    return {'message': 'Student profile not found'}, 404
                
                return {
                    'id': stud.id,
                    'name': stud.name,
                    'email': stud.user.email,
                    'phone': stud.phone,
                    'cgpa': stud.cgpa,
                    'branch': stud.branch,
                    'year_of_study': stud.year_of_study,
                    'resume_url': stud.resume_url,
                    'is_blacklisted': stud.is_blacklisted
                }, 200
            
            return {'message': 'Unauthorized access'}, 403

        stud = StudentProfile.query.get(student_id)
        if not stud:
            return {'message': 'Student not found'}, 404

        # Admin can see any ID; Students can ONLY see their own ID
        if not current_user.has_role('admin') and stud.user_id != current_user.id:
            return {'message': 'Unauthorized'}, 403

        return {
            'id': stud.id,
            'name': stud.name,
            'email': stud.user.email,
            'phone': stud.phone,
            'cgpa': stud.cgpa,
            'branch': stud.branch,
            'year_of_study': stud.year_of_study,
            'resume_url': stud.resume_url,
            'is_blacklisted': stud.is_blacklisted
        }, 200

    @auth_token_required
    def put(self, student_id):
        student = StudentProfile.query.get(student_id)

        if not student:
            return {'message': 'Student not found'}, 404

        data = request.get_json()
        if not data:
            return {'message': 'No input provided'}, 400

        # Allow Admin to change is_blacklisted status
        if current_user.has_role('admin') and data.get('action') == 'whitelist':
            student.is_blacklisted = False
            db.session.commit()
            cache.delete('admin_all_students') 
            cache.delete('admin_stats')
            return {'message': 'Student whitelisted successfully'}, 200


        # If not an admin whitelisting, ensure student is only editing themselves
        if student.user_id != current_user.id:
            return {'message': 'Unauthorized'}, 403

        # Update StudentProfile fields
        student.name = data.get('name', student.name)
        student.phone = data.get('phone', student.phone)
        student.cgpa = data.get('cgpa', student.cgpa)
        student.branch = data.get('branch', student.branch)
        student.year_of_study = data.get('year_of_study', student.year_of_study)
        student.resume_url = data.get('resume_url', student.resume_url)

        # Update User email (linked via student.user relationship)
        new_email = data.get('email')
        if new_email and new_email != student.user.email:
            # Check if email is already taken by someone else
            existing_user = User.query.filter_by(email=new_email).first()
            if existing_user:
                return {'message': 'Email already in use'}, 409
            student.user.email = new_email

        db.session.commit()
        return {
            'message': 'Profile updated successfully', 
            'name': student.name
        }, 200


    # admin can blacklist a student
    @auth_token_required
    @roles_required('admin')
    def delete(self, student_id):

        student = StudentProfile.query.get(student_id)

        if not student:
            return {'message': 'Student not found'}, 404

        student.is_blacklisted = True
        db.session.commit()
        cache.delete('admin_all_students')
        cache.delete('admin_stats')

        return {'message': 'Student blacklisted successfully'}, 200
    
class StudentApplicationsAPI(Resource):
    @auth_token_required
    @roles_required('student')
    def get(self):
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        # This line fetches ALL applications (Applied, Shortlisted, Rejected, etc.)
        apps = Application.query.filter_by(student_id=student.id).all()
        
        response = []
        for a in apps:
            response.append({
                "id": a.drive.id,
                "title": a.drive.title,
                "company": a.drive.company.company_name,
                "applied_at": str(a.applied_at),
                "status": a.status
            })
        return response, 200
    
from datetime import datetime

class StudentStatsAPI(Resource):
    @auth_token_required
    @roles_required('student')
    def get(self):
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {'message': 'Student profile not found'}, 404

        # Active Applications (Excluding Rejected)
        total_applied = Application.query.filter(
            Application.student_id == student.id,
            Application.status != 'Rejected'
        ).count()

        # Total Shortlisted
        total_shortlisted = Application.query.filter_by(
            student_id=student.id, 
            status='Shortlisted'
        ).count()

        # We must exclude: 
        # - Drives already applied to/interacted with
        # - Drives from blacklisted companies
        # - Drives where the deadline has passed
        interacted_drive_ids = [a.drive_id for a in Application.query.filter_by(student_id=student.id).all()]
        now = datetime.utcnow()
        
        total_new = PlacementDrive.query.join(CompanyProfile).filter(
            PlacementDrive.status == 'Approved',
            PlacementDrive.application_deadline > now,       # Must be in the future
            CompanyProfile.is_blacklisted == False,           # Company must be active
            ~PlacementDrive.id.in_(interacted_drive_ids)      # Student hasn't touched it
        ).count()

        return {
            "total_applied": total_applied,
            "total_shortlisted": total_shortlisted,
            "total_active_drives": total_new
        }, 200


#################################### Company Crud ##################################

class CompanyCrudAPI(Resource):
    @auth_token_required
    def get(self, company_id=None):
        # Specific Company Lookup (Admin/Specific queries)
        if company_id:
            c = CompanyProfile.query.get(company_id)
            if not c: return {'message': 'Not found'}, 404
            return {
                'id': c.id, 
                'company_name': c.company_name, 
                'approval_status': c.approval_status,
                'is_blacklisted': bool(c.is_blacklisted)
            }, 200

        # ADMIN: Return ALL
        if current_user.has_role('admin'):
            companies = CompanyProfile.query.all()
            result = [{'id': c.id, 'company_name': c.company_name, 'is_blacklisted': bool(c.is_blacklisted), 'approval_status': c.approval_status} for c in companies]
            cache.set('admin_all_companies', result, timeout=300)
            return result, 200

        # STUDENT: Return Approved + Blacklisted (for visibility)
        elif current_user.has_role('student'):
            # Fetch companies that are approved OR blacklisted
            companies = CompanyProfile.query.filter(
                (CompanyProfile.approval_status == 'Approved') | 
                (CompanyProfile.is_blacklisted == True)
            ).all()
            
            return [{
                'id': c.id, 
                'company_name': c.company_name, 
                'approval_status': c.approval_status,
                'is_blacklisted': bool(c.is_blacklisted)
            } for c in companies], 200

        # COMPANY: Return Own Profile
        elif current_user.has_role('company'):
            c = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            if not c: return {'message': 'Profile not found'}, 404
            return {
                'id': c.id,
                'company_name': c.company_name,
                'is_blacklisted': bool(c.is_blacklisted),
                'approval_status': c.approval_status
            }, 200

        return {'message': 'Unauthorized access'}, 403


    # COMPANY - Update Own Profile

    @auth_token_required
    @roles_required('admin')
    def put(self, company_id):
        """Admin uses this to Approve or Whitelist (de-blacklist) a company"""
        company = CompanyProfile.query.get(company_id)
        if not company:
            return {'message': 'Company not found'}, 404

        data = request.get_json()
        action = data.get('action')

        if action == 'approve':
            company.approval_status = "Approved"
            drives = PlacementDrive.query.filter_by(company_id=company.id, status="Pending").all()
            for d in drives:
                d.status = "Approved"
        
        elif action == 'whitelist':
            company.is_blacklisted = False
            company.approval_status = "Approved" 
            
            # Restore drives that were hidden during blacklisting
            drives = PlacementDrive.query.filter_by(company_id=company.id, status="Blacklisted").all()
            for d in drives:
                d.status = "Approved"

        db.session.commit()
        cache.delete('admin_all_companies') 
        cache.delete('admin_stats')
        return {'message': f'Company {action}d successfully'}, 200

    @auth_token_required
    @roles_required('admin')
    def delete(self, company_id):
        """Admin uses this to Blacklist a company"""
        company = CompanyProfile.query.get(company_id)
        if not company:
            return {'message': 'Company not found'}, 404

        company.is_blacklisted = True
        company.approval_status = "Rejected"
        # Cascade: Set all drives to Blacklisted so students can't see them
        drives = PlacementDrive.query.filter_by(company_id=company.id).all()
        for d in drives:
            d.status = "Blacklisted"
            
        db.session.commit()
        cache.delete('admin_all_companies')  
        cache.delete('admin_stats')
        cache.clear()
        return {'message': 'Company blacklisted successfully'}, 200

# Admin approving company

    @auth_token_required
    @roles_required('admin')
    def approve_company(company_id):

        company = CompanyProfile.query.get(company_id)

        if not company:
            return {'message': 'Company not found'}, 404

        company.approval_status = "Approved"
        db.session.commit()

        return {'message': 'Company approved successfully'}, 200

# Admin rejecting company

    @auth_token_required
    @roles_required('admin')
    def reject_company(company_id):

        company = CompanyProfile.query.get(company_id)

        if not company:
            return {'message': 'Company not found'}, 404

        company.approval_status = "Rejected"
        db.session.commit()

        return {'message': 'Company rejected successfully'}, 200

# API for Company to see who applied to a specific drive
class DriveApplicantsAPI(Resource):
    @auth_token_required
    @roles_required('company')
    def get(self, drive_id):
        # Security: Ensure this drive belongs to the logged-in company
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        drive = PlacementDrive.query.get(drive_id)
        
        if not drive or drive.company_id != company.id:
            return {'message': 'Drive not found or unauthorized'}, 404

        # Fetch applications for this drive
        apps = Application.query.filter_by(drive_id=drive_id).all()
        
        response = []
        for a in apps:
            response.append({
                "id": a.id,
                "student_name": a.student.name,
                "email": a.student.user.email,
                "cgpa": a.student.cgpa,
                "branch": a.student.branch,
                "resume_url": a.student.resume_url,
                "status": a.status  # Applied, Shortlisted, etc.
            })
        return response, 200

# API for Company to update the status of a student's application
from backend.controllers.tasks import send_status_update_email

class ApplicationStatusAPI(Resource):
    @auth_token_required
    @roles_required('company')
    def put(self, app_id):
        data = request.get_json()
        new_status = data.get('status')
        notif_msg = data.get('notification_msg')

        application = Application.query.get(app_id)
        if not application:
            return {'message': 'Application not found'}, 404

        #Update Database Objects
        application.status = new_status
        if notif_msg:
            new_notif = Notification(
                user_id=application.student.user_id,
                message=notif_msg,
                is_read=False
            )
            db.session.add(new_notif)
        
        # COMMIT TO DB FIRST (So data isn't lost if Redis is down)
        try:
            db.session.commit()
            cache.clear()
        except Exception as e:
            db.session.rollback()
            return {'message': f'Database error: {str(e)}'}, 500

        # TRIGGER CELERY TASK (Wrapped in try/except to prevent 500 error)

        if notif_msg:
            try:
                #  import here to avoid circular dependency crashes
                from backend.controllers.tasks import send_status_update_email
                
                # Trigger the task
                send_status_update_email.delay(
                    application.student.user.email,
                    application.drive.title,
                    new_status,
                    notif_msg
                )
                print("CELERY DEBUG: Task successfully sent to Redis")
            except Exception as e:
                print(f"REDIS ERROR: {e}")

        return {'message': 'Status updated and email queued successfully.'}, 200

class PlacementDriveAPI(Resource):

    @auth_token_required
    @roles_required('company')
    def post(self):

        data = request.get_json()

        if not data:
            return {'message': 'Request body required'}, 400

        #  company profile of logged-in user
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()

        if not company:
            return {'message': 'Company profile not found'}, 404
        
        if company.approval_status != "Approved":
            return {
                'message': 'Your account is pending approval. You cannot create drives yet.'
            }, 403

        # Validate required fields
        if not data.get("title"):
            return {'message': 'Title is required'}, 400
        
        deadline_str = data.get("application_deadline")

        try:
            deadline = datetime.fromisoformat(deadline_str) if deadline_str else None
        except ValueError:
            return {'message': 'Invalid datetime format. Use ISO format'}, 400

        # Creating drive
        drive = PlacementDrive(
                company_id=company.id,
                title=data.get("title"),
                description=data.get("description"),
                min_cgpa=data.get("min_cgpa"),
                eligible_branch=data.get("eligible_branch"),
                eligible_year=data.get("eligible_year"),
                application_deadline=deadline, 
                status="Pending",
                created_at=datetime.utcnow()
            )

        db.session.add(drive)
        db.session.commit()
        cache.delete('admin_stats')
        cache.clear()

        return {
            "message": "Placement drive created. Awaiting admin approval.",
            "drive_id": drive.id
        }, 201
    

# API for Company to view their own notifications
class CompanyNotificationsAPI(Resource):
    @auth_token_required
    def get(self):
        # Ensure user_id matches the student's user ID
        notes = Notification.query.filter_by(user_id=current_user.id).all()
        return [{
            "id": n.id,
            "message": n.message, 
            "created_at": str(n.created_at),
            "is_read": n.is_read
        } for n in notes], 200
    

class PlacementDriveListAPI(Resource):
    @auth_token_required
    def get(self):
        now = datetime.now()

        # Cache key is per user so each user sees only their permitted drives
        cache_key = f'drives_user_{current_user.id}'
        cached = cache.get(cache_key)
        if cached:
            return cached, 200

        # ADMIN → see all drives
        if current_user.has_role('admin'):
            drives = PlacementDrive.query.all()

        # COMPANY → see ONLY their own drives
        elif current_user.has_role('company'):
            company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
            if not company:
                return {'message': 'Company profile not found'}, 404
            drives = PlacementDrive.query.filter_by(company_id=company.id).all()

        # STUDENT → see only approved, non-expired drives from active companies
        elif current_user.has_role('student'):
            drives = PlacementDrive.query.join(CompanyProfile).filter(
                PlacementDrive.status == "Approved",
                PlacementDrive.application_deadline > now,
                CompanyProfile.is_blacklisted == False
            ).all()
        else:
            return {'message': 'Unauthorized role'}, 403

        response = []
        for d in drives:
            applicant_count = Application.query.filter_by(drive_id=d.id).count()
            response.append({
                "id": d.id,
                "title": d.title,
                "company": d.company.company_name,
                "description": d.description,
                "min_cgpa": d.min_cgpa,
                "eligible_branch": d.eligible_branch,
                "eligible_year": d.eligible_year,
                "deadline": d.application_deadline.isoformat() if d.application_deadline else None,
                "status": d.status,
                "applicant_count": applicant_count
            })

        cache.set(cache_key, response, timeout=120)  # cache for 2 minutes
        return response, 200

class DriveApprovalAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def put(self, drive_id):
        data = request.get_json()
        if not data:
            return {'message': 'No data provided'}, 400
            
        action = data.get("action")
        drive = PlacementDrive.query.get(drive_id)
        
        if not drive:
            return {'message': 'Drive not found'}, 404

        if action == "approve":
            drive.status = "Approved"
        elif action == "reject":
            drive.status = "Rejected"
        elif action == "blacklist":
            # Admin blacklists a drive — hidden from students immediately
            drive.status = "Blacklisted"
        elif action == "restore":
            # Check if the parent company is blacklisted or rejected
            if drive.company.is_blacklisted or drive.company.approval_status != "Approved":
                return {
                    'message': f'Operation denied. Cannot restore drive for "{drive.company.company_name}" because the company is blacklisted or not approved.'
                }, 403
            
            drive.status = "Approved"
        else:
            return {'message': f'Invalid action: {action}'}, 400

        try:
            db.session.commit()
            # Clear cache so the dashboard stats and drive lists update for all users
            cache.clear()
            return {'message': f'Drive {action}d successfully'}, 200
        except Exception as e:
            db.session.rollback()
            return {'message': f'Database error: {str(e)}'}, 500
    
    
class ApplyToDriveAPI(Resource):

    @auth_token_required
    @roles_required('student')
    def post(self, drive_id):
        # Get student profile
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {'message': 'Student profile not found'}, 404

        # Get drive
        drive = PlacementDrive.query.get(drive_id)
        if not drive:
            return {'message': 'Drive not found'}, 404

        # Check drive status (Must be approved by admin)
        if drive.status != "Approved":
            return {'message': 'Drive not open for applications'}, 400

        # Check deadline (STRICT CHECK)
        if drive.application_deadline and datetime.utcnow() > drive.application_deadline:
            return {'message': 'Application deadline has passed'}, 400

        # Eligibility validation (CGPA, branch, year)
        if drive.min_cgpa and student.cgpa is not None and student.cgpa < drive.min_cgpa:
            return {'message': f'Ineligible: minimum CGPA required is {drive.min_cgpa}'}, 403

        if drive.eligible_branch and student.branch:
            allowed = [b.strip().lower() for b in drive.eligible_branch.split(',')]
            if student.branch.strip().lower() not in allowed:
                return {'message': f'Ineligible: drive is open to {drive.eligible_branch} only'}, 403

        if drive.eligible_year and student.year_of_study and student.year_of_study != drive.eligible_year:
            return {'message': f'Ineligible: drive is open to year {drive.eligible_year} students only'}, 403

        # Prevent duplicate application
        existing = Application.query.filter_by(
            student_id=student.id,
            drive_id=drive.id
        ).first()

        if existing:
            return {'message': 'You have already applied to this drive'}, 409

        application = Application(
            student_id=student.id,
            drive_id=drive.id,
            applied_at=datetime.utcnow(),
            status="Applied"
        )

        db.session.add(application)
        db.session.commit()
        # Applicant count changed — invalidate this student's drives view and stats
        cache.delete(f'drives_user_{current_user.id}')
        cache.delete('admin_stats')

        return {
            "message": "Applied successfully",
            "application_id": application.id
        }, 201
    

class PlacementDriveUpdateAPI(Resource):
    @auth_token_required
    @roles_required('company')
    def put(self, drive_id):
        data = request.get_json()
        drive = PlacementDrive.query.get(drive_id)

        if not drive:
            return {'message': 'Drive not found'}, 404
        
        # Security: Ensure this company owns the drive
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        if drive.company_id != company.id:
            return {'message': 'Unauthorized'}, 403

        # Update fields
        drive.title = data.get('title', drive.title)
        drive.description = data.get('description', drive.description)
        drive.min_cgpa = data.get('min_cgpa', drive.min_cgpa)
        drive.eligible_branch = data.get('eligible_branch', drive.eligible_branch)
        drive.eligible_year = data.get('eligible_year', drive.eligible_year)
        
        # Parse deadline if provided
        if data.get('deadline'):
            drive.application_deadline = datetime.fromisoformat(data.get('deadline'))

        db.session.commit()
        # Drive details changed — invalidate all drives caches
        cache.clear()

        return {'message': 'Drive updated successfully'}, 200


class AdminStatsAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def get(self):
        # Cache key is role-agnostic — stats are the same for all admins
        cache_key = 'admin_stats'
        cached = cache.get(cache_key)
        if cached:
            return cached, 200

        try:
            now = datetime.utcnow()

            total_students = StudentProfile.query.filter_by(is_blacklisted=False).count()
            total_companies = CompanyProfile.query.filter_by(is_blacklisted=False).count()
            live_drives_count = PlacementDrive.query.join(CompanyProfile).filter(
                PlacementDrive.status.in_(['Approved', 'Pending']),
                CompanyProfile.is_blacklisted == False
            ).count()

            result = {
                "total_students": total_students,
                "total_companies": total_companies,
                "total_drives": live_drives_count
            }
            cache.set(cache_key, result, timeout=300)  # cache for 5 minutes
            return result, 200
        except Exception as e:
            return {"message": "Error fetching dashboard stats", "error": str(e)}, 500


# admin can fetch details about student applied drives

class AdminApplicationsAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def get(self):
        # Fetch all applications from the database
        apps = Application.query.all()
        
        response = []
        for a in apps:
            response.append({
                "id": a.id,
                "student_id": a.student_id,
                "student_name": a.student.name,
                "drive_title": a.drive.title,
                "company_name": a.drive.company.company_name,
                "applied_at": a.applied_at.strftime("%Y-%m-%d %H:%M:%S") if a.applied_at else "N/A",
                "status": a.status
            })
        return response, 200
    
# API for Blacklisted Company to message the Admin
class ContactAdminAPI(Resource):
    @auth_token_required
    # Remove @roles_required('company') if it's there, or add 'student'
    def post(self):
        data = request.get_json()
        message_content = data.get('message')
        
        if not message_content:
            return {'message': 'Message content cannot be empty'}, 400

        # Find the Admin User to notify
        admin_role = Role.query.filter_by(name='admin').first()
        admin_user = admin_role.users.first() if admin_role else None

        if not admin_user:
            return {'message': 'No administrator found to receive appeal'}, 404

        #  Identify the sender (Student or Company)
        # Check for student profile first
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        company = CompanyProfile.query.filter_by(user_id=current_user.id).first()
        
        sender_info = ""
        if student:
            sender_info = f"STUDENT: {student.name}"
        elif company:
            sender_info = f"COMPANY: {company.company_name}"
        else:
            sender_info = f"USER ID: {current_user.id}"

        # 3. Create the Notification for the Admin
        new_note = Notification(
            user_id=admin_user.id,
            message=f"APPEAL FROM {sender_info}: {message_content}",
            created_at=datetime.utcnow(),
            is_read=False
        )
        
        db.session.add(new_note)
        db.session.commit()

        return {'message': 'Appeal sent successfully'}, 201

class AdminNotificationsAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def get(self):
        # This will now only show notifications where user_id == admin's ID
        # Since we stopped sending shortlists to the admin's ID above, 
        # they will disappear from here.
        notes = Notification.query.filter_by(user_id=current_user.id).order_by(Notification.created_at.desc()).all()
        return [{
            "id": n.id,
            "message": n.message,
            "created_at": n.created_at.strftime("%Y-%m-%d %H:%M"),
            "is_read": n.is_read
        } for n in notes], 200

# Resource for Admin to send messages to specific companies
class AdminNotifyCompanyAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def post(self):
        data = request.get_json()
        company_id = data.get('company_id')
        message = data.get('message')

        company = CompanyProfile.query.get(company_id)
        if not company:
            return {'message': 'Company not found'}, 404

        new_note = Notification(
            user_id=company.user_id, # Targeted at the company's user
            message=f"ADMIN NOTIFICATION: {message}",
            created_at=datetime.utcnow(),
            is_read=False
        )
        db.session.add(new_note)
        db.session.commit()
        return {'message': 'Notification sent'}, 201

class AdminNotifyStudentAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def post(self):
        data = request.get_json()
        student_id = data.get('student_id')
        message = data.get('message')

        student = StudentProfile.query.get(student_id)
        if not student:
            return {'message': 'Student not found'}, 404

        new_note = Notification(
            user_id=student.user_id,
            message=f"ADMIN NOTIFICATION: {message}",
            created_at=datetime.utcnow(),
            is_read=False
        )
        db.session.add(new_note)
        db.session.commit()
        return {'message': 'Notification sent'}, 201

class MarkNotificationsReadAPI(Resource):
    @auth_token_required
    def post(self):
        # 1. Find all unread notifications for the Admin (current_user)
        unread_notes = Notification.query.filter_by(
            user_id=current_user.id, 
            is_read=False
        ).all()
        
        # 2. Update them to True
        for note in unread_notes:
            note.is_read = True
        
        # 3. Commit to SQLite
        try:
            db.session.commit()
            return {'message': f'{len(unread_notes)} notifications marked as read'}, 200
        except Exception as e:
            db.session.rollback()
            return {'message': 'Database error'}, 500
    


class ExportReportAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def get(self):
        # Create a string buffer to hold CSV data
        output = StringIO()
        writer = csv.writer(output)
        
        # Write CSV Headers
        writer.writerow(['Drive ID', 'Company Name', 'Drive Title', 'Total Applications', 'Selected Count'])
        
        # Query all drives
        drives = PlacementDrive.query.all()
        
        for drive in drives:
            # Count total applications for this drive
            app_count = len(drive.applications)
            
            # Count applications with status 'Selected'
            selected_count = len([a for a in drive.applications if a.status == 'Selected'])
            
            # Write data row
            writer.writerow([
                drive.id, 
                drive.company.company_name, 
                drive.title, 
                app_count, 
                selected_count
            ])
        
        # Move pointer to start of the buffer
        output.seek(0)
        
        # Create a Flask response with CSV mimetype
        response = make_response(output.getvalue())
        response.headers["Content-Disposition"] = "attachment; filename=placement_report.csv"
        response.headers["Content-type"] = "text/csv"
        
        return response


class StudentExportAPI(Resource):
    @auth_token_required
    @roles_required('student')
    def post(self):
        from celery import Celery
        try:
            student = StudentProfile.query.filter_by(user_id=current_user.id).first()
            
            test_celery = Celery(broker="redis://127.0.0.1:6379/0")
            task = test_celery.send_task(
                'export_student_applications', 
                args=[student.id, current_user.email]
            )
            
            return {"message": "Export Started!", "task_id": task.id}, 202
        except Exception as e:
            return {"message": f"Deep Error: {str(e)}"}, 500
        
from flask import send_from_directory, current_app
import os
import io

class InstantReportAPI(Resource):
    @auth_token_required
    def get(self):
        # Find the student profile for the logged-in user
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        
        if not student:
            return {"message": "Student profile not found"}, 404

        # Create an in-memory "file"
        output = io.StringIO()
        writer = csv.writer(output)

        # Write your Simple History Headers
        writer.writerow(['Company Name', 'Job Role', 'Application Status', 'Date Applied'])

        #  Write the Data Rows
        for app_rec in student.applications:
            writer.writerow([
                app_rec.drive.company.company_name,
                app_rec.drive.title,
                app_rec.status,
                app_rec.applied_at.strftime("%Y-%m-%d %H:%M") if app_rec.applied_at else "N/A"
            ])

        # Prepare the response
        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={
                "Content-disposition": f"attachment; filename=history_{student.id}.csv"
            }
        )

# ── REMINDER SETTINGS API ─────────────────────────────────────────────────────
# GET  /api/admin/reminder-settings  → returns current configured hour
# PUT  /api/admin/reminder-settings  → { "hour": 9 }  (0–23)
# Only admin can access these endpoints.

class ReminderSettingsAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def get(self):
        from backend.controllers.models import Settings
        hour = Settings.get('reminder_hour', '8')
        return {
            'reminder_hour': int(hour),
            'message': f'Daily reminders are currently scheduled at {hour}:00 every day.'
        }, 200

    @auth_token_required
    @roles_required('admin')
    def put(self):
        from backend.controllers.models import Settings
        data = request.get_json()
        hour = data.get('hour')

        if hour is None or not isinstance(hour, int) or not (0 <= hour <= 23):
            return {'message': 'Invalid hour. Must be an integer between 0 and 23.'}, 400

        Settings.set('reminder_hour', hour)
        cache.clear()

        # Human-readable time label
        label = datetime.strptime(str(hour), "%H").strftime("%I:%M %p")
        return {
            'message': f'Reminder time updated to {label} daily.',
            'reminder_hour': hour
        }, 200


# ── MANUAL TRIGGER (for testing without waiting for the scheduled hour) ────────
# POST /api/admin/trigger-reminders → fires send_daily_reminders immediately

class TriggerRemindersAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def post(self):
        from backend.controllers.tasks import send_daily_reminders
        try:
            # force=True bypasses the hour check so admin can test at any time
            send_daily_reminders.apply_async(kwargs={'force': True})
            return {'message': 'Reminder task queued successfully. Check Celery logs.'}, 200
        except Exception as e:
            return {'message': f'Failed to queue task: {str(e)}'}, 500
        


class TriggerMonthlyReportAPI(Resource):
    @auth_token_required
    @roles_required('admin')
    def post(self):
        from backend.controllers.tasks import send_monthly_report
        try:
            # Triggering the Celery task immediately
            send_monthly_report.delay()
            return {'message': 'Monthly report email has been queued for admin@gmail.com.'}, 200
        except Exception as e:
            return {'message': f'Internal Error: {str(e)}'}, 500
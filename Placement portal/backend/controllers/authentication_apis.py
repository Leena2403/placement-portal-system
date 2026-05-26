from flask import request
from backend.controllers.user_datastore import user_datastore
from flask_security import utils, auth_token_required, roles_required
from backend.controllers.database import db
from backend.controllers.models import StudentProfile, CompanyProfile
from flask_restful import Resource

class LoginAPI(Resource):
    # Authenticates users and returns a session token.
    # Needed to verify credentials and identify the user's role-specific display name.
    def post(self):
        login_credentials = request.get_json()

        if not login_credentials:
            return {'message': 'Login credentials are required'}, 400
        
        email = login_credentials.get('email', None)
        password = login_credentials.get('password', None)

        if not email or not password:
            return {'message': 'Email and password required'}, 400
        
        user = user_datastore.find_user(email=email)

        if not user:
            return {'message': 'User not found'}, 404
        
        if not utils.verify_password(password, user.password):
            return {'message': 'Invalid password'}, 401
        
        # Logic to get the Name based on Role
        display_name = user.email  # Fallback to email if no profile found
        
        if user.has_role('student'):
            # Fetch from StudentProfile table
            student = StudentProfile.query.filter_by(user_id=user.id).first()
            if student:
                display_name = student.name
                
        elif user.has_role('company'):
            # Fetch from CompanyProfile table
            company = CompanyProfile.query.filter_by(user_id=user.id).first()
            if company:
                display_name = company.company_name
                
        elif user.has_role('admin'):
            display_name = "Administrator"

        auth_token = user.get_auth_token()
        utils.login_user(user) 

        return {
            'message': 'Login successful',
            'user_details': {
                'email': user.email,
                'name': display_name,  # Now returning the actual Name
                'roles': [role.name for role in user.roles],
                'auth_token': auth_token
            }
        }, 200

    
class LogoutAPI(Resource):
        # Terminates the current user session.
        # Needed to securely invalidate the authentication token and clear session data.
        @auth_token_required
        # @role_required("admin")
        def post(self):
            utils.logout_user()

            return {'message': 'Logout successful'}, 200


class StudentRegisterAPI(Resource):
    # Handles student account creation and profile setup.
    # Needed to register new students with the 'student' role and store their academic details.
    def post(self):

        data = request.get_json()

        if not data:
            return {'message': 'Registration data required'}, 400
        
        email = data.get("email")
        password = data.get("password")

        name = data.get("name")
        phone = data.get("phone")
        cgpa = data.get("cgpa")
        branch = data.get("branch")
        year_of_study = data.get("year_of_study")

        if not email or not password:
            return {'message': 'Email and password required'}, 400

        # Creating User
        new_user = user_datastore.create_user(
            email=email,
            password=utils.hash_password(password)
        )

        user_datastore.add_role_to_user(new_user, "student")
        db.session.commit()

        # create StudentProfile
        student_profile = StudentProfile(
            user_id=new_user.id,
            name=name,
            phone=phone,
            cgpa=cgpa,
            branch=branch,
            year_of_study=year_of_study
        )

        db.session.add(student_profile)
        db.session.commit()

        return {'message': 'Student registered successfully'}, 201


class CompanyRegisterAPI(Resource):
    # Registers a new company and flags it for administrative review.
    # Needed to collect corporate info and prevent unauthorized company access via a 'Pending' status.
    def post(self):
        data = request.get_json()

        if not data:
            return {'message': 'Registration data required'}, 400

        email = data.get("email")
        password = data.get("password")
        company_name = data.get("company_name")
        hr_contact = data.get("hr_contact")
        website = data.get("website")

        if not email or not password:
            return {'message': 'Email and password required'}, 400

        if user_datastore.find_user(email=email):
            return {'message': 'User already exists'}, 409

        company_role = user_datastore.find_role("company")

        user = user_datastore.create_user(
            email=email,
            password=utils.hash_password(password),
            roles=[company_role]
        )

        db.session.commit()

        # Company profile needs admin approval
        company_profile = CompanyProfile(
            user_id=user.id,
            company_name=company_name,
            hr_contact=hr_contact,
            website=website,
            approval_status="Pending"
        )

        db.session.add(company_profile)
        db.session.commit()

        return {
            "message": "Company registered. Awaiting admin approval."
        }, 201
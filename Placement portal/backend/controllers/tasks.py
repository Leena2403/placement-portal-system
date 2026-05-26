import csv
import os
import re
from datetime import date, datetime, timedelta
from celery import shared_task
from flask import render_template
from backend.controllers.user_datastore import mail, cache
from flask_mail import Message

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
DOWNLOAD_FOLDER = os.path.join(BASE_DIR, 'frontend', 'static', 'downloads')


# ── ADMIN MONTHLY REPORT ──────────────────────────────────────────────────────

@shared_task(name="send_monthly_report")
def send_monthly_report():
    from app import app
    from backend.controllers.models import PlacementDrive, Application

    with app.app_context():
        today = date.today()
        first_of_month = today.replace(day=1)

        num_drives = PlacementDrive.query.filter(PlacementDrive.created_at >= first_of_month).count()
        total_apps = Application.query.filter(Application.applied_at >= first_of_month).count()
        total_selected = Application.query.filter(
            Application.applied_at >= first_of_month,
            Application.status == 'Selected'
        ).count()

        html_content = render_template(
            'monthly_report_email.html',
            num_drives=num_drives,
            total_apps=total_apps,
            total_selected=total_selected,
            date_str=today.strftime("%B %Y")
        )

        msg = Message(
            subject=f"Monthly Placement Activity Report - {today.strftime('%B %Y')}",
            recipients=["23f1001357@ds.study.iitm.ac.in"],
            html=html_content
        )
        try:
            mail.send(msg)
            return f"Report for {today.strftime('%B %Y')} sent successfully."
        except Exception as e:
            return f"Failed to send email: {str(e)}"


# ── STUDENT ASYNC CSV EXPORT ──────────────────────────────────────────────────

@shared_task(name="export_student_applications")
def export_student_applications(student_id, user_email):
    from app import app
    from backend.controllers.models import StudentProfile

    BASE_DIR = os.path.abspath(os.path.join(app.root_path))
    target_dir = os.path.join(BASE_DIR, 'frontend', 'static', 'downloads')

    if not os.path.exists(target_dir):
        os.makedirs(target_dir)

    filename = f"applications_student_{student_id}.csv"
    filepath = os.path.join(target_dir, filename)

    with app.app_context():
        student = StudentProfile.query.get(student_id)
        if not student:
            return "Student Not Found"

        with open(filepath, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Company', 'Drive Title', 'Status', 'Applied Date'])
            for app_rec in student.applications:
                writer.writerow([
                    app_rec.drive.company.company_name,
                    app_rec.drive.title,
                    app_rec.status,
                    app_rec.applied_at.strftime("%Y-%m-%d") if app_rec.applied_at else "N/A"
                ])
        return filename


# ── DAILY DEADLINE REMINDERS ──────────────────────────────────────────────────
#
# Design: Celery Beat triggers this task every hour.
# The task reads the admin-configured reminder hour from the Settings table.
# If the current hour matches, it fires emails — otherwise it exits silently.
# This means the admin can change the time from the dashboard without
# restarting Flask or Celery.
#
# Reminder window: drives with deadlines in the next 1, 2, or 3 days.
# Each eligible student gets ONE consolidated email listing ALL upcoming drives.

@shared_task(name="send_daily_reminders")
def send_daily_reminders(force=False):
    """
    force=False -> scheduled run: checks hour, skips if wrong time
    force=True  -> admin "Send Now": bypasses hour check entirely
    """
    from app import app
    from backend.controllers.models import PlacementDrive, StudentProfile, Settings

    with app.app_context():
        now = datetime.now()

        #  Hour check — skipped when admin triggers manually with force=True
        if not force:
            configured_hour = int(Settings.get('reminder_hour', '8'))
            if now.hour != configured_hour:
                return f"Not reminder hour (now={now.hour}, configured={configured_hour}). Skipping."

        # Find drives closing in the next 3 days with status Approved
        window_end = now + timedelta(days=3)
        upcoming_drives = PlacementDrive.query.filter(
            PlacementDrive.status == 'Approved',
            PlacementDrive.application_deadline > now,
            PlacementDrive.application_deadline <= window_end
        ).all()

        if not upcoming_drives:
            return "No upcoming deadlines in the next 3 days. No reminders sent."

        # Build a map: student → list of drives they're eligible for
        #    but haven't applied to yet
        from backend.controllers.models import Application
        student_drives: dict = {}

        for drive in upcoming_drives:
            eligible_students = StudentProfile.query.filter(
                StudentProfile.branch == drive.eligible_branch,
                StudentProfile.cgpa >= drive.min_cgpa,
                StudentProfile.is_blacklisted == False
            ).all()

            for student in eligible_students:
                # Skip if already applied
                already_applied = Application.query.filter_by(
                    student_id=student.id,
                    drive_id=drive.id
                ).first()
                if already_applied:
                    continue

                days_left = (drive.application_deadline - now).days

                if student.id not in student_drives:
                    student_drives[student.id] = {
                        'student': student,
                        'drives': []
                    }
                student_drives[student.id]['drives'].append({
                    'title':          drive.title,
                    'company_name':   drive.company.company_name,
                    'deadline_str':   drive.application_deadline.strftime("%d %b %Y, %I:%M %p"),
                    'days_left':      days_left,
                    'min_cgpa':       drive.min_cgpa,
                    'eligible_branch': drive.eligible_branch,
                })

        # Send one consolidated email per student
        sent, failed = 0, 0
        for entry in student_drives.values():
            student = entry['student']
            drives  = sorted(entry['drives'], key=lambda d: d['days_left'])  # urgency first

            if not (student.user and student.user.email):
                continue

            html_content = render_template(
                'reminder_email.html',
                student_name=student.name or student.user.email,
                drives=drives,
                sent_date=now.strftime("%d %b %Y, %I:%M %p")
            )

            msg = Message(
                subject=f"⏰ Reminder: {len(drives)} Upcoming Placement Deadline{'s' if len(drives) > 1 else ''}",
                recipients=[student.user.email],
                html=html_content,
                body=(
                    f"Hi {student.name},\n\n"
                    f"You have {len(drives)} placement deadline(s) coming up in the next 3 days:\n\n"
                    + "\n".join(
                        f"- {d['title']} ({d['company_name']}): {d['deadline_str']} ({d['days_left']}d left)"
                        for d in drives
                    )
                    + "\n\nLog in to the placement portal to apply.\n\n— Placement Cell"
                )
            )
            try:
                mail.send(msg)
                print(f"[Reminder] Sent to {student.user.email} — {len(drives)} drive(s)")
                sent += 1
            except Exception as e:
                print(f"[Reminder] Failed for {student.user.email}: {e}")
                failed += 1

        return f"Reminders done. Sent: {sent}, Failed: {failed}, Drives checked: {len(upcoming_drives)}"


# ── APPLICATION STATUS UPDATE EMAIL ──────────────────────────────────────────

@shared_task(name="send_status_update_email")
def send_status_update_email(student_email, drive_title, status, custom_message):
    from app import app

    def extract(pattern, text, default=""):
        m = re.search(pattern, text, re.IGNORECASE)
        return m.group(1).strip() if m else default

    interview_date = extract(r'Date:\s*(.+?)(?:\.|Mode:|Link:|$)', custom_message)
    interview_mode = extract(r'Mode:\s*(.+?)(?:\.|Link:|Date:|$)', custom_message)
    interview_link = extract(r'Link:\s*(https?://\S+)', custom_message)
    hr_message = re.sub(r'(Date|Mode|Link):\s*\S[^.]*\.?\s*', '', custom_message, flags=re.IGNORECASE).strip(" .")

    with app.app_context():
        html_content = render_template(
            'status_update_email.html',
            drive_title=drive_title,
            status=status,
            interview_date=interview_date,
            interview_mode=interview_mode,
            interview_link=interview_link,
            hr_message=hr_message,
        )

        subject_prefix = {
            'Selected':    '🎉 Congratulations',
            'Shortlisted': "📋 You've been Shortlisted",
            'Rejected':    '📩 Application Update',
        }.get(status, f'📬 [{status}] Update')

        msg = Message(
            subject=f"{subject_prefix} — {drive_title}",
            recipients=[student_email],
            html=html_content,
            body=custom_message
        )
        try:
            mail.send(msg)
            print(f"[Status Email] Sent to {student_email} — {status} for '{drive_title}'")
            return True
        except Exception as e:
            print(f"[Status Email] SMTP ERROR: {e}")
            return False
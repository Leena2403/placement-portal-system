"""
Placement Assistant chatbot powered by Groq (free API), with the Hugging Face
Inference API as a fallback.

The bot answers student questions using live portal data: the student's profile,
open drives (with eligibility checked against the student's CGPA, branch and year),
and the student's own applications.

Setup (Groq, recommended) - export these or put them in a .env file:
    export GROQ_API_KEY=gsk_xxx                 # free key from https://console.groq.com/keys
    optional: export GROQ_MODEL=<any Groq chat model, e.g. llama-3.1-8b-instant>

Fallback (used only when GROQ_API_KEY is not set):
    export HF_TOKEN=hf_xxx                      # your Hugging Face access token
    optional: export HF_MODEL=<any chat model on the HF Hub>
"""
import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from flask import request
from flask_restful import Resource
from flask_security import auth_token_required, roles_required, current_user
from huggingface_hub import InferenceClient

from backend.controllers.models import StudentProfile, CompanyProfile, PlacementDrive, Application

load_dotenv()   # lets GROQ_API_KEY / GROQ_MODEL live in a .env file

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'
GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
_groq_model = GROQ_MODEL   # may be switched automatically if GROQ_MODEL is unavailable
HF_MODEL = os.environ.get('HF_MODEL', 'Qwen/Qwen2.5-72B-Instruct')
MAX_HISTORY = 6          # previous chat turns sent back to the model
MAX_MESSAGE_LEN = 500    # characters allowed per user message

_client = None


def get_client():
    # Creates the Hugging Face client once, on first use.
    global _client
    if _client is None:
        token = os.environ.get('HF_TOKEN')
        if not token:
            raise RuntimeError('HF_TOKEN environment variable is not set')
        _client = InferenceClient(model=HF_MODEL, token=token)
    return _client


def pick_groq_model(headers):
    # Asks Groq which models this key can use and picks a general chat model.
    # Used when the configured model has been retired or is not available.
    resp = requests.get(GROQ_MODELS_URL, headers=headers, timeout=15)
    resp.raise_for_status()
    ids = [m['id'] for m in resp.json().get('data', []) if m.get('active', True)]
    skip = ('whisper', 'guard', 'tts', 'playai', 'orpheus', 'compound', 'vision', 'distil')
    chat_ids = [i for i in ids if not any(s in i.lower() for s in skip)]
    for preferred in ('llama', 'qwen', 'gemma', 'kimi', 'gpt-oss'):
        for i in sorted(chat_ids, reverse=True):
            if preferred in i.lower():
                return i
    if chat_ids:
        return chat_ids[0]
    raise Exception(f'No chat models available on this Groq key (found: {", ".join(ids)[:150]})')


def ask_groq(messages, groq_key):
    global _groq_model
    headers = {'Authorization': f'Bearer {groq_key}', 'User-Agent': 'placement-portal'}

    def call(model):
        return requests.post(
            GROQ_URL,
            headers=headers,
            json={'model': model, 'messages': messages, 'max_tokens': 400, 'temperature': 0.3},
            timeout=30,
        )

    resp = call(_groq_model)
    if resp.status_code in (400, 404) and 'model' in resp.text.lower():
        # Configured model is retired or not available: switch to one this key can use.
        _groq_model = pick_groq_model(headers)
        print(f'CHATBOT: switched Groq model to {_groq_model}')
        resp = call(_groq_model)
    if resp.status_code != 200:
        raise Exception(f'Groq error {resp.status_code}: {resp.text[:150]}')

    reply = (resp.json()['choices'][0]['message'].get('content') or '').strip()
    if not reply:
        raise Exception(f'Groq model {_groq_model} returned an empty reply')
    return reply, _groq_model


def ask_model(messages):
    # Sends the chat to Groq if a key is set, otherwise to Hugging Face.
    # Returns (reply_text, model_name).
    groq_key = os.environ.get('GROQ_API_KEY')
    if groq_key:
        return ask_groq(messages, groq_key)

    if not os.environ.get('HF_TOKEN'):
        raise RuntimeError('Set GROQ_API_KEY (or HF_TOKEN) before starting the app')
    response = get_client().chat_completion(messages=messages, max_tokens=400, temperature=0.3)
    return response.choices[0].message.content.strip(), HF_MODEL


def eligibility_note(drive, student):
    # Mirrors the checks in ApplyToDriveAPI so the bot gives the same answer as the portal.
    if drive.min_cgpa and student.cgpa is not None and student.cgpa < drive.min_cgpa:
        return f'not eligible (needs CGPA {drive.min_cgpa})'
    if drive.eligible_branch and student.branch:
        allowed = [b.strip().lower() for b in drive.eligible_branch.split(',')]
        if student.branch.strip().lower() not in allowed:
            return f'not eligible (open to {drive.eligible_branch} only)'
    if drive.eligible_year and student.year_of_study and student.year_of_study != drive.eligible_year:
        return f'not eligible (open to year {drive.eligible_year} only)'
    return 'eligible'


def build_portal_context(student):
    # Turns the student's portal data into plain text the model can read.
    applied_ids = {a.drive_id for a in Application.query.filter_by(student_id=student.id).all()}

    drives = PlacementDrive.query.join(CompanyProfile).filter(
        PlacementDrive.status == 'Approved',
        PlacementDrive.application_deadline > datetime.now(),
        CompanyProfile.is_blacklisted == False
    ).all()

    drive_lines = []
    for d in drives:
        deadline = d.application_deadline.strftime('%d %b %Y, %I:%M %p') if d.application_deadline else 'not set'
        applied = ' | already applied' if d.id in applied_ids else ''
        drive_lines.append(
            f"- {d.title} at {d.company.company_name} | deadline: {deadline} | "
            f"min CGPA: {d.min_cgpa or 'none'} | branch: {d.eligible_branch or 'any'} | "
            f"year: {d.eligible_year or 'any'} | {eligibility_note(d, student)}{applied} | "
            f"about: {(d.description or '')[:200]}"
        )

    app_lines = []
    for a in Application.query.filter_by(student_id=student.id).all():
        applied_on = a.applied_at.strftime('%d %b %Y') if a.applied_at else 'unknown date'
        app_lines.append(f"- {a.drive.title} at {a.drive.company.company_name} | applied: {applied_on} | status: {a.status}")

    return (
        f"Student: {student.name or 'Student'} | branch: {student.branch or 'not set'} | "
        f"CGPA: {student.cgpa if student.cgpa is not None else 'not set'} | "
        f"year: {student.year_of_study or 'not set'} | resume added: {'yes' if student.resume_url else 'no'}\n\n"
        f"Open placement drives:\n{chr(10).join(drive_lines) or '- none right now'}\n\n"
        f"This student's applications:\n{chr(10).join(app_lines) or '- none yet'}"
    )


SYSTEM_PROMPT = """You are the Placement Assistant inside a college placement portal.
Help students with:
- open drives, deadlines and whether they are eligible, using the portal data below
- the status of their own applications
- general placement prep: resumes, interviews, aptitude tests, choosing roles

Rules:
- Only use the portal data below for facts about drives, eligibility and applications. If something is not there, say so.
- Never invent companies, salaries, deadlines or application results.
- To apply, tell the student to click Apply on the drive in their dashboard. To fix profile details, use Edit Profile.
- Keep answers short: 2 to 5 sentences or a short list.

PORTAL DATA:
{context}"""


class ChatbotAPI(Resource):
    @auth_token_required
    @roles_required('student')
    def post(self):
        data = request.get_json(silent=True) or {}
        message = (data.get('message') or '').strip()
        history = data.get('history') or []

        if not message:
            return {'message': 'Message is required'}, 400
        if len(message) > MAX_MESSAGE_LEN:
            return {'message': f'Keep messages under {MAX_MESSAGE_LEN} characters'}, 400

        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if not student:
            return {'message': 'Student profile not found'}, 404
        if student.is_blacklisted:
            return {'message': 'Your account is restricted, so the assistant is unavailable.'}, 403

        messages = [{'role': 'system', 'content': SYSTEM_PROMPT.format(context=build_portal_context(student))}]
        # Keep only valid, recent turns sent by the browser
        for turn in history[-MAX_HISTORY:]:
            if isinstance(turn, dict) and turn.get('role') in ('user', 'assistant') and isinstance(turn.get('content'), str):
                messages.append({'role': turn['role'], 'content': turn['content'][:1000]})
        messages.append({'role': 'user', 'content': message})

        try:
            reply, model_used = ask_model(messages)
        except RuntimeError as e:
            return {'message': str(e)}, 500
        except Exception as e:
            return {'message': f'Assistant is unavailable right now ({str(e)[:200]})'}, 502

        return {'reply': reply, 'model': model_used}, 200

import os
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_security import current_user, login_required
from dotenv import load_dotenv

# Force load environment variables right away to prevent race conditions
load_dotenv()

from langchain_openai import ChatOpenAI  
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

# Perfect schema imports mapped to your models.py
from backend.controllers.database import db
from backend.controllers.models import PlacementDrive, StudentProfile

chatbot_bp = Blueprint('chatbot', __name__)

hf_token = os.environ.get("HUGGINGFACEHUB_API_TOKEN") or os.environ.get("HF_TOKEN")
if not hf_token:
    hf_token = "dummy_token_missing"

# Using the highly supported free serverless conversational model
llm = ChatOpenAI(
    base_url="https://router.huggingface.co/v1", 
    api_key=hf_token, 
    model="Qwen/Qwen2.5-7B-Instruct",
    max_tokens=400, 
    temperature=0.3
)

# Advanced system context prompt accepting dynamic profile and database contexts
chat_prompt = ChatPromptTemplate.from_messages([
    ("system", """You are an elite, highly personalized AI placement assistant for the college Placement Portal.
You have real-time read access to the database containing student details and upcoming recruitment events.

STUDENT PROFILE INFORMATION:
{student_context}

LIVE PLACEMENT DRIVES DIRECTLY FROM DATABASE:
{database_context}

INSTRUCTIONS:
1. Greet the student dynamically using their profile context if available (e.g., know their branch/CGPA without asking).
2. Look at the "LIVE PLACEMENT DRIVES" list above. Filter them logically to find which ones match the student's branch or text query (e.g., Data Science, Computer Science).
3. If roles are found, summarize them clearly showing the Company, Title, Eligibility (CGPA), and Deadline.
4. If they do not meet the CGPA criteria for an open drive, state it politely as a helpful advisory advisor.
5. If no active drives match, inform them and suggest checking back later.
"""),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}")
])

@chatbot_bp.route('/api/chat', methods=['POST'])
@login_required
def chat():
    if hf_token == "dummy_token_missing":
        return jsonify({"error": "Hugging Face API token is missing. Please check your .env file."}), 500

    data = request.json
    user_message = data.get('message')
    
    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # 1. PERSONALIZE: Fetch logged in student details
    try:
        student = StudentProfile.query.filter_by(user_id=current_user.id).first()
        if student:
            student_context = (
                f"- Name: {student.name}\n"
                f"- Branch: {student.branch}\n"
                f"- CGPA: {student.cgpa}\n"
                f"- Current Year: {student.year_of_study}\n"
                f"- Is Blacklisted: {student.is_blacklisted}"
            )
        else:
            student_context = "No specific profile found. Treat as guest student user."
    except Exception as e:
        student_context = "Profile lookup failed due to system query issue."

    # 2. CONTEXT-INJECTION: Fetch active drives from database
    try:
        now = datetime.utcnow()
        # Pull drives whose deadline has not passed yet
        drives = PlacementDrive.query.filter(PlacementDrive.application_deadline >= now).all()
        
        if drives:
            context_lines = []
            for d in drives:
                # Safely query company_name from linked relationship
                company_name = d.company.company_name if d.company else "Unknown Recruiter"
                formatted_deadline = d.application_deadline.strftime("%b %d, %Y (%I:%M %p)") if d.application_deadline else "N/A"
                
                context_lines.append(
                    f"- Recruiter: {company_name} | Position: {d.title} | Target Branches: {d.eligible_branch} | Min CGPA Requirement: {d.min_cgpa} | Apply Before: {formatted_deadline}"
                )
            db_context = "\n".join(context_lines)
        else:
            db_context = "There are currently no active placement drives accepting submissions in the database."
            
    except Exception as db_err:
        print(f"Database extraction crash: {db_err}")
        db_context = "Database mapping is offline. Cannot list current jobs."

    # 3. MEMORY: Setup short-term Redis state storage
    session_id = f"chat_session_user_{current_user.id}"
    message_history = RedisChatMessageHistory(
        url='redis://localhost:6379/0',
        session_id=session_id,
        ttl=3600 # Clear memory data automatically after an hour of inactivity
    )
    
    memory = ConversationBufferMemory(
        memory_key="history",
        return_messages=True, 
        chat_memory=message_history,
        input_key="input"
    )

    # 4. RUN: Construct and fire LLM Chain execution
    conversation = LLMChain(
        llm=llm,
        prompt=chat_prompt,
        memory=memory,
        verbose=False
    )

    try:
        response = conversation.predict(
            input=user_message, 
            student_context=student_context, 
            database_context=db_context
        )
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
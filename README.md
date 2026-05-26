<div align="center">

# Placement Portal

### A full-stack college recruitment management system — built for students, companies & admins.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-RESTful-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask-restful.readthedocs.io)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-42b883?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org)
[![Celery](https://img.shields.io/badge/Celery-Task%20Queue-37814A?style=for-the-badge&logo=celery&logoColor=white)](https://docs.celeryq.dev)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Broker-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

> Three roles. One platform. Zero missed deadlines.

[Overview](#-overview) · [Features](#-features) · [Architecture](#-architecture) · [Getting Started](#-getting-started) · [API Reference](#-api-reference) · [Database Schema](#-database-schema) · [Background Jobs](#-background-jobs) · [Contributing](#-contributing)

</div>

---

## 🧭 Overview

**Placement Portal** is a production-grade web application that streamlines the entire campus recruitment lifecycle — from company registration and drive creation to student applications, status tracking, automated email reminders, and monthly analytics reports.

The system supports **three distinct user roles**, each with a purpose-built dashboard:

| Role | What they do |
|------|-------------|
| 🛡️ **Admin** | Approves companies, manages all drives & applications, broadcasts notifications, exports reports, configures reminder schedules |
| 🏢 **Company** | Registers (pending approval), posts placement drives with eligibility criteria, tracks applicants and updates statuses |
| 🎓 **Student** | Registers, applies to eligible drives, tracks application status, exports personal records, receives deadline reminders |

---

## ✨ Features

### 🛡️ Admin
- Approve or reject company registrations
- View all students, companies, drives, and applications from a single dashboard
- Update application statuses on behalf of companies
- Blacklist / whitelist students and companies
- Broadcast custom notifications to specific students or companies
- Export a full placement report as **CSV**
- Trigger **monthly summary emails** on demand
- Configure and trigger **daily deadline reminder emails**
- View real-time platform statistics (total students, drives, applications, placement rate)

### 🏢 Company
- Register with company name, HR contact, and website (requires admin approval)
- Post placement drives with: title, description, min CGPA, eligible branch & year, application deadline
- View applicants per drive with full student profiles
- Update individual application statuses (`Applied → Selected / Rejected / On Hold`)
- Receive notifications from admin

### 🎓 Student
- Register with academic details (CGPA, branch, year of study, resume URL)
- Browse all approved, open placement drives
- Apply to drives with CGPA/branch/year eligibility enforcement
- Track all personal applications with real-time status
- Export applications as a **CSV file** (async, Celery-powered)
- View personal placement stats
- Receive **automated deadline reminder emails** (1–3 days before closing)

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (SPA)                           │
│                                                                 │
│   Vue 3 + Vue Router (Hash History)                             │
│   ├── Home · Login · Register                                   │
│   ├── StudentDashboard                                          │
│   ├── CompanyDashboard                                          │
│   └── AdminDashboard                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │  HTTP (JSON) + Authentication-Token header
┌────────────────────────▼────────────────────────────────────────┐
│                    FLASK APPLICATION                             │
│                                                                 │
│  Flask-RESTful  →  /api/*  endpoints                            │
│  Flask-Security →  Token auth · Role-based access control       │
│  Flask-CORS     →  Cross-origin support                         │
│  Flask-Caching  →  Redis-backed (5 min TTL)                     │
│  Flask-Mail     →  SMTP via Gmail (SSL/465)                     │
└──────────┬─────────────────────────┬───────────────────────────┘
           │                         │
    ┌──────▼──────┐           ┌──────▼──────┐
    │   SQLite     │           │    Redis     │
    │  (site.db)   │           │  :6379       │
    │              │           │  ├── Cache   │
    │  ORM via     │           │  ├── Broker  │
    │  SQLAlchemy  │           │  └── Backend │
    └─────────────┘           └──────┬───────┘
                                     │
                              ┌──────▼───────┐
                              │    Celery     │
                              │  ├── Worker   │
                              │  └── Beat     │
                              │               │
                              │  Tasks:       │
                              │  • Daily      │
                              │    Reminders  │
                              │  • Monthly    │
                              │    Report     │
                              │  • CSV Export │
                              └──────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Redis | Any recent version |
| pip | Latest |

> Redis must be running locally on port `6379` before starting Flask or Celery.

---

### 1 · Clone the repository

```bash
git clone https://github.com/your-username/placement-portal.git
cd placement-portal
```

### 2 · Set up a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows
```

### 3 · Install dependencies

```bash
pip install -r backend/requirement.txt
```

### 4 · Start Redis

```bash
redis-server
# or if Redis is installed as a service: sudo systemctl start redis
```

### 5 · Run the Flask app

```bash
python app.py
```

The server starts at **http://127.0.0.1:5000** 🎉

### 6 · Start Celery Worker (new terminal)

```bash
python3 -m celery -A app.celery_app worker --loglevel=info --pool=solo
```

### 7 · Start Celery Beat — task scheduler (new terminal)

```bash
python3 -m celery -A app.celery_app beat --loglevel=info
```

---

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@gmail.com` |
| Password | `admin123` |

> ⚠️ **Security note:** Change `SECRET_KEY`, `SECURITY_PASSWORD_SALT`, and `MAIL_PASSWORD` in `config.py` before deploying. Never commit real credentials to version control — use environment variables or a `.env` file.

---

## 📁 Project Structure

```
placement_portal/
│
├── app.py                          # App factory, Celery factory, Celery Beat schedule, SPA catch-all route
│
├── backend/
│   ├── requirement.txt             # Python dependencies
│   └── controllers/
│       ├── database.py             # SQLAlchemy db instance
│       ├── models.py               # ORM models (User, Role, StudentProfile, CompanyProfile,
│       │                           #              PlacementDrive, Application, Notification, Settings)
│       ├── config.py               # App config: DB, Security, Redis, Mail, Celery
│       ├── user_datastore.py       # Flask-Security datastore + Cache + Mail singletons
│       ├── routes.py               # API route registration via Flask-RESTful
│       ├── authentication_apis.py  # Login, Logout, StudentRegister, CompanyRegister
│       ├── crud_apis.py            # All 20+ REST resource classes
│       └── tasks.py                # Celery tasks: monthly report, CSV export, deadline reminders
│
└── frontend/
    ├── templates/
    │   ├── index.html              # SPA shell — mounts Vue app
    │   ├── reminder_email.html     # Jinja2 email template: deadline reminder
    │   ├── status_update_email.html # Jinja2 email template: application status change
    │   └── monthly_report_email.html # Jinja2 email template: admin monthly summary
    └── static/
        ├── img/
        │   └── image.jpg
        └── component/
            ├── app.js              # Vue app entry — creates app, mounts router
            ├── route.js            # Vue Router route definitions
            ├── home.js             # Home page component
            ├── login.js            # Login component (stores auth_token in localStorage)
            ├── register.js         # Unified registration (student / company)
            ├── student_dashboard.js  # Full student experience SPA
            ├── company_dashboard.js  # Full company experience SPA
            └── admin_dashboard.js    # Full admin control panel SPA
```

---

## 🌐 API Reference

All endpoints are prefixed with `/api`.
Protected routes require the header: `Authentication-Token: <token>`

### 🔑 Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/login` | ❌ | Login; returns `auth_token`, role, display name |
| `POST` | `/api/logout` | ✅ | Invalidates session token |
| `POST` | `/api/student_register` | ❌ | Creates student account + profile |
| `POST` | `/api/company_register` | ❌ | Creates company account (status: Pending) |

### 👤 Students

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/students` | Admin / Student | Admin: all students · Student: own profile |
| `GET` | `/api/students/<id>` | Admin / Student | Fetch student by ID |
| `PUT` | `/api/students/<id>` | Admin / Student | Update profile · Admin can whitelist |
| `DELETE` | `/api/students/<id>` | Admin | Delete student account |
| `GET` | `/api/student/my-applications` | Student | Own application history |
| `GET` | `/api/student/stats` | Student | Personal stats (applied, selected, etc.) |
| `POST` | `/api/student/export-trigger` | Student | Async CSV export via Celery |
| `GET` | `/api/student/report/download` | Student | Download generated CSV |

### 🏢 Companies

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/companies` | Admin | All company profiles |
| `GET` | `/api/companies/<id>` | Admin / Company | Single company profile |
| `PUT` | `/api/companies/<id>` | Admin / Company | Update company profile · Admin can blacklist/whitelist |
| `DELETE` | `/api/companies/<id>` | Admin | Delete company account |

### 📋 Placement Drives

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/company/drives` | Company | Create a new placement drive |
| `GET` | `/api/drives` | All | List all approved drives (with eligibility filter for students) |
| `PUT` | `/api/drives/<id>/status` | Admin | Approve / reject / close a drive |
| `PUT` | `/api/drives/<id>/update` | Company | Edit drive details |

### 📝 Applications

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `POST` | `/api/drives/<id>/apply` | Student | Apply to a drive (eligibility checked) |
| `GET` | `/api/drives/<id>/applicants` | Company / Admin | All applicants for a drive |
| `PUT` | `/api/applications/<id>/status` | Company / Admin | Update application status |
| `GET` | `/api/admin/applications` | Admin | All applications across all drives |

### 🔔 Notifications

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/notifications` | Admin | Admin notification inbox |
| `POST` | `/api/contact_admin` | Student / Company | Send message to admin |
| `POST` | `/api/admin/notify_company` | Admin | Push notification to a company |
| `POST` | `/api/admin/notify_student` | Admin | Push notification to a student |
| `GET` | `/api/company/notifications` | Company | Company notification inbox |
| `POST` | `/api/notifications/read` | Any | Mark notifications as read |

### 📊 Analytics & Reports

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/stats` | Admin | Platform-wide stats (cached) |
| `GET` | `/api/admin/export-report` | Admin | Download full CSV placement report |

### ⚙️ Celery / Scheduling

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/reminder-settings` | Admin | Get current reminder hour |
| `PUT` | `/api/admin/reminder-settings` | Admin | Update reminder hour (no restart needed) |
| `POST` | `/api/admin/trigger-reminders` | Admin | Manually fire deadline reminder emails |
| `POST` | `/api/admin/trigger-monthly-report` | Admin | Manually fire monthly summary email |

---

## 🗄️ Database Schema

```
┌───────────────────┐         ┌────────────────────────────────┐
│       role         │         │             user               │
├───────────────────┤         ├────────────────────────────────┤
│ id   INT PK        │◄──┐    │ id              INT PK         │
│ name VARCHAR(80)   │   │    │ email           VARCHAR UNIQUE  │
│ desc VARCHAR(255)  │   │    │ password        VARCHAR         │
└───────────────────┘   │    │ active          BOOL            │
                        │    │ fs_uniquifier   VARCHAR UNIQUE  │
          roles_users   │    └───────────┬────────────────────┘
        (M:N join table)┘                │
                                         │ 1:1
              ┌──────────────────────────┼───────────────────────────────┐
              │                          │                               │
              ▼                          ▼                               ▼
┌─────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────┐
│   student_profile    │   │    company_profile        │   │    notification       │
├─────────────────────┤   ├──────────────────────────┤   ├──────────────────────┤
│ id            PK     │   │ id               PK       │   │ id          PK        │
│ user_id       FK     │   │ user_id          FK        │   │ user_id     FK        │
│ name                 │   │ company_name              │   │ message               │
│ phone                │   │ hr_contact                │   │ created_at  DATETIME  │
│ cgpa          FLOAT  │   │ website                   │   │ is_read     BOOL      │
│ branch               │   │ approval_status           │   └──────────────────────┘
│ year_of_study INT    │   │ is_blacklisted   BOOL     │
│ resume_url           │   └──────────┬───────────────┘
│ is_blacklisted BOOL  │              │ 1:N
└──────────┬──────────┘              ▼
           │              ┌──────────────────────────┐
           │              │     placement_drive       │
           │              ├──────────────────────────┤
           │              │ id               PK       │
           │              │ company_id       FK        │
           │              │ title                     │
           │              │ description      TEXT     │
           │              │ min_cgpa         FLOAT    │
           │              │ eligible_branch           │
           │              │ eligible_year    INT      │
           │              │ application_deadline      │
           │              │ status  (Pending/Approved/│
           │              │          Closed/Rejected) │
           │              │ created_at       DATETIME │
           │              └──────────┬───────────────┘
           │                         │ 1:N
           │              ┌──────────▼───────────────┐
           │              │       application         │
           │              ├──────────────────────────┤
           └─────────────►│ student_id       FK       │
          1:N             │ drive_id         FK        │
                          │ applied_at       DATETIME │
                          │ status  (Applied/Selected/│
                          │          Rejected/On Hold)│
                          │ UNIQUE(student_id,drive_id)│
                          └──────────────────────────┘

┌──────────────────────────┐
│         settings          │
├──────────────────────────┤
│ key   VARCHAR PK          │   e.g. 'reminder_hour' → '8'
│ value VARCHAR             │   Admin-editable at runtime
└──────────────────────────┘
```

---

## ⚙️ Background Jobs

Celery powers all async and scheduled work. Three tasks are registered:

### 📬 `send_monthly_report` — runs 1st of every month, 9:00 AM

Aggregates the month's drive count, total applications, and total selections, then emails a beautifully formatted HTML summary to the admin.

### ⏰ `send_daily_reminders` — checked every hour by Beat

Reads `reminder_hour` from the `settings` table. If the current hour matches, it scans for **approved drives closing within 3 days** and sends each eligible student one consolidated HTML reminder email listing all upcoming deadlines.

> The reminder hour is configurable from the admin dashboard — **no server restart required**.

### 📂 `export_student_applications` — triggered on demand

Generates a CSV of a student's application history and saves it to `frontend/static/downloads/`. The student is notified when the file is ready to download. Runs asynchronously so the HTTP request returns immediately.

---

## 🔐 Security Model

| Mechanism | Implementation |
|-----------|---------------|
| Password hashing | PBKDF2-SHA512 via Flask-Security-Too |
| Session tokens | `Authentication-Token` header (stateless) |
| Role enforcement | `@auth_token_required` + `@roles_required` decorators |
| Company gating | Admin approval required before company can post drives |
| Blacklisting | Admin can block students or companies platform-wide |
| Eligibility checks | CGPA, branch, year validated server-side before each application |
| Duplicate prevention | `UNIQUE(student_id, drive_id)` constraint on `application` table |

---

## ⚠️ Known Issues & Improvement Areas

> Great places to contribute!

- [ ] **Hardcoded credentials in `config.py`** — move `SECRET_KEY`, `MAIL_PASSWORD` etc. to `.env` + `python-dotenv`
- [ ] **No `.gitignore`** — `site.db`, `celerybeat-schedule.db`, `dump.rdb`, `__pycache__` should be excluded
- [ ] **No input validation layer** — add `marshmallow` or `pydantic` schemas for request bodies
- [ ] **Redis cache invalidation** — some admin stats cache (`admin_stats`) is deleted manually; could be more systematic
- [ ] **No pagination** on list endpoints — large datasets will slow down responses
- [ ] **No frontend build tool** — Vue is loaded via CDN; consider Vite for a production bundle
- [ ] **`admin_summary` route is a stub** — wire up real analytics
- [ ] **No rate limiting** — add `Flask-Limiter` on auth endpoints
- [ ] **Email credentials exposed** — Gmail App Password should never be committed to version control

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

```bash
# 1. Fork the repo and clone your fork
git clone https://github.com/your-username/placement-portal.git

# 2. Create a feature branch
git checkout -b feature/your-feature-name

# 3. Make your changes and write meaningful commits
git commit -m "feat: add marshmallow validation to StudentRegisterAPI"

# 4. Push and open a Pull Request
git push origin feature/your-feature-name
```

Please follow [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `refactor:`, `chore:` etc.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Built with ❤️ using Flask · Vue 3 · Celery · Redis · SQLAlchemy

⭐ Star this repo if it helped you!

</div>

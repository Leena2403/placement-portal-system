const AdminDashboard = {
    template: `
<style>
    .navbar {
        position: sticky;
        top: 0;
        z-index: 2000 !important;
    }
    .dropdown-menu {
        z-index: 3000 !important;
    }
    .secondary-sticky {
        position: sticky;
        top: 56px;
        z-index: 1000 !important;
    }
    .clickable-link {
        cursor: pointer;
        text-decoration: none;
    }
    .clickable-link:hover {
        text-decoration: underline;
    }
</style>

    <div class="admin-dashboard-wrapper" style="background-color: #f8f9fa; min-height: 100vh;">

        <nav class="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
            <div class="container">
                <span class="navbar-brand fw-bold">Admin Portal</span>
                <div class="ms-auto d-flex align-items-center">
                    <div class="dropdown me-3">
                        <button @click="markNotificationsRead" class="btn btn-outline-light position-relative border-0 shadow-none" id="adminNotifBell" data-bs-toggle="dropdown">
                            <span style="font-size: 1.2rem;">🔔</span>
                            <span v-if="unreadCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                {{ unreadCount }}
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-lg p-0" style="width: 320px; max-height: 400px; overflow-y: auto;">
                            <li class="dropdown-header bg-light fw-bold py-3 border-bottom">Admin Notifications</li>
                            <li v-for="note in notifications" :key="note.id" class="dropdown-item border-bottom py-3" style="white-space: normal;">
                                <p class="mb-1 small text-dark fw-medium">{{ note.message }}</p>
                                <small class="text-muted" style="font-size: 0.7rem;">{{ note.created_at }}</small>
                            </li>
                            <li v-if="notifications.length === 0" class="text-center py-4 text-muted small">No messages found.</li>
                        </ul>
                    </div>
                    <button @click="handleLogout" class="btn btn-danger btn-sm px-3 fw-bold">Logout</button>
                </div>
            </div>
        </nav>

        <div class="container mt-4">
            <div class="row g-4 mb-4">
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm bg-primary text-white p-3">
                        <h6 class="mb-0 opacity-75 small fw-bold text-uppercase">Active Students</h6>
                        <h2 class="fw-bold mb-0">{{ stats.total_students || 0 }}</h2>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm bg-success text-white p-3">
                        <h6 class="mb-0 opacity-75 small fw-bold text-uppercase">Partner Companies</h6>
                        <h2 class="fw-bold mb-0">{{ stats.total_companies || 0 }}</h2>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-0 shadow-sm bg-info text-white p-3">
                        <h6 class="mb-0 opacity-75 small fw-bold text-uppercase">Live Drives</h6>
                        <h2 class="fw-bold mb-0">{{ stats.total_drives || 0 }}</h2>
                    </div>
                </div>
            </div>

            <div class="bg-white border rounded shadow-sm mb-4 secondary-sticky">
                <div class="container-fluid py-2 d-flex justify-content-between align-items-center">
                    <ul class="nav nav-pills gap-2">
                        <li class="nav-item"><button class="nav-link fw-bold" :class="{active: currentTab === 'companies'}" @click="currentTab = 'companies'">Companies</button></li>
                        <li class="nav-item"><button class="nav-link fw-bold" :class="{active: currentTab === 'students'}" @click="currentTab = 'students'">Students</button></li>
                        <li class="nav-item"><button class="nav-link fw-bold" :class="{active: currentTab === 'drives'}" @click="currentTab = 'drives'">Drives</button></li>
                        <li class="nav-item"><button class="nav-link fw-bold" :class="{active: currentTab === 'applications'}" @click="currentTab = 'applications'">Applications</button></li>
                        <li class="nav-item"><button class="nav-link fw-bold" :class="{active: currentTab === 'settings'}" @click="currentTab = 'settings'">⚙ Settings</button></li>
                    </ul>
                    <div class="d-flex align-items-center gap-2"> <button @click="triggerMonthlyReport" class="btn btn-primary fw-bold shadow-sm d-flex align-items-center gap-2">
                            <span>✉️</span> Send Monthly Report
                        </button>
                        <button @click="downloadCSV" class="btn btn-success fw-bold shadow-sm d-flex align-items-center gap-2">
                            <span>📊</span> Download CSV Report
                        </button>
                    </div>
                </div>
            </div>

            <div class="pb-5">

                <!-- ── COMPANIES TAB ── -->
                <div v-if="currentTab === 'companies'">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="fw-bold text-dark mb-0">Company Management</h3>
                        <input type="text" v-model="companySearch" class="form-control w-25 shadow-sm" placeholder="Search companies...">
                    </div>
                    <section class="mb-5" v-if="pendingCompanies.length > 0">
                        <h5 class="fw-bold text-warning mb-3">Pending Requests</h5>
                        <div class="table-responsive bg-white shadow-sm rounded border">
                            <table class="table table-hover align-middle mb-0">
                                <thead class="table-light"><tr><th class="ps-4">Company Name</th><th class="text-end pe-4">Actions</th></tr></thead>
                                <tbody>
                                    <tr v-for="comp in pendingCompanies" :key="comp.id">
                                        <td class="ps-4 fw-bold text-dark">{{ comp.company_name }}</td>
                                        <td class="text-end pe-4">
                                            <button @click="updateCompanyStatus(comp.id, 'approve')" class="btn btn-success btn-sm me-2 fw-bold">Approve</button>
                                            <button @click="openNotifyModal(comp)" class="btn btn-outline-primary btn-sm me-2">Notify</button>
                                            <button @click="blacklistCompany(comp.id)" class="btn btn-outline-danger btn-sm">Blacklist</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section class="mb-5">
                        <h5 class="fw-bold text-success mb-3">Registered Entities</h5>
                        <div class="list-group shadow-sm border rounded">
                            <div v-for="comp in approvedCompanies" :key="comp.id" class="list-group-item d-flex justify-content-between align-items-center py-3">
                                <div>
                                    <a href="#" @click.prevent="viewCompany(comp)" class="fw-bold text-decoration-none text-primary">{{ comp.company_name }}</a>
                                    <span class="badge bg-light text-success border ms-2">Active</span>
                                </div>
                                <div>
                                    <button @click="openNotifyModal(comp)" class="btn btn-outline-primary btn-sm me-2">Notify</button>
                                    <button @click="blacklistCompany(comp.id)" class="btn btn-outline-danger btn-sm">Blacklist</button>
                                </div>
                            </div>
                        </div>
                    </section>
                    <section v-if="blacklistedCompanies.length > 0" class="mt-5">
                        <h5 class="text-danger fw-bold mb-3">Blacklisted Companies</h5>
                        <div class="list-group shadow-sm">
                            <div v-for="comp in blacklistedCompanies" :key="comp.id" class="list-group-item list-group-item-danger d-flex justify-content-between align-items-center py-3">
                                <span class="fw-bold">{{ comp.company_name }}</span>
                                <button @click="updateCompanyStatus(comp.id, 'whitelist')" class="btn btn-success btn-sm fw-bold">Restore</button>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- ── STUDENTS TAB ── -->
                <div v-if="currentTab === 'students'">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="fw-bold text-dark mb-0">Student Database</h3>
                        <input type="text" v-model="studentSearch" class="form-control w-25 shadow-sm" placeholder="Search students...">
                    </div>
                    <div class="table-responsive bg-white shadow-sm rounded border mb-5">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light"><tr><th class="ps-4">Name</th><th>Branch</th><th>CGPA</th><th class="text-end pe-4">Action</th></tr></thead>
                            <tbody>
                                <tr v-for="stud in filteredActiveStudents" :key="stud.id">
                                    <td class="ps-4"><a href="#" @click.prevent="viewStudent(stud.id)" class="fw-bold text-decoration-none text-primary">{{ stud.name }}</a></td>
                                    <td>{{ stud.branch }}</td>
                                    <td><span class="badge bg-info text-dark">{{ stud.cgpa }}</span></td>
                                    <td class="text-end pe-4">
                                        <button @click="openNotifyStudentModal(stud)" class="btn btn-outline-primary btn-sm me-2">Notify</button>
                                        <button @click="blacklistStudent(stud.id)" class="btn btn-outline-danger btn-sm px-3">Blacklist</button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <section v-if="blacklistedStudents.length > 0" class="mt-5">
                        <h5 class="text-danger fw-bold mb-3">Blacklisted Students</h5>
                        <div class="list-group shadow-sm">
                            <div v-for="s in blacklistedStudents" :key="s.id" class="list-group-item list-group-item-danger d-flex justify-content-between align-items-center py-3">
                                <span>{{ s.name }} ({{ s.email }})</span>
                                <button @click="whitelistStudent(s.id)" class="btn btn-sm btn-success fw-bold">Restore</button>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- ── DRIVES TAB ── -->
                <div v-if="currentTab === 'drives'">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="fw-bold text-dark mb-0">Placement Drives</h3>
                        <input type="text" v-model="driveSearch" class="form-control w-25 shadow-sm" placeholder="Search drives...">
                    </div>
                    <div class="row g-3">
                        <div v-for="drive in filteredActiveDrives" :key="drive.id" class="col-md-6">
                            <div class="card h-100 border-0 shadow-sm border-start border-4"
                                :class="{
                                    'border-warning':    drive.status === 'Pending',
                                    'border-success':    drive.status === 'Approved',
                                    'border-danger':     drive.status === 'Rejected',
                                    'border-dark':       drive.status === 'Blacklisted'
                                }">
                                <div class="card-body d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 class="fw-bold mb-1">{{ drive.title }}</h5>
                                        <small class="text-muted">By: <strong>{{ drive.company }}</strong></small>
                                        <span class="badge ms-2"
                                            :class="{
                                                'bg-warning text-dark': drive.status === 'Pending',
                                                'bg-success':           drive.status === 'Approved',
                                                'bg-danger':            drive.status === 'Rejected',
                                                'bg-dark':              drive.status === 'Blacklisted'
                                            }">
                                            {{ drive.status }}
                                        </span>
                                    </div>
                                    <div class="d-flex gap-2 flex-shrink-0 ms-3">
                                        <!-- View is always available -->
                                        <button @click="viewDriveDetails(drive)" class="btn btn-outline-secondary btn-sm">View</button>

                                        <!-- Pending: approve + reject + blacklist -->
                                        <template v-if="drive.status === 'Pending'">
                                            <button @click="approveDrive(drive.id)" class="btn btn-primary btn-sm fw-bold">Approve</button>
                                            <button @click="rejectDrive(drive.id)" class="btn btn-danger btn-sm fw-bold">Reject</button>
                                            <button @click="blacklistDrive(drive.id)" class="btn btn-dark btn-sm fw-bold">Blacklist</button>
                                        </template>

                                        <!-- Approved: blacklist only (no Complete) -->
                                        <template v-else-if="drive.status === 'Approved'">
                                            <button @click="blacklistDrive(drive.id)" class="btn btn-dark btn-sm fw-bold">Blacklist</button>
                                        </template>

                                        <!-- Rejected: blacklist -->
                                        <template v-else-if="drive.status === 'Rejected'">
                                            <button @click="blacklistDrive(drive.id)" class="btn btn-dark btn-sm fw-bold">Blacklist</button>
                                        </template>

                                        <!-- Blacklisted: restore button -->
                                        <template v-else-if="drive.status === 'Blacklisted'">
                                            <button @click="restoreDrive(drive.id)" 
                                                    class="btn btn-success btn-sm fw-bold"
                                                    :title="isCompanyBlacklisted(drive.company) ? 'Company is blacklisted' : ''">
                                                Restore
                                            </button>
                                        </template>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="filteredActiveDrives.length === 0" class="col-12 text-center p-5 text-muted bg-white rounded shadow-sm border">
                            No drives found.
                        </div>
                    </div>
                </div>

                <!-- ── APPLICATIONS TAB ── -->
                <div v-if="currentTab === 'applications'">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h3 class="fw-bold text-dark mb-0">Application Records</h3>
                        <input type="text" v-model="appSearch" class="form-control w-25 shadow-sm" placeholder="Search applications...">
                    </div>
                    <div class="table-responsive bg-white shadow-sm rounded border">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light"><tr><th class="ps-4">Student</th><th>Drive</th><th>Company</th><th class="text-end pe-4">Action</th></tr></thead>
                            <tbody>
                                <tr v-for="app in filteredApplications" :key="app.id">
                                    <td class="ps-4 fw-bold text-primary">{{ app.student_name }}</td>
                                    <td>{{ app.drive_title }}</td>
                                    <td>{{ app.company_name }}</td>
                                    <td class="text-end pe-4"><button @click="viewStudent(app.student_id)" class="btn btn-outline-dark btn-sm">View Profile</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- ── SETTINGS TAB ── -->
                <div v-if="currentTab === 'settings'">
                    <h3 class="fw-bold text-dark mb-4">Portal Settings</h3>

                    <div class="card shadow-sm border-0 mb-4">
                        <div class="card-header bg-white d-flex align-items-center gap-2 py-3 border-bottom">
                            <span style="font-size:1.3rem;">⏰</span>
                            <h5 class="mb-0 fw-bold">Daily Reminder Settings</h5>
                        </div>
                        <div class="card-body p-4">

                            <p class="text-muted small mb-4">
                                Celery automatically sends deadline reminder emails to eligible students every day.
                                Choose the hour at which the reminders go out. Changes take effect within the next scheduled hour —
                                no server restart required.
                            </p>

                            <div class="row align-items-end g-3">
                                <div class="col-md-4">
                                    <label class="form-label fw-semibold">Reminder Time</label>
                                    <select class="form-select" v-model.number="reminderHour">
                                        <option v-for="h in 24" :key="h - 1" :value="h - 1">{{ formatHour(h - 1) }}</option>
                                    </select>
                                    <div class="form-text">Students receive emails at this hour (IST) daily.</div>
                                </div>
                                <div class="col-md-auto">
                                    <button class="btn btn-primary px-4" @click="saveReminderSettings" :disabled="reminderSaving">
                                        <span v-if="reminderSaving" class="spinner-border spinner-border-sm me-2" role="status"></span>
                                        {{ reminderSaving ? 'Saving…' : 'Save Time' }}
                                    </button>
                                </div>
                                <div class="col-md-auto">
                                    <button class="btn btn-outline-secondary px-4" @click="triggerRemindersNow" :disabled="reminderTriggerLoading" title="Bypass the schedule and send reminders right now (for testing)">
                                        <span v-if="reminderTriggerLoading" class="spinner-border spinner-border-sm me-2" role="status"></span>
                                        {{ reminderTriggerLoading ? 'Sending…' : '▶ Send Now (Test)' }}
                                    </button>
                                </div>
                            </div>

                            <div v-if="reminderMessage" class="alert mt-3 mb-0"
                                :class="reminderMessage.toLowerCase().includes('fail') || reminderMessage.toLowerCase().includes('error') ? 'alert-danger' : 'alert-success'">
                                {{ reminderMessage }}
                            </div>

                            <div class="mt-4 p-3 rounded-3" style="background:#f8fafc; border:1px solid #e2e8f0;">
                                <p class="mb-2 small fw-semibold text-secondary">How it works</p>
                                <ul class="mb-0 small text-secondary ps-3">
                                    <li>Celery Beat checks every hour at the top of the hour.</li>
                                    <li>At your chosen time, it finds all <strong>Approved</strong> drives closing in the next <strong>3 days</strong>.</li>
                                    <li>Each eligible student who <em>has not yet applied</em> gets one consolidated reminder email listing all upcoming deadlines.</li>

                                </ul>
                            </div>

                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ── DETAIL MODAL ── -->
        <div class="modal fade" id="detailModal" tabindex="-1" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog modal-lg">
                <div class="modal-content border-0" v-if="activeDetail">
                    <div class="modal-header">
                        <h5 class="modal-title">Record Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" @click="forceCleanup"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div v-for="(val, key) in activeDetail" :key="key" class="mb-2">
                            <p v-if="!['resume_url', 'id', 'is_blacklisted', 'description', 'associated_drives'].includes(key)">
                                <strong class="text-capitalize">{{ key.replace('_', ' ') }}:</strong> {{ val }}
                            </p>
                        </div>
                        <div v-if="activeDetail.description" class="mt-3 p-3 bg-light rounded border">
                            <strong class="d-block mb-1">Drive Description:</strong>
                            <p class="mb-0 text-secondary" style="white-space: pre-wrap;">{{ activeDetail.description }}</p>
                        </div>
                        <div v-if="activeDetail.associated_drives && activeDetail.associated_drives.length" class="mt-4 border-top pt-3">
                            <h6 class="fw-bold text-primary mb-3">Associated Placement Drives</h6>
                            <div class="list-group">
                                <div v-for="d in activeDetail.associated_drives" :key="d.id" class="list-group-item d-flex justify-content-between align-items-center">
                                    <span>{{ d.title }} <small class="text-muted">({{ d.status }})</small></span>
                                    <button @click="viewDriveDetails(d)" class="btn btn-sm btn-outline-info">View Details</button>
                                </div>
                            </div>
                        </div>
                        <div v-if="activeDetail.resume_url" class="mt-3 border-top pt-3">
                            <strong class="d-block mb-2">Resume:</strong>
                            <div class="mb-3">
                                <a :href="resumeDownloadUrl(activeDetail.resume_url)" download target="_blank" class="btn btn-sm btn-outline-primary">
                                    ⬇ Download Resume
                                </a>
                            </div>
                            <iframe :src="resumeEmbedUrl(activeDetail.resume_url)"
                                style="width:100%; height:500px; border:1px solid #dee2e6; border-radius:6px;"
                                title="Student Resume"
                                allow="fullscreen">
                            </iframe>
                        </div>
                        <div v-else-if="activeDetail.hasOwnProperty('resume_url')" class="mt-3 border-top pt-3 text-muted small">
                            <em>No resume uploaded by this student.</em>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="forceCleanup">Close</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── NOTIFY MODAL ── -->
        <div class="modal fade" id="notifyModal" tabindex="-1" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog">
                <div class="modal-content border-0">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Message to Company</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" @click="forceCleanup"></button>
                    </div>
                    <div class="modal-body"><textarea v-model="adminToCompanyMsg" class="form-control" rows="5"></textarea></div>
                    <div class="modal-footer"><button @click="sendNotification" class="btn btn-primary w-100">Send</button></div>
                </div>
            </div>
        </div>

        <!-- ── NOTIFY STUDENT MODAL ── -->
        <div class="modal fade" id="notifyStudentModal" tabindex="-1" style="background: rgba(0,0,0,0.5);">
            <div class="modal-dialog">
                <div class="modal-content border-0">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title">Message to Student</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" @click="forceCleanup"></button>
                    </div>
                    <div class="modal-body"><textarea v-model="adminToStudentMsg" class="form-control" rows="5"></textarea></div>
                    <div class="modal-footer"><button @click="sendStudentNotification" class="btn btn-primary w-100">Send</button></div>
                </div>
            </div>
        </div>

    </div>`,

    data() {
        return {
            currentTab: 'companies',
            companySearch: '', studentSearch: '', driveSearch: '', appSearch: '',
            students: [], companies: [], drives: [], notifications: [], studentApplications: [],
            activeDetail: null, notifyTarget: {}, adminToCompanyMsg: '',
            notifyStudentTarget: {}, adminToStudentMsg: '',
            stats: { total_students: 0, total_companies: 0, total_drives: 0 },
            // Reminder settings
            reminderHour: 8,
            reminderSaving: false,
            reminderTriggerLoading: false,
            reminderMessage: ''
        };
    },

    computed: {
        pendingCompanies() {
            return this.companies.filter(c =>
                (c.approval_status || '').toLowerCase() === 'pending' && !c.is_blacklisted
            );
        },
        approvedCompanies() {
            return this.companies.filter(c => {
                const isApproved = (c.approval_status || '').toLowerCase() === 'approved';
                const isNotBlacklisted = !c.is_blacklisted || c.is_blacklisted == 0;
                const matchesSearch = c.company_name.toLowerCase().includes(this.companySearch.toLowerCase());
                return isApproved && isNotBlacklisted && matchesSearch;
            });
        },
        blacklistedCompanies() {
            return this.companies.filter(c => c.is_blacklisted == 1 || (c.approval_status || '').toLowerCase() === 'rejected');
        },
        blacklistedStudents() {
            return this.students.filter(s => s.is_blacklisted == 1);
        },
        filteredActiveStudents() {
            return this.students.filter(s =>
                // Ensure we handle null/undefined/0 as "not blacklisted"
                !s.is_blacklisted &&
                s.name.toLowerCase().includes(this.studentSearch.toLowerCase())
            );
        },
        filteredActiveDrives() {
            // The Admin must see 'Pending' drives to approve them!
            return this.drives.filter(d =>
                d.status !== 'Completed' && // Only hide finished ones
                (
                    d.title.toLowerCase().includes(this.driveSearch.toLowerCase()) ||
                    d.company.toLowerCase().includes(this.driveSearch.toLowerCase())
                )
            );
        },
        filteredApplications() {
            return this.studentApplications.filter(a =>
                a.student_name.toLowerCase().includes(this.appSearch.toLowerCase()) ||
                a.drive_title.toLowerCase().includes(this.appSearch.toLowerCase())
            );
        },
        unreadCount() {
            return (this.notifications || []).filter(n => !n.is_read).length;
        }
    },

    mounted() {
        this.fetchAllData();
        this.fetchStats();
        this.fetchReminderSettings();
    },

    methods: {

        // ── UTILITY ──────────────────────────────────────────────────────────

        token() {
            return localStorage.getItem('auth_token');
        },

        resumeEmbedUrl(url) {
            if (!url) return '';
            const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
            if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
            return url;
        },

        resumeDownloadUrl(url) {
            if (!url) return '';
            const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
            if (driveMatch) return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
            return url;
        },

        formatHour(h) {
            const d = new Date();
            d.setHours(h, 0, 0);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        },

        openModal(id) {
            this.forceCleanup();
            const modalEl = document.getElementById(id);
            const modalObj = new bootstrap.Modal(modalEl, { backdrop: false });
            modalObj.show();
        },

        forceCleanup() {
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
            document.body.classList.remove('modal-open');
            document.body.removeAttribute('style');
        },

        // ── DATA FETCHING ─────────────────────────────────────────────────────

        async fetchAllData() {
            const token = localStorage.getItem('auth_token');
            const res = await Promise.all([
                fetch('/api/students', { headers: { 'Authentication-Token': token } }),
                fetch('/api/companies', { headers: { 'Authentication-Token': token } }),
                fetch('/api/drives', { headers: { 'Authentication-Token': token } }),
                fetch('/api/admin/applications', { headers: { 'Authentication-Token': token } }),
                fetch('/api/admin/notifications', { headers: { 'Authentication-Token': token } })
            ]);
            if (res[0].ok) this.students = await res[0].json();
            if (res[1].ok) this.companies = await res[1].json();
            if (res[2].ok) this.drives = await res[2].json();
            if (res[3].ok) this.studentApplications = await res[3].json();
            if (res[4].ok) this.notifications = await res[4].json();
        },

        async fetchStats() {
            const res = await fetch('/api/admin/stats', {
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (res.ok) this.stats = await res.json();
        },

        // ── NOTIFICATIONS ─────────────────────────────────────────────────────

        async markNotificationsRead() {
            if (this.unreadCount === 0) return;
            try {
                const res = await fetch('/api/notifications/read', {
                    method: 'POST',
                    headers: {
                        'Authentication-Token': localStorage.getItem('auth_token'),
                        'Content-Type': 'application/json'
                    }
                });
                if (res.ok) this.notifications.forEach(n => n.is_read = true);
            } catch (err) {
                console.error('Failed to sync notification status:', err);
            }
        },

        // ── STUDENTS ──────────────────────────────────────────────────────────

        async viewStudent(id) {
            const res = await fetch(`/api/students/${id}`, {
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (res.ok) {
                this.activeDetail = await res.json();
                this.openModal('detailModal');
            }
        },

        async blacklistStudent(id) {
            if (confirm('Blacklist this student?')) {
                await fetch(`/api/students/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
                });
                this.fetchAllData();
                this.fetchStats();
            }
        },

        async whitelistStudent(id) {
            await fetch(`/api/students/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({ action: 'whitelist' })
            });
            this.fetchAllData();
            this.fetchStats();
        },

        // ── COMPANIES ─────────────────────────────────────────────────────────

        async viewCompany(company) {
            const res = await fetch(`/api/companies/${company.id}`, {
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (res.ok) {
                const data = await res.json();
                data.associated_drives = this.drives.filter(d => d.company === company.company_name);
                this.activeDetail = data;
                this.openModal('detailModal');
            }
        },

        async updateCompanyStatus(id, action) {
            await fetch(`/api/companies/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({ action })
            });
            this.fetchAllData();
            this.fetchStats();
        },

        async blacklistCompany(id) {
            if (confirm('Blacklist this company? All their drives will also be hidden.')) {
                const res = await fetch(`/api/companies/${id}`, { // Note the S in companies
                    method: 'DELETE',
                    headers: { 'Authentication-Token': this.token() }
                });
                if (res.ok) {
                    await this.fetchAllData(); // Refresh lists
                    await this.fetchStats();    // Refresh top cards
                }
            }
        },

        openNotifyModal(company) {
            this.notifyTarget = company;
            this.openModal('notifyModal');
        },

        openNotifyStudentModal(student) {
            this.notifyStudentTarget = student;
            this.adminToStudentMsg = '';
            this.openModal('notifyStudentModal');
        },
        isCompanyBlacklisted(companyName) {
            const comp = this.companies.find(c => c.company_name === companyName);
            return comp && (comp.is_blacklisted == 1 || comp.approval_status === 'Rejected');
        },

        async sendNotification() {
            const res = await fetch('/api/admin/notify_company', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({ company_id: this.notifyTarget.id, message: this.adminToCompanyMsg })
            });
            if (res.ok) {
                alert('Message sent!');
                this.forceCleanup();
                location.reload();
            }
        },

        async sendStudentNotification() {
            const res = await fetch('/api/admin/notify_student', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify({ student_id: this.notifyStudentTarget.id, message: this.adminToStudentMsg })
            });
            if (res.ok) {
                alert('Message sent!');
                this.forceCleanup();
                this.adminToStudentMsg = '';
            }
        },
        // Inside the methods: { ... } block of AdminDashboard
        async triggerMonthlyReport() {
            if (!confirm("Send the monthly activity report to the administrator email now?")) return;

            try {
                const res = await fetch('/api/admin/trigger-monthly-report', {
                    method: 'POST',
                    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || "Monthly report queued successfully!");
                } else {
                    alert("Error: " + data.message);
                }
            } catch (err) {
                alert("Failed to connect to the server.");
            }
        },

        // ── DRIVES ────────────────────────────────────────────────────────────

        viewDriveDetails(drive) {
            this.activeDetail = { ...drive };
            this.openModal('detailModal');
        },

        async updateDriveStatus(id, action) {
            try {
                const res = await fetch(`/api/drives/${id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ action })
                });
                const data = await res.json();
                if (res.ok) {
                    await this.fetchAllData();
                    await this.fetchStats();
                    this.forceCleanup();
                } else {
                    alert('Error: ' + (data.message || 'Unknown server error'));
                }
            } catch (err) {
                console.error(err);
                alert('Network Error: Could not connect to server');
            }
        },

        async approveDrive(id) {
            await this.updateDriveStatus(id, 'approve');
        },

        async rejectDrive(id) {
            if (confirm('Reject this drive?')) {
                await this.updateDriveStatus(id, 'reject');
            }
        },

        async blacklistDrive(id) {
            if (confirm('Blacklist this drive? Students will no longer be able to see or apply to it.')) {
                await this.updateDriveStatus(id, 'blacklist');
            }
        },

        async restoreDrive(id) {
            // 1. Find the drive object in your local data
            const drive = this.drives.find(d => d.id === id);

            // 2. Find the company object in your local data to check its status
            const company = this.companies.find(c => c.company_name === drive.company);

            // 3. Prevent restoration if the company is blacklisted
            if (company && (company.is_blacklisted == 1 || (company.approval_status || '').toLowerCase() === 'rejected')) {
                alert(`Action Denied: You cannot restore this drive because "${drive.company}" is blacklisted or rejected. Restore the company first.`);
                return;
            }

            if (confirm('Restore this drive? It will become visible to students again.')) {
                await this.updateDriveStatus(id, 'restore');
            }
        },

        // ── CSV EXPORT ────────────────────────────────────────────────────────

        async downloadCSV() {
            try {
                const res = await fetch('/api/admin/export-report', {
                    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
                });
                if (!res.ok) throw new Error('Failed to download report');
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'placement_report.csv');
                document.body.appendChild(link);
                link.click();
                link.parentNode.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (err) {
                alert('Error downloading CSV: ' + err.message);
            }
        },

        // ── REMINDER SETTINGS ─────────────────────────────────────────────────

        async fetchReminderSettings() {
            try {
                const res = await fetch('/api/admin/reminder-settings', {
                    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
                });
                if (res.ok) {
                    const data = await res.json();
                    this.reminderHour = data.reminder_hour;
                }
            } catch (e) {
                console.error('Could not load reminder settings', e);
            }
        },

        async saveReminderSettings() {
            this.reminderSaving = true;
            this.reminderMessage = '';
            try {
                const res = await fetch('/api/admin/reminder-settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('auth_token')
                    },
                    body: JSON.stringify({ hour: parseInt(this.reminderHour) })
                });
                const data = await res.json();
                this.reminderMessage = data.message;
            } catch (e) {
                this.reminderMessage = 'Failed to save settings. Please try again.';
            } finally {
                this.reminderSaving = false;
            }
        },

        async triggerRemindersNow() {
            this.reminderTriggerLoading = true;
            this.reminderMessage = '';
            try {
                const res = await fetch('/api/admin/trigger-reminders', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': localStorage.getItem('auth_token')
                    }
                });
                const data = await res.json();
                this.reminderMessage = data.message;
            } catch (e) {
                this.reminderMessage = 'Trigger failed. Is Celery worker running?';
            } finally {
                this.reminderTriggerLoading = false;
            }
        },

        // ── AUTH ──────────────────────────────────────────────────────────────

        handleLogout() {
            localStorage.clear();
            window.location.href = '#/login';
        }
    }
};
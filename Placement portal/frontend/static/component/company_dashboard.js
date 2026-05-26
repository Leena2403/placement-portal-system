// frontend/static/component/company_dashboard.js
const CompanyDashboard = {
    template: `
    <div class="company-dashboard" style="background-color: #f8f9fa; min-height: 100vh;">
        
        <nav class="navbar navbar-expand-lg navbar-dark mb-4 shadow" style="background-color: #4B0082; position: relative; z-index: 2000;">
            <div class="container">
                <span class="navbar-brand fw-bold">Company Command Center</span>
                <div class="ms-auto d-flex align-items-center">
                    
                    <div class="dropdown me-3">
                        <button @click="markNotifsRead" class="btn btn-outline-light position-relative border-0 shadow-none" id="compNotifBell" data-bs-toggle="dropdown">
                            <span style="font-size: 1.2rem;">🔔</span>
                            <span v-if="unreadCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                {{ unreadCount }}
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-lg p-0" style="width: 320px; max-height: 400px; overflow-y: auto;">
                            <li class="dropdown-header bg-light fw-bold py-3 border-bottom">System Notifications</li>
                            <li v-for="note in notifications" :key="note.id" class="dropdown-item border-bottom py-3" style="white-space: normal;">
                                <p class="mb-1 small text-dark fw-medium">{{ note.message }}</p>
                                <small class="text-muted" style="font-size: 0.7rem;">{{ note.created_at }}</small>
                            </li>
                            <li v-if="notifications.length === 0" class="text-center py-4 text-muted small">No messages found.</li>
                        </ul>
                    </div>
                    
                    <button @click="handleLogout" class="btn btn-light btn-sm fw-bold px-3">Logout</button>
                </div>
            </div>
        </nav>

        <div class="container pb-5">
            <div v-if="isBlacklisted" class="row justify-content-center mt-5">
                <div class="col-md-8 text-center">
                    <div class="card border-danger shadow-lg p-5 bg-white">
                        <div class="mb-4">
                            <span style="font-size: 5rem;">🚫</span>
                        </div>
                        <h1 class="display-5 fw-bold text-danger mb-3">Account Restricted</h1>
                        <p class="lead text-dark">Your company profile has been blacklisted by the Administrator.</p>
                        <hr class="my-4">
                        
                        <div class="text-start">
                            <label class="form-label fw-bold text-muted small">APPEAL TO ADMINISTRATION</label>
                            <textarea v-model="adminMsg" class="form-control mb-3" rows="4" 
                                placeholder="State your reason for reinstatement..."></textarea>
                            <button @click="sendMessageToAdmin" class="btn btn-danger w-100 fw-bold py-2 shadow-sm">
                                Submit Appeal
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else>
                <div class="card border-0 shadow-sm mb-4 bg-dark text-white">
                    <div class="card-body p-4 d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="text-uppercase small fw-bold opacity-75 mb-1">Corporate Profile</h6>
                            <h2 class="fw-bold mb-0">{{ companyProfile.company_name }}</h2>
                            <p class="mb-0 small opacity-75">{{ companyProfile.email }}</p>
                        </div>
                        <div class="text-end">
                            <span class="badge px-4 py-2 rounded-pill bg-success fw-bold shadow-sm">ACTIVE PARTNER</span>
                            <div class="mt-2 small opacity-75">Status: {{ companyProfile.approval_status }}</div>
                        </div>
                    </div>
                </div>

                <ul class="nav nav-tabs mb-4 border-0 shadow-sm bg-white rounded p-1">
                    <li class="nav-item">
                        <button class="nav-link fw-bold px-4" :class="{active: activeTab === 'active'}" @click="activeTab = 'active'">
                            Current Recruitment Drives
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link fw-bold px-4" :class="{active: activeTab === 'closed'}" @click="activeTab = 'closed'">
                            Archived / Closed Drives
                        </button>
                    </li>
                </ul>

                <div v-if="activeTab === 'active'">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h4 class="fw-bold text-dark mb-0">Live & Pending Opportunities</h4>
                        <button v-if="companyProfile.approval_status === 'Approved'" class="btn btn-primary fw-bold shadow-sm px-4" @click="openCreateModal">+ Create New Drive</button>
                        <span v-else class="badge bg-warning text-dark p-2 shadow-sm">
                            Drive creation disabled until Admin approval
                        </span>
                    </div>
                    
                    <div class="row g-4">
                        <div v-for="drive in activeDrivesList" :key="drive.id" class="col-md-6 col-lg-4">
                            <div class="card h-100 shadow-sm border-0 border-top border-4 transition-hover" 
                                 :class="drive.status === 'Approved' ? 'border-primary' : 'border-warning'">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="fw-bold text-dark mb-1">
                                        <span @click="openViewDetails(drive)" class="hover-link">{{ drive.title }}</span>
                                    </h5>
                                    <span class="badge align-self-start mb-3" :class="statusBadgeClass(drive.status)">{{ drive.status }}</span>
                                    
                                    <div class="bg-light rounded p-3 mb-3 text-center border">
                                        <h2 class="fw-bold text-primary mb-0">{{ drive.applicant_count || 0 }}</h2>
                                        <small class="text-muted fw-bold text-uppercase">Applicants</small>
                                    </div>
                                    
                                    <div class="mt-auto d-flex gap-2 pt-3 border-top">
                                        <button @click="openViewDetails(drive)" class="btn btn-dark btn-sm flex-grow-1 fw-bold shadow-sm">Manage Applications</button>
                                        <button @click="openEditModal(drive)" class="btn btn-outline-primary btn-sm fw-bold">Update</button>
                                    </div>

                                </div>
                            </div>
                        </div>
                        <div v-if="activeDrivesList.length === 0" class="text-center py-5 bg-white rounded shadow-sm w-100">
                            <p class="text-muted mb-0">No active placement drives found.</p>
                        </div>
                    </div>
                </div>

                <div v-if="activeTab === 'closed'">
                    <div class="bg-white shadow-sm rounded border overflow-hidden">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4 py-3">Drive Title</th>
                                    <th class="text-center">Total Applicants</th>
                                    <th class="text-center">Final Status</th>
                                    <th class="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="drive in closedDrivesList" :key="drive.id">
                                    <td class="ps-4 fw-bold text-muted">{{ drive.title }}</td>
                                    <td class="text-center fw-bold">{{ drive.applicant_count || 0 }}</td>
                                    <td class="text-center"><span class="badge bg-secondary px-3">Completed</span></td>
                                    <td class="text-end pe-4">
                                        <button @click="openViewDetails(drive)" class="btn btn-sm btn-outline-dark fw-bold">View Summary</button>
                                    </td>
                                </tr>
                                <tr v-if="closedDrivesList.length === 0">
                                    <td colspan="4" class="text-center py-5 text-muted italic">No archived drives available.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <div class="modal fade" id="createDriveModal" tabindex="-1" ref="createModal">
            <div class="modal-dialog modal-lg shadow">
                <div class="modal-content border-0">
                    <div class="modal-header bg-primary text-white border-0">
                        <h5 class="modal-title fw-bold">Post New Placement Drive</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <form @submit.prevent="createDrive">
                            <div class="mb-3">
                                <label class="form-label fw-bold small text-muted">JOB TITLE</label>
                                <input type="text" v-model="newDrive.title" class="form-control" placeholder="e.g. Senior Data Scientist" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label fw-bold small text-muted">JOB DESCRIPTION</label>
                                <textarea v-model="newDrive.description" class="form-control" rows="5" placeholder="Responsibilities, Requirements, Benefits..." required></textarea>
                            </div>
                            <div class="row g-3 mb-3">
                                <div class="col-md-4">
                                    <label class="form-label small fw-bold text-muted">MIN CGPA</label>
                                    <input type="number" step="0.1" v-model="newDrive.min_cgpa" class="form-control" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small fw-bold text-muted">TARGET BRANCH</label>
                                    <input type="text" v-model="newDrive.eligible_branch" class="form-control" placeholder="e.g. CSE, IT" required>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label small fw-bold text-muted">GRAD YEAR</label>
                                    <input type="number" v-model="newDrive.eligible_year" class="form-control" placeholder="2026" required>
                                </div>
                            </div>
                            <div class="mb-4">
                                <label class="form-label fw-bold small text-muted">APPLICATION DEADLINE</label>
                                <input type="datetime-local" v-model="newDrive.application_deadline" class="form-control" required>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 py-3 fw-bold shadow-sm">SUBMIT DRIVE FOR APPROVAL</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>


        <div class="modal fade" id="editDriveModal" tabindex="-1">
    <div class="modal-dialog modal-lg">
        <div class="modal-content border-0 shadow">
            <div class="modal-header bg-dark text-white">
                <h5 class="modal-title fw-bold">Update Drive Details</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body p-4" v-if="editingDrive">
                <form @submit.prevent="updateDrive">
                    <div class="mb-3">
                        <label class="small fw-bold">TITLE</label>
                        <input type="text" v-model="editingDrive.title" class="form-control" required>
                    </div>
                    <div class="mb-3">
                        <label class="small fw-bold">DESCRIPTION</label>
                        <textarea v-model="editingDrive.description" class="form-control" rows="4" required></textarea>
                    </div>
                    <div class="row g-3">
                        <div class="col-6">
                            <label class="small fw-bold">MIN CGPA</label>
                            <input type="number" step="0.1" v-model="editingDrive.min_cgpa" class="form-control" required>
                        </div>
                        <div class="col-6">
                            <label class="small fw-bold">DEADLINE</label>
                            <input type="datetime-local" v-model="editingDrive.deadline" class="form-control" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary w-100 py-3 fw-bold mt-4">SAVE CHANGES</button>
                </form>
            </div>
        </div>
    </div>
</div>

        <div class="modal fade" id="viewDetailsModal" tabindex="-1" ref="viewModal">
            <div class="modal-dialog modal-xl modal-dialog-scrollable shadow">
                <div class="modal-content border-0" v-if="selectedDrive">
                    <div class="modal-header bg-light border-bottom">
                        <h5 class="modal-title fw-bold">
                            {{ focusedApplication ? 'Reviewing: ' + focusedApplication.student_name : 'Management: ' + selectedDrive.title }}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <div class="container-fluid">
                            <div class="row">
                                <div class="col-md-3 bg-light border-end p-4" v-if="!focusedApplication">
                                    <h6 class="fw-bold text-uppercase text-muted small mb-3">Drive Parameters</h6>
                                    <div class="bg-white p-3 rounded border mb-3">
                                        <p class="small text-dark mb-0" style="white-space: pre-wrap;">{{ selectedDrive.description }}</p>
                                    </div>
                                    <div class="small">
                                        <p class="mb-1"><strong>Branch:</strong> {{ selectedDrive.eligible_branch }}</p>
                                        <p class="mb-1"><strong>Year:</strong> {{ selectedDrive.eligible_year }}</p>
                                        <p class="mb-1 text-danger"><strong>Deadline:</strong> {{ formatDate(selectedDrive.deadline) }}</p>
                                    </div>
                                </div>

                                <div :class="focusedApplication ? 'col-12 p-4' : 'col-md-9 p-4'">
                                    
                                    <div v-if="!focusedApplication">
                                        <div class="d-flex justify-content-between align-items-center mb-4">
                                            <h5 class="fw-bold mb-0">Applicant Pool ({{ applicants.length }})</h5>
                                        </div>
                                        <div class="table-responsive">
                                            <table class="table table-hover align-middle">
                                                <thead class="table-light">
                                                    <tr>
                                                        <th>Student Name</th>
                                                        <th>CGPA</th>
                                                        <th>Current Status</th>
                                                        <th class="text-end">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr v-for="app in applicants" :key="app.id">
                                                        <td class="fw-bold">{{ app.student_name }}</td>
                                                        <td>{{ app.cgpa }}</td>
                                                        <td><span class="badge" :class="statusClass(app.status)">{{ app.status }}</span></td>
                                                        <td class="text-end">
                                                            <button @click="focusedApplication = app; actionType = null" class="btn btn-dark btn-sm px-3 fw-bold rounded-pill shadow-sm">Review File</button>
                                                        </td>
                                                    </tr>
                                                    <tr v-if="applicants.length === 0">
                                                        <td colspan="4" class="text-center py-5 text-muted italic">No students have applied yet.</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div v-else>
                                        <button @click="focusedApplication = null; actionType = null" class="btn btn-outline-secondary btn-sm mb-4 fw-bold">
                                            ← Back to Pool
                                        </button>
                                        
                                        <div class="row">
                                            <div class="col-md-5">
                                                <div class="card p-4 border-0 bg-white shadow-sm mb-4">
                                                    <h3 class="fw-bold mb-1">{{ focusedApplication.student_name }}</h3>
                                                    <p class="text-muted mb-4">{{ focusedApplication.email }} | CGPA: {{ focusedApplication.cgpa }}</p>
                                                    
                                                    <div v-if="!actionType" class="d-grid gap-2">
                                                        <button @click="actionType = 'shortlist'" class="btn btn-success fw-bold py-2 shadow-sm">Shortlist / Schedule Interview</button>
                                                        <button @click="actionType = 'select'" class="btn btn-primary fw-bold py-2 shadow-sm">✅ Mark as Selected</button>
                                                        <button @click="actionType = 'reject'" class="btn btn-danger fw-bold py-2 shadow-sm">Reject Application</button>
                                                        <button @click="updateAppStatus(focusedApplication.id, 'Waiting')" class="btn btn-warning fw-bold py-2 text-dark shadow-sm">Move to Waitlist</button>
                                                    </div>

                                                    <div v-if="actionType === 'shortlist'" class="mt-2 border-top pt-3">
                                                        <h6 class="fw-bold text-success">Schedule Interview</h6>
                                                        <div class="mb-2">
                                                            <label class="small fw-bold text-muted">TIME & DATE</label>
                                                            <input type="datetime-local" v-model="interviewForm.time" class="form-control form-control-sm">
                                                        </div>
                                                        <div class="mb-2">
                                                            <label class="small fw-bold text-muted">VENUE/MODE</label>
                                                            <select v-model="interviewForm.mode" class="form-select form-select-sm">
                                                                <option value="In-Person">In-Person Office</option>
                                                                <option value="Google Meet">Video Call (Google Meet)</option>
                                                            </select>
                                                        </div>
                                                        <div class="mb-3" v-if="interviewForm.mode === 'Google Meet'">
                                                            <label class="small fw-bold text-muted">MEETING LINK</label>
                                                            <input type="text" v-model="interviewForm.link" class="form-control form-control-sm" placeholder="https://meet.google.com/...">
                                                        </div>
                                                        <div class="d-flex gap-2 mt-3">
    <button type="button" @click="confirmShortlist" class="btn btn-success btn-sm flex-grow-1 fw-bold">
        Send to Student
    </button>
    <button type="button" @click="actionType = null" class="btn btn-light btn-sm border fw-bold">
        Cancel
    </button>
</div>
                                                    </div>

                                                    <div v-if="actionType === 'select'" class="mt-2 border-top pt-3">
                                                        <h6 class="fw-bold text-primary">Confirm Final Selection</h6>
                                                        <p class="small text-muted">This will mark the student as <strong>Selected</strong> and notify them.</p>
                                                        <div class="d-flex gap-2">
                                                            <button @click="confirmSelection" class="btn btn-primary btn-sm flex-grow-1 fw-bold">✅ Confirm Selected</button>
                                                            <button @click="actionType = null" class="btn btn-light btn-sm border fw-bold">Cancel</button>
                                                        </div>
                                                    </div>

                                                    <div v-if="actionType === 'reject'" class="mt-2 border-top pt-3">
                                                        <h6 class="fw-bold text-danger">Rejection Remarks</h6>
                                                        <textarea v-model="rejectionRemarks" class="form-control mb-3" rows="3" placeholder="Reason for rejection (e.g. CGPA mismatch)..."></textarea>
                                                        <div class="d-flex gap-2">
                                                            <button @click="confirmRejection" class="btn btn-danger btn-sm flex-grow-1 fw-bold">Confirm Reject</button>
                                                            <button @click="actionType = null" class="btn btn-light btn-sm border fw-bold">Cancel</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div class="col-md-7">
                                                <div class="d-flex justify-content-between align-items-center mb-2">
                                                    <h6 class="fw-bold mb-0">Candidate Resume</h6>
                                                    <a :href="focusedApplication.resume_url" target="_blank" class="btn btn-sm btn-outline-primary fw-bold px-3">Open Browser ↗</a>
                                                </div>
                                                <div class="ratio ratio-1x1 border rounded bg-light shadow-inner" style="height: 600px;">
                                                    <iframe :src="formatResumeUrl(focusedApplication.resume_url)" frameborder="0"></iframe>
                                                </div>
                                            </div>
                                        </div>
                                    </div> 
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`,

    data() {
        return {
            activeTab: 'active',
            isBlacklisted: false,
            adminMsg: '',
            companyProfile: {},
            myDrives: [],
            applicants: [],
            selectedDrive: null,
            focusedApplication: null,
            notifications: [],

            newDrive: {
                title: '', description: '', min_cgpa: null,
                eligible_branch: '', eligible_year: null, application_deadline: ''
            },

            createModal: null,
            viewModal: null,
            actionType: null,
            interviewForm: { time: '', mode: 'Google Meet', link: '' },
            rejectionRemarks: '',
            editingDrive: null,
            editModal: null
        }
    },

    computed: {
        activeDrivesList() {
            const now = new Date();
            return this.myDrives.filter(d => {
                const deadline = new Date(d.deadline);
                // Drive is active ONLY if:
                // Status is NOT 'Completed'
                // AND the current time is before the deadline
                return d.status !== 'Completed' && now < deadline;
            });
        },
        closedDrivesList() {
            const now = new Date();
            return this.myDrives.filter(d => {
                const deadline = new Date(d.deadline);
                // Drive is archived IF:
                // Status is 'Completed' (Manual finish)
                // OR the current time has passed the deadline (Auto finish)
                return d.status === 'Completed' || now >= deadline;
            });
        },
        unreadCount() {
            return this.notifications.filter(n => !n.is_read).length;
        }
    },

    async mounted() {
        await this.checkProfileStatus();
        if (!this.isBlacklisted) {
            this.fetchDashboardData();
            this.fetchNotifications();
            this.initModals();
        }
    },

    methods: {
        async checkProfileStatus() {
            const token = localStorage.getItem('auth_token');
            try {
                const res = await fetch('/api/companies', { headers: { 'Authentication-Token': token } });
                if (res.ok) {
                    const data = await res.json();
                    this.isBlacklisted = !!data.is_blacklisted;
                }
            } catch (err) { console.error("Blacklist check failed", err); }
        },

        async fetchDashboardData() {
            const token = localStorage.getItem('auth_token');
            const headers = { 'Authentication-Token': token };
            try {
                const [resP, resD] = await Promise.all([
                    fetch('/api/companies', { headers }),
                    fetch('/api/drives', { headers })
                ]);
                if (resP.ok) this.companyProfile = await resP.json();
                if (resD.ok) this.myDrives = await resD.json();
            } catch (err) { console.error("Sync Error", err); }
        },

        async fetchNotifications() {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/company/notifications', { headers: { 'Authentication-Token': token } });
            if (res.ok) this.notifications = await res.json();
        },

        async markNotifsRead() {
            if (this.unreadCount === 0) return;
            const token = localStorage.getItem('auth_token');
            await fetch('/api/notifications/read', { method: 'POST', headers: { 'Authentication-Token': token } });
            this.notifications.forEach(n => n.is_read = true);
        },
        // Add this inside the methods: { ... } block
        // Inside methods in company_dashboard.js

        async updateAppStatus(appId, newStatus) {
            let msg = "";
            if (newStatus === 'Waiting') {
                msg = `You have been moved to the Waitlist for ${this.selectedDrive.title}. We will reach out if a slot becomes available.`;
            }
            // Direct call to processStatusUpdate
            await this.processStatusUpdate(newStatus, msg);
        },


        initModals() {
            // Define the IDs of your modals
            const modalIds = ['createDriveModal', 'viewDetailsModal', 'editDriveModal'];

            modalIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    // Move to body ONLY if it's not already there 
                    // (Prevents duplicate backdrop issues on macOS/Chrome)
                    if (el.parentElement !== document.body) {
                        document.body.appendChild(el);
                    }

                    // Initialize the Bootstrap instance and store it in 'this'
                    // Match the naming convention used in your methods:
                    // createDriveModal -> this.createModal
                    // viewDetailsModal -> this.viewModal
                    // editDriveModal   -> this.editModal
                    const propertyName = id.replace('Drive', '').replace('Details', '').charAt(0).toLowerCase() +
                        id.replace('Drive', '').replace('Details', '').slice(1);

                    // Or more simply, set them explicitly:
                    if (id === 'createDriveModal') this.createModal = new bootstrap.Modal(el);
                    if (id === 'viewDetailsModal') this.viewModal = new bootstrap.Modal(el);
                    if (id === 'editDriveModal') this.editModal = new bootstrap.Modal(el);
                }
            });

            // Cleanup listener: Remove backdrops when a modal is hidden
            // This fixes the "Frozen Screen" bug often seen in Project 2
            document.addEventListener('hidden.bs.modal', () => {
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(b => b.remove());
                document.body.style.overflow = 'auto';
            });
        },
        async updateDrive() {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/drives/${this.editingDrive.id}/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': token
                },
                body: JSON.stringify(this.editingDrive)
            });

            if (res.ok) {
                alert("Drive updated successfully!");
                this.editModal.hide();
                await this.fetchDashboardData(); // Refresh list
            } else {
                alert("Update failed.");
            }
        },

        openCreateModal() { this.createModal.show(); },
        // Add this inside your methods block
        openEditModal(drive) {
            // We clone the drive object so the UI doesn't update until the backend confirms
            this.editingDrive = {
                ...drive,
                // Ensure the date is in the correct format for the datetime-local input
                deadline: drive.deadline ? new Date(drive.deadline).toISOString().slice(0, 16) : ''
            };
            this.editModal.show();
        },

        async openViewDetails(drive) {
            this.selectedDrive = drive;
            this.focusedApplication = null;
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`/api/drives/${drive.id}/applicants`, { headers: { 'Authentication-Token': token } });
            if (res.ok) {
                this.applicants = await res.json();
                this.viewModal.show();
            }
        },

        async createDrive() {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/company/drives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': token },
                body: JSON.stringify(this.newDrive)
            });
            if (res.ok) {
                alert("Posted! Awaiting Admin approval.");
                this.createModal.hide();
                this.fetchDashboardData();
                this.newDrive = { title: '', description: '', min_cgpa: null, eligible_branch: '', eligible_year: null, application_deadline: '' };
            }
        },

        async markAsComplete(driveId) {
            if (!confirm("Are you sure you want to close this drive?")) return;

            const token = localStorage.getItem('auth_token');
            try {
                const res = await fetch(`/api/drives/${driveId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': token
                    },
                    // This must be 'complete' (lowercase) to match the Python check
                    body: JSON.stringify({ action: 'complete' })
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log("Success:", data.message);

                    // Refresh local data so the Computed Properties move the drive
                    await this.fetchDashboardData();
                    alert("Drive archived successfully!");
                } else {
                    const errorData = await res.json();
                    console.error("Backend Error:", errorData.message);
                    alert("Error: " + errorData.message);
                }
            } catch (err) {
                console.error("Network/Connection Error:", err);
                alert("Could not reach the server. Is Redis running?");
            }
        },

        async confirmShortlist() {
    if (!this.interviewForm.time) return alert("Please select an interview time.");
    
    const driveTitle = this.selectedDrive.title;
    const companyName = this.companyProfile.company_name;
    const mode = this.interviewForm.mode; // 'In-Person' or 'Google Meet'
    const link = this.interviewForm.link;

    //  make sure to include "In-person" or the link in the message string
    let msg = `${companyName} (${driveTitle}): Shortlisted! `;
    msg += `Date: ${new Date(this.interviewForm.time).toLocaleString()}. `;
    msg += `Mode: ${mode}. `;
    if (mode === 'Google Meet' && link) msg += `Link: ${link}`;

    await this.processStatusUpdate('Shortlisted', msg);
    this.interviewForm = { time: '', mode: 'Google Meet', link: '' };
},

        async confirmRejection() {
            if (!this.rejectionRemarks) return alert("Remarks required.");
            await this.processStatusUpdate('Rejected', `Application Status: Rejected. Reason: ${this.rejectionRemarks}`);
        },

        async confirmSelection() {
            const companyName = this.selectedDrive?.company_name || 'the company';
            const driveTitle  = this.selectedDrive?.title || 'the drive';
            const msg = `Congratulations! You have been Selected by ${companyName} for ${driveTitle}. Welcome aboard!`;
            await this.processStatusUpdate('Selected', msg);
        },

        async processStatusUpdate(status, customMessage) {
            const token = localStorage.getItem('auth_token');
            try {
                const res = await fetch(`/api/applications/${this.focusedApplication.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authentication-Token': token
                    },
                    body: JSON.stringify({
                        status: status,
                        notification_msg: customMessage
                    })
                });

                if (res.ok) {
                    alert(`Application updated to ${status}`);
                    this.actionType = null;
                    // This is the key: Reset focusedApplication to null so the view goes back to the table
                    this.focusedApplication = null;
                    // Re-fetch the applicant list to show the new status badge
                    await this.openViewDetails(this.selectedDrive);
                } else {
                    const err = await res.json();
                    alert("Error: " + err.message);
                }
            } catch (error) {
                console.error("Update failed:", error);
                alert("Server connection failed.");
            }
        },

        async sendMessageToAdmin() {
            if (!this.adminMsg) return;
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/contact_admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authentication-Token': token },
                body: JSON.stringify({ message: this.adminMsg })
            });
            if (res.ok) { alert("Sent!"); this.adminMsg = ''; }
        },

        statusBadgeClass(s) {
            if (s === 'Approved') return 'bg-success';
            if (s === 'Pending') return 'bg-warning text-dark';
            return 'bg-danger';
        },

        statusClass(s) {
            return {
                'bg-success': s === 'Shortlisted',
                'bg-primary': s === 'Selected',
                'bg-warning text-dark': s === 'Waiting' || s === 'Applied',
                'bg-danger': s === 'Rejected'
            };
        },

        formatResumeUrl(url) {
            if (!url) return '';
            // If it's already a preview link, return as is
            if (url.includes('/preview')) return url;

            // Check if it's a standard Google Drive link
            if (url.includes('drive.google.com')) {
                // This regex handles various formats and converts them to /preview
                return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
            }
            return url;
        },

        formatDate(d) {
            if (!d || d === 'None') return 'N/A';
            return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        },

        handleLogout() {
            localStorage.clear();
            this.$router.push('/login');
        }
    }
};
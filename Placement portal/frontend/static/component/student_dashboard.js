// frontend/static/component/student_dashboard.js

const StudentDashboard = {
    template: `
    <div class="student-dashboard-wrapper" style="background-color: #f4f7f6; min-height: 100vh;">
        <style>
            .student-dashboard-wrapper .dropdown-menu { z-index: 3000 !important; }
            .student-dashboard-wrapper .sticky-top { z-index: 1020; }
            .hover-link { cursor: pointer !important; transition: all 0.2s ease; display: inline-block; }
            .hover-link:hover { color: #0056b3 !important; text-decoration: underline !important; }
            .transition-hover:hover { transform: translateY(-5px); transition: all 0.3s ease; }
            .modal-backdrop { z-index: 1040 !important; }
            .modal { z-index: 1050 !important; }
            .card-stats { border-radius: 15px; border: none; transition: 0.3s; }
            .search-bar { border-radius: 20px; padding-left: 45px; }
            .company-drive-item { border-left: 4px solid #009ac4; background: #f8f9fa; margin-bottom: 10px; transition: 0.2s; }
            .company-drive-item:hover { background: #f0f2f5; }
            .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); }
            .company-card { transition: all 0.2s ease; border-left: 4px solid #009ac4; }
            .company-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important; }
        </style>

        <nav class="navbar navbar-expand-lg navbar-light mb-0 shadow-sm" style="background-color: #009ac4; position: relative; z-index: 2000;">
            <div class="container">
                <span class="navbar-brand fw-bold text-white">Welcome, {{ displayName }}</span>
                <div class="ms-auto d-flex align-items-center">
                    <div class="dropdown me-3">
                        <button @click="markNotificationsRead" class="btn btn-outline-light position-relative border-0 shadow-none" id="notifBell" data-bs-toggle="dropdown">
                            <span style="font-size: 1.3rem;">🔔</span>
                            <span v-if="unreadCount > 0" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                                {{ unreadCount }}
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow-lg p-0" style="width: 350px; max-height: 450px; overflow-y: auto;">
                            <li class="dropdown-header bg-light fw-bold py-3 border-bottom text-dark text-center">Your Mailbox</li>
                            <li v-for="note in notifications" :key="note.id" class="dropdown-item border-bottom py-3" style="white-space: normal;">
                                <div class="d-flex flex-column">
                                    <p class="mb-1 small text-dark fw-medium">{{ note.message }}</p>
                                    <small class="text-muted" style="font-size: 0.7rem;">{{ note.created_at }}</small>
                                </div>
                            </li>
                            <li v-if="notifications.length === 0" class="text-center py-5 text-muted small italic">No new messages.</li>
                        </ul>
                    </div>
                    <div class="d-flex gap-2">
                        <button @click="openEditModal" class="btn btn-outline-light btn-sm fw-bold px-3">Edit Profile</button>
                        <button @click="openHistoryModal" class="btn btn-outline-light btn-sm fw-bold px-3">History</button>
                        <button @click="handleLogout" class="btn btn-light btn-sm px-4 fw-bold text-primary shadow-sm">Logout</button>
                    </div>
                </div>
            </div>
        </nav>

        <div class="container pb-5">

            <!-- ── BLACKLISTED VIEW ── -->
            <div v-if="isBlacklisted" class="row justify-content-center mt-5">
                <div class="col-md-8 text-center">
                    <div class="card border-danger shadow-lg p-5 bg-white">
                        <div class="mb-4"><span style="font-size: 5rem;">🚫</span></div>
                        <h1 class="display-5 fw-bold text-danger mb-3">Account Restricted</h1>
                        <p class="lead text-dark">Your student profile has been blacklisted by the Administrator. You cannot apply for drives or view placement data at this time.</p>
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

            <!-- ── NORMAL DASHBOARD ── -->
            <div v-else>

                <!-- Stats Row -->
                <div class="bg-white border rounded py-4 px-3 mb-4 mt-4 shadow-sm">
                    <div class="row g-3 text-center">
                        <div class="col-md-4">
                            <div class="card card-stats bg-light p-3 shadow-sm transition-hover">
                                <h6 class="text-uppercase text-muted small fw-bold mb-1">Active Applications</h6>
                                <h2 class="fw-bold text-dark mb-0">{{ stats.total_applied }}</h2>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card card-stats bg-success text-white p-3 shadow-sm transition-hover border-start border-white border-4">
                                <h6 class="text-uppercase small fw-bold opacity-75 mb-1">Shortlisted</h6>
                                <h2 class="fw-bold mb-0">{{ stats.total_shortlisted }}</h2>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="card card-stats bg-primary text-white p-3 shadow-sm transition-hover border-start border-white border-4">
                                <h6 class="text-uppercase small fw-bold opacity-75 mb-1">New Opportunities</h6>
                                <h2 class="fw-bold mb-0">{{ stats.total_active_drives }}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Bar -->
                <div class="row align-items-center bg-white p-2 px-3 rounded shadow-sm border mb-4 sticky-top" style="top: 10px; z-index: 1000;">
                    <div class="col-auto">
                        <div class="nav nav-pills gap-2 flex-nowrap">
                            <button class="nav-link fw-bold px-3" :class="{active: currentTab === 'drives'}" @click="currentTab = 'drives'">Available Drives</button>
                            <button class="nav-link fw-bold px-3" :class="{active: currentTab === 'applications'}" @click="currentTab = 'applications'">Active Tracking</button>
                            <button class="nav-link fw-bold px-3" :class="{active: currentTab === 'companies'}" @click="currentTab = 'companies'">Companies</button>
                            <button @click="triggerExport" class="btn btn-outline-primary btn-sm fw-bold px-3 shadow-sm transition-hover border-0">
                                <span class="me-1">📥</span> Download CSV
                            </button>
                        </div>
                    </div>

                    <div class="col ms-auto" style="max-width: 300px;">
                        <div class="input-group input-group-sm">
                            <span class="input-group-text bg-white border-end-0 text-muted">🔍</span>
                            <input type="text" v-model="searchQuery" class="form-control border-start-0 shadow-none"
                                :placeholder="currentTab === 'drives' ? 'Search roles...' : currentTab === 'companies' ? 'Search...' : 'Search apps...'">
                        </div>
                    </div>
                </div>

                <!-- ── DRIVES TAB ── -->
                <div v-if="currentTab === 'drives'">
                    <div class="row g-4">
                        <div v-for="drive in finalFilteredDrives" :key="drive.id" class="col-md-6 col-lg-4">
                            <div class="card h-100 shadow-sm border-0 border-top border-4 border-info transition-hover">
                                <div class="card-body d-flex flex-column">
                                    <h5 class="card-title fw-bold text-dark mb-1">
                                        <span @click="showDriveDetails(drive)" class="hover-link">{{ drive.title }}</span>
                                    </h5>
                                    <h6 @click="viewCompanyDrives(drive.company)" class="text-primary mb-3 fw-bold hover-link">{{ drive.company }}</h6>
                                    <div class="pt-2 flex-grow-1 border-top small">
                                        <p class="mb-1"><strong>Eligibility:</strong> {{ drive.min_cgpa }} CGPA</p>
                                        <p class="mb-1"><strong>Target:</strong> {{ drive.eligible_branch }}</p>
                                        <p class="mb-3 text-danger fw-bold"><strong>Deadline:</strong> {{ formatDate(drive.deadline) }}</p>
                                    </div>
                                    <div class="d-flex gap-2">
                                        <button @click="showDriveDetails(drive)" class="btn btn-outline-secondary btn-sm flex-grow-1 fw-bold">Details</button>
                                        <button @click="applyToDrive(drive.id)" 
                                                class="btn btn-primary btn-sm flex-grow-1 fw-bold"
                                                :disabled="!isEligible(drive)">
                                            {{ isEligible(drive) ? 'Apply Now' : 'Ineligible' }}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div v-if="finalFilteredDrives.length === 0" class="text-center p-5 text-muted w-100 bg-white rounded shadow-sm border">
                            <p class="mb-0 fs-5">No active drives match your profile or search.</p>
                        </div>
                    </div>
                </div>

                <!-- ── APPLICATIONS TAB ── -->
                <div v-if="currentTab === 'applications'">
                    <div class="table-responsive bg-white shadow-sm rounded border">
                        <table class="table table-hover align-middle mb-0">
                            <thead class="table-light">
                                <tr>
                                    <th class="ps-4 py-3">Drive Title</th>
                                    <th>Organization</th>
                                    <th class="text-center">Status</th>
                                    <th class="text-end pe-4">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in filteredActiveApplications" :key="app.id">
                                    <td class="ps-4">
                                        <span @click="openDriveFromApp(app)" class="fw-bold text-dark hover-link">{{ app.title }}</span>
                                    </td>
                                    <td @click="viewCompanyDrives(app.company)" class="hover-link text-primary">{{ app.company }}</td>
                                    <td class="text-center">
                                        <span class="badge rounded-pill px-3 py-2 shadow-sm" :class="statusClass(app.status)">
                                            {{ app.status }}
                                        </span>
                                    </td>
                                    <td class="text-end pe-4">
                                        <button @click="viewAppStatusDetails(app)" class="btn btn-sm btn-dark fw-bold px-4 rounded-pill shadow-sm">View Updates</button>
                                    </td>
                                </tr>
                                <tr v-if="filteredActiveApplications.length === 0">
                                    <td colspan="4" class="text-center py-5 text-muted">You have no active applications at the moment.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- ── COMPANIES TAB ── -->
                <div v-if="currentTab === 'companies'">
                    <div v-if="filteredCompanies.length === 0" class="text-center p-5 bg-white rounded shadow-sm border text-muted">
                        <p class="mb-0 fs-5">No registered companies found.</p>
                    </div>
                    <div class="row g-3" v-else>
                        <div v-for="company in filteredCompanies" :key="company.id" class="col-md-6">
                            <div class="card shadow-sm border-0 company-card bg-white">
                                <div class="card-body d-flex justify-content-between align-items-center py-3 px-4">
                                    <div>
                                        <!-- Company name — click opens its drives modal -->
                                        <h5 class="fw-bold mb-1 hover-link text-dark" @click="viewCompanyDrives(company.company_name)">
                                            {{ company.company_name }}
                                        </h5>
                                        <div class="d-flex align-items-center gap-2 mt-1">
                                            <span v-if="company.is_blacklisted === true" class="badge bg-danger bg-opacity-10 text-danger border border-danger-subtle small">
                                                🚫 Blacklisted
                                            </span>
                                            <span v-else class="badge bg-success bg-opacity-10 text-success border border-success-subtle small">
                                                ✓ Verified Partner
                                            </span>
                                            
                                            <span class="text-muted small">
                                                {{ activeDriveCount(company.company_name) }} active drive{{ activeDriveCount(company.company_name) !== 1 ? 's' : '' }}
                                            </span>
                                        </div>
                                    </div>
                                    <button @click="viewCompanyDrives(company.company_name)" class="btn btn-outline-primary btn-sm fw-bold px-4">
                                        View Drives
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- ── COMPANY DRIVES MODAL ── -->
        <div class="modal fade" id="companyViewModal" tabindex="-1">
            <div class="modal-dialog modal-lg shadow">
                <div class="modal-content border-0">
                    <div class="modal-header bg-dark text-white border-0">
                        <h5 class="modal-title fw-bold">{{ selectedCompanyName }}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-4 text-center">
                            <h2 class="fw-bold text-primary mb-1">{{ selectedCompanyName }}</h2>
                            
                            <template v-if="companies.find(c => c.company_name === selectedCompanyName)?.is_blacklisted === true">
                                <span class="badge bg-danger px-3 py-2 shadow-sm">🚫 Blacklisted</span>
                            </template>
                            <template v-else>
                                <span class="badge bg-success px-3 py-2 shadow-sm">✓ Verified Institute Partner</span>
                            </template>
                        </div>

                        <!-- No drives state -->
                        <div v-if="selectedCompanyDrives.length === 0" class="text-center py-5 text-muted">
                            <span style="font-size:2.5rem;">📭</span>
                            <p class="mt-3 mb-0">No active drives from this company right now.</p>
                        </div>

                        <div v-else>
                            <h6 class="fw-bold text-muted small text-uppercase mb-3">Active Drives ({{ selectedCompanyDrives.length }})</h6>
                            <div class="list-group border-0">
                                <div v-for="drive in selectedCompanyDrives" :key="drive.id"
                                     class="list-group-item p-3 company-drive-item rounded border shadow-sm mb-2">
                                    <div class="d-flex justify-content-between align-items-start">
                                        <div class="flex-grow-1 me-3">
                                            <h6 class="fw-bold mb-1 text-dark">{{ drive.title }}</h6>
                                            <div class="d-flex gap-3 flex-wrap">
                                                <small class="text-muted">Min CGPA: <strong>{{ drive.min_cgpa }}</strong></small>
                                                <small class="text-muted">Branch: <strong>{{ drive.eligible_branch }}</strong></small>
                                                <small class="text-danger fw-bold">{{ formatDate(drive.deadline) }}</small>
                                            </div>
                                        </div>
                                        <div class="d-flex gap-2 flex-shrink-0">
                                            <button @click="showDriveDetails(drive)" class="btn btn-sm btn-outline-secondary fw-bold">Details</button>
                                            <button v-if="isAlreadyApplied(drive.id)"
                                                    class="btn btn-sm btn-success disabled fw-bold">✓ Applied</button>
                                            <button v-else @click="applyToDrive(drive.id)"
                                                    class="btn btn-sm btn-primary fw-bold"
                                                    :disabled="!isEligible(drive)">
                                                {{ isEligible(drive) ? 'Apply' : 'Ineligible' }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── DRIVE DETAIL MODAL ── -->
        <div class="modal fade" id="companyDetailModal" tabindex="-1">
            <div class="modal-dialog modal-lg shadow">
                <div class="modal-content border-0" v-if="focusedDrive">
                    <div class="modal-header bg-primary text-white border-0">
                        <h5 class="modal-title fw-bold">Opportunity Analysis</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <h4 class="fw-bold mb-1">{{ focusedDrive.title }}</h4>
                        <h6 class="text-primary fw-bold mb-3">{{ focusedDrive.company }}</h6>
                        <div class="bg-light p-3 rounded mb-4 border shadow-inner">
                            <p class="text-dark small mb-0" style="white-space: pre-wrap;">{{ focusedDrive.description || 'No description provided.' }}</p>
                        </div>
                        <div class="row g-3 text-center">
                            <div class="col-4"><div class="p-2 border rounded bg-white shadow-sm small"><strong>Min CGPA</strong><br>{{ focusedDrive.min_cgpa }}</div></div>
                            <div class="col-4"><div class="p-2 border rounded bg-white shadow-sm small"><strong>Branch</strong><br>{{ focusedDrive.eligible_branch }}</div></div>
                            <div class="col-4"><div class="p-2 border rounded bg-white shadow-sm small"><strong>Deadline</strong><br>{{ formatDate(focusedDrive.deadline) }}</div></div>
                        </div>
                    </div>
                    <div class="modal-footer border-0">
                        <button @click="applyToDrive(focusedDrive.id)" class="btn btn-primary w-100 fw-bold py-3 shadow"
                                :disabled="isAlreadyApplied(focusedDrive.id) || profileForm.cgpa < focusedDrive.min_cgpa">
                            {{ isAlreadyApplied(focusedDrive.id) ? '✓ Already Applied' : 'Confirm Application' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── STATUS DETAIL MODAL ── -->
        <div class="modal fade" id="statusDetailModal" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content shadow-lg border-0" v-if="selectedApp">
                    <div class="modal-header bg-dark text-white border-0">
                        <h5 class="modal-title fw-bold">Live Status: {{ selectedApp.company }}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="text-center mb-4 border-bottom pb-3">
                            <span class="badge fs-5 px-4 py-2 rounded-pill shadow" :class="statusClass(selectedApp.status)">
                                {{ selectedApp.status }}
                            </span>
                        </div>
                        <div class="bg-light p-3 rounded border shadow-inner">
                            <h6 class="fw-bold small text-muted mb-3 text-uppercase">Timeline & Remarks:</h6>
                            <div v-for="note in notificationsForApp" :key="note.id" class="mb-3 border-bottom pb-2">
                                <p class="mb-1 text-dark fw-medium small" style="white-space: pre-wrap;">{{ note.message }}</p>
                                <div class="d-flex justify-content-between align-items-center mt-2">
                                    <small class="text-muted" style="font-size: 0.7rem;">{{ note.created_at }}</small>
                                    <div v-if="note.message.toLowerCase().includes('http')">
                                        <a :href="extractUrl(note.message)" target="_blank" class="btn btn-primary btn-sm py-1 px-3 fw-bold">JOIN MEET</a>
                                    </div>
                                    <div v-else-if="note.message.toLowerCase().includes('in-person') || note.message.toLowerCase().includes('office')">
                                        <span class="badge bg-dark">📍 In-Person</span>
                                    </div>
                                </div>
                            </div>
                            <div v-if="notificationsForApp.length === 0" class="text-center text-muted small py-3 italic">
                                Application received. Awaiting review from {{ selectedApp.company }}.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── HISTORY MODAL ── -->
        <div class="modal fade" id="historyModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content border-0">
                    <div class="modal-header bg-secondary text-white border-0">
                        <h5 class="modal-title fw-bold">Full Application History</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <table class="table table-hover mb-0 align-middle">
                            <thead class="table-secondary">
                                <tr><th class="ps-4">Drive</th><th>Organization</th><th class="text-center">Final Result</th><th class="text-end pe-4">Applied Date</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="app in appliedDrives" :key="app.id">
                                    <td><span @click="openDriveFromApp(app)" class="ps-4 fw-bold hover-link text-dark">{{ app.title }}</span></td>
                                    <td>{{ app.company }}</td>
                                    <td class="text-center"><span class="badge rounded-pill px-3 py-2" :class="statusClass(app.status)">{{ app.status }}</span></td>
                                    <td class="text-end pe-4 small text-muted">{{ formatDate(app.applied_at) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <!-- ── EDIT PROFILE MODAL ── -->
        <div class="modal fade" id="editProfileModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header bg-light border-bottom">
                        <h5 class="modal-title fw-bold">Profile Settings</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="mb-3"><label class="form-label fw-bold small text-muted">FULL NAME</label><input type="text" v-model="profileForm.name" class="form-control" required></div>
                        <div class="row g-3 mb-3">
                            <div class="col-6"><label class="form-label fw-bold small text-muted">CURRENT CGPA</label><input type="number" step="0.01" v-model="profileForm.cgpa" class="form-control" required></div>
                            <div class="col-6"><label class="form-label fw-bold small text-muted">GRAD YEAR</label><input type="number" v-model="profileForm.year_of_study" class="form-control" required></div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label fw-bold small text-muted">ACADEMIC BRANCH</label>
                            <input type="text" v-model="profileForm.branch" class="form-control" required>
                        </div>
                        <div class="mb-4"><label class="form-label fw-bold small text-muted">RESUME LINK</label><input type="text" v-model="profileForm.resume_url" class="form-control" placeholder="Google Drive Link"></div>
                        <button @click="updateProfile" class="btn btn-primary w-100 fw-bold py-3 shadow-sm">SYNC DATA</button>
                    </div>
                </div>
            </div>
        </div>

    </div>`,

    data() {
        return {
            currentTab: 'drives',
            searchQuery: '',
            displayName: 'Student',
            studentId: null,
            availableDrives: [],
            appliedDrives: [],
            notifications: [],
            companies: [],          
            focusedDrive: null,
            selectedApp: null,
            selectedCompanyName: '',
            profileForm: { name: '', email: '', phone: '', cgpa: 0, branch: '', year_of_study: null, resume_url: '' },
            stats: { total_applied: 0, total_shortlisted: 0, total_active_drives: 0 },
            modalInstances: {},
            isBlacklisted: false,
            adminMsg: '',
        };
    },

    computed: {
        finalFilteredDrives() {
            if (!this.availableDrives) return [];
            const now = new Date();
            return this.availableDrives.filter(d => {
                const hasInteracted = this.appliedDrives.some(a => a.id === d.id);
                const deadline = (d.deadline && d.deadline !== 'None') ? new Date(d.deadline) : null;
                const isExpired = deadline ? now > deadline : false;
                const matchesSearch = this.searchQuery
                    ? (d.title + d.company).toLowerCase().includes(this.searchQuery.toLowerCase())
                    : true;
                return !hasInteracted && !isExpired && matchesSearch;
            });
        },

        filteredActiveApplications() {
            let list = this.appliedDrives.filter(app => (app.status || '').toLowerCase() !== 'rejected');
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                list = list.filter(app => (app.title + app.company).toLowerCase().includes(q));
            }
            return list;
        },

        // ── NEW: filters the companies list by search query ──────────────────
        filteredCompanies() {
            if (!this.companies) return [];
            return this.companies.filter(c =>
                // Ensure blacklisted ones show up in the tab even if approval_status changed
                ((c.approval_status || '').toLowerCase() === 'approved' || c.is_blacklisted === true) &&
                c.company_name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        },

        // drives for the selected company inside the modal ───────────────────
        selectedCompanyDrives() {
            if (!this.selectedCompanyName) return [];
            return this.availableDrives.filter(d => d.company === this.selectedCompanyName);
        },

        unreadCount() {
            return (this.notifications || []).filter(n => !n.is_read).length;
        },

        // frontend/static/component/student_dashboard.js

        notificationsForApp() {
            if (!this.selectedApp || !this.notifications) return [];

            const companyName = this.selectedApp.company.toLowerCase();
            const driveTitle = this.selectedApp.title.toLowerCase();

            return this.notifications.filter(n => {
                const msg = (n.message || '').toLowerCase();
                // Check if message belongs to THIS company AND THIS specific drive title
                return msg.includes(companyName) && msg.includes(driveTitle);
            }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        },
        sortedNotifications() {
        if (!this.notifications) return [];
        // Create a copy [...], then sort by date descending
        return [...this.notifications].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }
    },

    mounted() {
        this.displayName = localStorage.getItem('user_name') || 'Student';
        this.fetchAllData();
        this.fetchDashboardStats();

        ['companyDetailModal', 'statusDetailModal', 'historyModal', 'editProfileModal', 'companyViewModal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                const duplicates = document.querySelectorAll(`#${id}`);
                if (duplicates.length > 1) duplicates[0].remove();
                if (el.parentElement !== document.body) document.body.appendChild(el);
                this.modalInstances[id] = new bootstrap.Modal(el);
            }
        });
    },

    methods: {

        // ── DATA ──────────────────────────────────────────────────────────────

        async fetchAllData() {
            const headers = { 'Authentication-Token': localStorage.getItem('auth_token') };
            try {
                const [resD, resP, resA, resN, resC] = await Promise.all([
                    fetch('/api/drives', { headers }),
                    fetch('/api/students', { headers }),
                    fetch('/api/student/my-applications', { headers }),
                    fetch('/api/company/notifications', { headers }),
                    fetch('/api/companies', { headers })   // ← NEW
                ]);

                if (resD.ok) this.availableDrives = await resD.json();

                if (resP.ok) {
                    const p = await resP.json();
                    const d = Array.isArray(p) ? p[0] : p;
                    if (d) {
                        this.studentId = d.id;
                        this.profileForm = { ...d };
                        this.displayName = d.name;
                        this.isBlacklisted = !!d.is_blacklisted;
                    }
                }

                if (resA.ok) this.appliedDrives = await resA.json();
                if (resN.ok) this.notifications = await resN.json();
                if (resC.ok) this.companies = await resC.json();   // ← NEW

            } catch (e) {
                console.error('Data Fetch Failure:', e);
            }
        },

        async fetchDashboardStats() {
            const res = await fetch('/api/student/stats', {
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (res.ok) this.stats = await res.json();
        },

        // ── COMPANIES TAB HELPER ──────────────────────────────────────────────

        // Returns how many drives a given company currently has in availableDrives
        activeDriveCount(companyName) {
            return this.availableDrives.filter(d => d.company === companyName).length;
        },

        // ── NOTIFICATIONS ─────────────────────────────────────────────────────

        async markNotificationsRead() {
            if (this.unreadCount > 0) {
                await fetch('/api/notifications/read', {
                    method: 'POST',
                    headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
                });
                this.notifications.forEach(n => n.is_read = true);
            }
        },

        // ── MODALS ────────────────────────────────────────────────────────────

        viewCompanyDrives(companyName) {
            this.selectedCompanyName = companyName;
            this.modalInstances['companyViewModal'].show();
        },

        openEditModal() { this.modalInstances['editProfileModal'].show(); },
        openHistoryModal() { this.modalInstances['historyModal'].show(); },

        showDriveDetails(drive) {
            if (this.modalInstances['companyViewModal']) this.modalInstances['companyViewModal'].hide();
            this.focusedDrive = drive;
            this.modalInstances['companyDetailModal'].show();
        },

        openDriveFromApp(app) {
            const driveObj = this.availableDrives.find(d => d.id === app.id);
            if (driveObj) this.showDriveDetails(driveObj);
            else alert('Original drive details are no longer active.');
        },

        async viewAppStatusDetails(app) {
            this.selectedApp = app;
            const resN = await fetch('/api/company/notifications', {
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (resN.ok) this.notifications = await resN.json();
            this.modalInstances['statusDetailModal'].show();
        },

        // ── PROFILE ───────────────────────────────────────────────────────────

        async updateProfile() {
            const res = await fetch(`/api/students/${this.studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authentication-Token': localStorage.getItem('auth_token')
                },
                body: JSON.stringify(this.profileForm)
            });
            if (res.ok) {
                alert('Profile Updated Successfully!');
                this.modalInstances['editProfileModal'].hide();
                await this.fetchAllData();
            }
        },

        async sendMessageToAdmin() {
            if (!this.adminMsg || this.adminMsg.trim() === '') return alert('Please enter a reason for your appeal.');
            const token = localStorage.getItem('auth_token');
            try {
                const res = await fetch('/api/contact_admin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authentication-Token': token },
                    body: JSON.stringify({ message: this.adminMsg })
                });
                if (res.ok) { alert('Your appeal has been sent.'); this.adminMsg = ''; }
                else { const d = await res.json(); alert('Error: ' + (d.message || 'Failed.')); }
            } catch (err) { alert('Server connection failed. Is Flask running?'); }
        },

        // ── DRIVES ────────────────────────────────────────────────────────────

        async applyToDrive(driveId) {
            const drive = this.availableDrives.find(d => d.id === driveId);
            if (drive && this.profileForm.cgpa < drive.min_cgpa) return alert('You do not meet the minimum CGPA for this drive.');
            const res = await fetch(`/api/drives/${driveId}/apply`, {
                method: 'POST',
                headers: { 'Authentication-Token': localStorage.getItem('auth_token') }
            });
            if (res.ok) {
                alert('Application Submitted!');
                this.modalInstances['companyDetailModal']?.hide();
                this.modalInstances['companyViewModal']?.hide();
                await Promise.all([this.fetchAllData(), this.fetchDashboardStats()]);
            } else {
                const err = await res.json();
                alert(err.message || 'Application failed.');
            }
        },

        isEligible(drive) {
            // Check CGPA
            const cgpaOk = !drive.min_cgpa || (this.profileForm.cgpa >= drive.min_cgpa);

            // Check Branch
            let branchOk = true;
            if (drive.eligible_branch && this.profileForm.branch) {
                const allowedBranches = drive.eligible_branch.split(',').map(b => b.trim().toLowerCase());
                branchOk = allowedBranches.includes(this.profileForm.branch.trim().toLowerCase());
            }

            return cgpaOk && branchOk;
        },
        // ── EXPORT ────────────────────────────────────────────────────────────

        async triggerExport() {
            const token = localStorage.getItem('auth_token');
            try {
                const response = await fetch('/api/student/report/download', {
                    headers: { 'Authentication-Token': token }
                });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'My_Placement_Report.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } else { alert('Failed to generate report.'); }
            } catch (error) { alert('Server error during download.'); }
        },

        // ── UTILITIES ─────────────────────────────────────────────────────────

        statusClass(s) {
            const st = (s || '').toLowerCase();
            if (['applied', 'pending', 'waiting'].includes(st)) return 'bg-warning text-dark border';
            if (['shortlisted', 'selected', 'approved'].includes(st)) return 'bg-success text-white shadow-sm';
            return 'bg-danger text-white';
        },

        extractUrl(text) {
            const match = text.match(/(https?:\/\/[^\s]+)/g);
            return match ? match[0] : '#';
        },

        formatDate(d) {
            return (!d || d === 'None') ? 'N/A' : new Date(d).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        },

        isAlreadyApplied(id) {
            return this.appliedDrives.some(a => a.id === id);
        },

        handleLogout() {
            localStorage.clear();
            window.location.href = '#/login';
        }
    }
};
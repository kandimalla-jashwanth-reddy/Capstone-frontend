// API_BASE is declared in main.js
let allIssues = [];
let currentView = 'ACTIVE';

function fixIssueUrls(issues) {
    const baseUrl = API_BASE.replace('/api', '');
    if (!Array.isArray(issues)) issues = [issues];
    issues.forEach(issue => {
        if (issue.photoUrl && issue.photoUrl.startsWith('/')) issue.photoUrl = baseUrl + issue.photoUrl;
        if (issue.photoUrls && issue.photoUrls.length > 0) {
            issue.photoUrls = issue.photoUrls.map(url => url.startsWith('/') ? baseUrl + url : url);
        }
        if (issue.resolutionPhotoUrl && issue.resolutionPhotoUrl.startsWith('/')) issue.resolutionPhotoUrl = baseUrl + issue.resolutionPhotoUrl;
    });
    return issues;
}

document.addEventListener('DOMContentLoaded', function () {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    loadAdminProfile();
    loadIssues();
    updateActiveBtn('btnActive'); 
});

function updateActiveBtn(activeId) {
    const buttons = ['btnActive', 'btnResolved'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

function updateStats() {
    const total = allIssues.length;
    const inProgress = allIssues.filter(i => i.status === 'IN_PROGRESS' || i.status === 'NEW').length;
    const resolved = allIssues.filter(i => i.status === 'RESOLVED').length;
    const rejected = allIssues.filter(i => i.status === 'REJECTED').length;

    document.getElementById('adminTotalIssues').textContent = total;
    document.getElementById('adminInProgress').textContent = inProgress;
    document.getElementById('adminResolved').textContent = resolved;
    document.getElementById('adminRejected').textContent = rejected;
}

function toggleAdminProfile() {
    updateActiveBtn(''); // Clear tab selection when in profile view
    const profilePanel = document.getElementById('adminProfilePanel');
    const issuesSection = document.getElementById('issuesSection');
    if (profilePanel) {
        profilePanel.style.display = 'block';
        if (issuesSection) issuesSection.style.display = 'none';
    }
}

function showActiveIssues() {
    updateActiveBtn('btnActive');
    currentView = 'ACTIVE';
    const profilePanel = document.getElementById('adminProfilePanel');
    const issuesSection = document.getElementById('issuesSection');
    if (profilePanel) profilePanel.style.display = 'none';
    if (issuesSection) issuesSection.style.display = 'block';

    const activeIssues = allIssues.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS');
    renderIssuesTable(activeIssues);

    document.getElementById('tableTitle').textContent = 'Active Issues';
    document.getElementById('tableSubtitle').textContent = 'Manage and update reported civic problems';
}

function showResolvedIssues() {
    updateActiveBtn('btnResolved');
    currentView = 'RESOLVED';
    const profilePanel = document.getElementById('adminProfilePanel');
    const issuesSection = document.getElementById('issuesSection');
    if (profilePanel) profilePanel.style.display = 'none';
    if (issuesSection) issuesSection.style.display = 'block';

    const resolvedIssues = allIssues.filter(i => i.status === 'RESOLVED' || i.status === 'REJECTED');
    renderIssuesTable(resolvedIssues);

    document.getElementById('tableTitle').textContent = 'Resolved & Rejected';
    document.getElementById('tableSubtitle').textContent = 'Historical records of addressed citizen concerns';
}

async function loadAdminProfile() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
        const response = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const user = await response.json();
            
            document.getElementById('adminName').textContent = user.name || 'Admin User';
            document.getElementById('adminEmail').textContent = user.email || '—';
            document.getElementById('adminPhone').textContent = user.phone || '—';
            document.getElementById('adminDepartment').textContent = user.department || 'General Admin';
            document.getElementById('adminId').textContent = user.adminId || 'ADM-001';
            
            const headerName = document.getElementById('headerAdminName');
            if (headerName) headerName.textContent = user.name || user.email.split('@')[0];
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// ── ADMIN PROFILE EDITING ──

function toggleAdminEdit(field) {
    const row = document.getElementById(`row-admin-${field}`);
    const valueEl = document.getElementById(`admin${field.charAt(0).toUpperCase() + field.slice(1)}`);
    const inputEl = document.getElementById(`edit-admin-${field}`);
    
    if (row.classList.contains('edit-mode')) {
        row.classList.remove('edit-mode');
    } else {
        inputEl.value = valueEl.textContent.trim() === '—' ? '' : valueEl.textContent.trim();
        row.classList.add('edit-mode');
        inputEl.focus();
    }
}

async function saveAdminField(field) {
    const inputEl = document.getElementById(`edit-admin-${field}`);
    const newValue = inputEl.value.trim();
    if (!newValue) {
        toggleAdminEdit(field);
        return;
    }

    const email = localStorage.getItem('userEmail');
    // Using current UI values for the other field to maintain existing data
    const currentName = document.getElementById('adminName').textContent.trim();
    const currentPhone = document.getElementById('adminPhone').textContent.trim();

    const updateData = {
        email: email,
        name: field === 'name' ? newValue : (currentName === 'Admin User' ? '' : currentName),
        phone: field === 'phone' ? newValue : (currentPhone === '—' ? '' : currentPhone)
    };

    try {
        const res = await fetch(`${API_BASE}/auth/update-profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (res.ok) {
            document.getElementById(`admin${field.charAt(0).toUpperCase() + field.slice(1)}`).textContent = newValue;
            if (field === 'name') {
                document.getElementById('headerAdminName').textContent = newValue;
            }
            toggleAdminEdit(field);
            alert('Profile updated successfully!');
        } else {
            const err = await res.text();
            alert(err || 'Update failed');
        }
    } catch (err) {
        alert('Server error saving profile');
    }
}

async function updateAdminPassword() {
    const current = document.getElementById('currentPassword').value.trim();
    const newPass = document.getElementById('newPassword').value.trim();
    const confirm = document.getElementById('confirmPassword').value.trim();
    const msg = document.getElementById('passwordMessage');
    const btn = document.getElementById('updatePasswordBtn');

    if (newPass !== confirm) {
        msg.textContent = 'Passwords do not match';
        msg.className = 'inline-msg error';
        msg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

    try {
        const res = await fetch(`${API_BASE}/auth/update-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: localStorage.getItem('userEmail'),
                currentPassword: current,
                newPassword: newPass
            })
        });
        if (res.ok) {
            msg.textContent = 'Password updated successfully!';
            msg.className = 'inline-msg success';
            document.getElementById('updatePasswordForm').reset();
        } else {
            const txt = await res.text();
            msg.textContent = txt || 'Update failed';
            msg.className = 'inline-msg error';
        }
    } catch (e) {
        msg.textContent = 'Connection error';
        msg.className = 'inline-msg error';
    } finally {
        msg.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = oldHtml;
    }
}

async function loadIssues() {
    try {
        const response = await fetch(`${API_BASE}/issues`);
        if (response.ok) {
            allIssues = await response.json();
            fixIssueUrls(allIssues);
            updateStats();
            refreshCurrentView();
        }
    } catch (error) {
        console.error('Error loading issues:', error);
    }
}

function refreshCurrentView() {
    if (currentView === 'ACTIVE') showActiveIssues();
    else if (currentView === 'RESOLVED') showResolvedIssues();
}

function renderIssuesTable(issues) {
    const tbody = document.getElementById('issueTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;">No issues found in this category.</td></tr>';
        return;
    }

    issues.forEach(issue => {
        const tr = document.createElement('tr');
        
        const photoUrls = issue.photoUrls || (issue.photoUrl ? [issue.photoUrl] : []);
        const photoBtn = photoUrls.length > 0 
            ? `<button class="photo-btn" onclick="openPhotoModal('${photoUrls[0]}')"><i class="fas fa-image"></i> View (${photoUrls.length})</button>`
            : '<span style="opacity:0.5;font-size:0.75rem;">No Photo</span>';

        const destination = (issue.latitude && issue.longitude) 
            ? `${issue.latitude},${issue.longitude}` 
            : encodeURIComponent(issue.address);
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;

        tr.innerHTML = `
            <td><span class="table-id">#${issue.id}</span></td>
            <td>#${issue.reporterId || '—'}</td>
            <td>${new Date(issue.createdAt).toLocaleDateString()}</td>
            <td class="issue-title-cell">${escapeHtml(issue.title)}</td>
            <td><span class="badge ${issue.category.toLowerCase()}">${issue.category}</span></td>
            <td>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <span title="${escapeHtml(issue.address)}" style="font-size:0.82rem; font-weight:600; color:var(--navy);">${escapeHtml(issue.address.substring(0,25))}...</span>
                    <a href="${mapsUrl}" target="_blank" class="btn-route">
                        <i class="fas fa-directions"></i> GET ROUTE
                    </a>
                </div>
            </td>
            <td>${photoBtn}</td>
            <td>
                <select class="status-select" id="status-${issue.id}" onchange="togglePhotoUpload(${issue.id})">
                    <option value="NEW" ${issue.status === 'NEW' ? 'selected' : ''}>New</option>
                    <option value="IN_PROGRESS" ${issue.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                    <option value="RESOLVED" ${issue.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
                    <option value="REJECTED" ${issue.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                </select>
                <div id="photo-container-${issue.id}" style="display: ${issue.status === 'RESOLVED' ? 'block' : 'none'}; margin-top: 5px;">
                     <input type="file" id="photo-${issue.id}" accept="image/*" style="font-size: 10px; width: 120px;" />
                </div>
            </td>
            <td>${issue.assignedDepartment || 'Municipal'}</td>
            <td><button class="update-btn" onclick="updateIssueStatus(${issue.id})"><i class="fas fa-sync-alt"></i> &nbsp; Update</button></td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateIssueStatus(id) {
    const status = document.getElementById(`status-${id}`).value;
    let resolutionPhotoUrl = null;

    if (status === 'RESOLVED') {
        const file = document.getElementById(`photo-${id}`).files[0];
        if (!file) return alert('Photo required for resolution');
        resolutionPhotoUrl = await new Promise(res => {
            const rd = new FileReader();
            rd.onload = () => res(rd.result);
            rd.readAsDataURL(file);
        });
    }

    const payload = { status };
    if (resolutionPhotoUrl) payload.resolutionPhotoUrl = resolutionPhotoUrl;
    
    if (status === 'REJECTED') {
        const reason = prompt('Rejection reason:');
        if (!reason) return;
        payload.rejectionReason = reason;
    }

    try {
        const res = await fetch(`${API_BASE}/issues/${id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Issue updated!');
            loadIssues();
        }
    } catch (e) { alert('Update failed'); }
}

function openPhotoModal(url) {
    document.getElementById('photoModalImg').src = url;
    document.getElementById('photoModal').style.display = 'flex';
}
function closePhotoModal() {
    document.getElementById('photoModal').style.display = 'none';
}

function togglePhotoUpload(id) {
    const val = document.getElementById(`status-${id}`).value;
    document.getElementById(`photo-container-${id}`).style.display = (val === 'RESOLVED' ? 'block' : 'none');
}

function filterTable() {
    const cat = document.getElementById('filterCategory').value;
    const stat = document.getElementById('filterStatus').value;
    const dept = document.getElementById('filterDept').value;
    
    let filtered = allIssues;

    if (currentView === 'ACTIVE') filtered = filtered.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS');
    else if (currentView === 'RESOLVED') filtered = filtered.filter(i => i.status === 'RESOLVED' || i.status === 'REJECTED');

    if (cat) filtered = filtered.filter(i => i.category === cat);
    if (stat) filtered = filtered.filter(i => i.status === stat);
    if (dept) filtered = filtered.filter(i => i.assignedDepartment === dept);

    renderIssuesTable(filtered);
}

function escapeHtml(t) { return t ? t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : ''; }

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

/* ── Navbar Menu Toggle ── */
function toggleNavMenu() {
    const menu = document.getElementById('navMoreMenu');
    if (menu) menu.classList.toggle('show');
}

// Close dropdown if user clicks outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('navMoreMenu');
    const btn = document.getElementById('navMenuBtn');
    if (menu && btn && !menu.contains(event.target) && !btn.contains(event.target)) {
        menu.classList.remove('show');
    }
});

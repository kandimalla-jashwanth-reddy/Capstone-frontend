const API_BASE = 'http://localhost:8080/api';
let allIssues = [];
let currentView = 'ALL';

document.addEventListener('DOMContentLoaded', function () {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    loadAdminProfile();
    loadIssues();
    updateActiveBtn('btnActive'); // Set initial active button
});

function updateActiveBtn(activeId) {
    const buttons = ['btnActive', 'btnResolved', 'btnProfile'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) {
                btn.classList.add('active-nav');
            } else {
                btn.classList.remove('active-nav');
            }
        }
    });
}

function toggleAdminProfile() {
    updateActiveBtn('btnProfile');
    const profileDiv = document.querySelector('.user-info');
    const issuesSection = document.getElementById('issuesSection');
    if (profileDiv) {
        profileDiv.style.display = 'block';
        if (issuesSection) issuesSection.style.display = 'none';
    }
}

async function updateAdminPassword() {
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageEl = document.getElementById('passwordMessage');
    const email = localStorage.getItem('userEmail');

    if (newPassword !== confirmPassword) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'New passwords do not match!';
        return;
    }

    const btn = document.getElementById('updatePasswordBtn');
    btn.disabled = true;
    btn.textContent = 'Updating...';

    try {
        const response = await fetch(`${API_BASE}/auth/update-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                currentPassword: currentPassword,
                newPassword: newPassword
            })
        });

        if (response.ok) {
            messageEl.style.color = 'green';
            messageEl.textContent = 'Password updated successfully!';
            document.getElementById('updatePasswordForm').reset();
        } else {
            const error = await response.text();
            messageEl.style.color = 'red';
            messageEl.textContent = error || 'Update failed.';
        }
    } catch (err) {
        messageEl.style.color = 'red';
        messageEl.textContent = 'Connection error.';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Update Password';
    }
}

function showActiveIssues() {
    updateActiveBtn('btnActive');
    currentView = 'ACTIVE';
    const profileDiv = document.querySelector('.user-info');
    const issuesSection = document.getElementById('issuesSection');
    if (profileDiv) profileDiv.style.display = 'none';
    if (issuesSection) issuesSection.style.display = 'block';

    const activeIssues = allIssues.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS');
    renderIssuesTable(activeIssues);

    const subTitle = document.querySelector('#issuesSection h3');
    if (subTitle) subTitle.textContent = 'Active Civic Issues';
}

function showResolvedIssues() {
    updateActiveBtn('btnResolved');
    currentView = 'RESOLVED';
    const profileDiv = document.querySelector('.user-info');
    const issuesSection = document.getElementById('issuesSection');
    if (profileDiv) profileDiv.style.display = 'none';
    if (issuesSection) issuesSection.style.display = 'block';

    const resolvedIssues = allIssues.filter(i => i.status === 'RESOLVED' || i.status === 'REJECTED');
    renderIssuesTable(resolvedIssues);

    const subTitle = document.querySelector('#issuesSection h3');
    if (subTitle) subTitle.textContent = 'Resolved & Rejected Civic Issues';
}

function refreshCurrentView() {
    if (currentView === 'ACTIVE') {
        showActiveIssues();
    } else if (currentView === 'RESOLVED') {
        showResolvedIssues();
    } else {
        renderIssuesTable(allIssues);
        const subTitle = document.querySelector('#issuesSection h3');
        if (subTitle) subTitle.textContent = 'Reported Civic Issues';
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

async function loadAdminProfile() {
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
        const response = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(email)}`);
        if (response.ok) {
            const user = await response.json();

            const nameEl = document.getElementById('adminName');
            const emailEl = document.getElementById('adminEmail');
            const idEl = document.getElementById('adminId');
            const deptEl = document.getElementById('adminDepartment');
            const headerNameEl = document.getElementById('headerAdminName');

            if (nameEl) nameEl.textContent = user.name || 'Unknown';
            if (emailEl) emailEl.textContent = user.email || 'Unknown';
            if (deptEl) deptEl.textContent = user.department || 'Not Assigned';
            if (idEl) idEl.textContent = user.adminId || 'Not Applicable';

            if (headerNameEl) {
                const displayName = user.name || user.email.split('@')[0] || 'Admin';
                headerNameEl.textContent = `Welcome, ${displayName}`;
                console.log('Admin header updated to:', headerNameEl.textContent);
            }
        } else {
            console.error('Failed to load admin profile data.');
            const headerNameEl = document.getElementById('headerAdminName');
            if (headerNameEl) {
                const savedEmail = localStorage.getItem('userEmail');
                const displayName = savedEmail ? savedEmail.split('@')[0] : 'Admin';
                headerNameEl.textContent = `Welcome, ${displayName}`;
            }
        }
    } catch (error) {
        console.error('Error fetching admin profile:', error);
    }
}

async function loadIssues() {
    try {
        const response = await fetch(`${API_BASE}/issues`);
        if (response.ok) {
            allIssues = await response.json();
            refreshCurrentView();
        } else {
            console.error('Failed to load issues');
            alert('Failed to load issues from the server.');
        }
    } catch (error) {
        console.error('Error loading issues:', error);
        alert('Error connecting to the server.');
    }
}

function renderIssuesTable(issues) {
    const tbody = document.getElementById('issueTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No issues reported yet.</td></tr>';
        return;
    }

    issues.forEach(issue => {
        const tr = document.createElement('tr');

        let locationHtml = escapeHtml(issue.address) || 'N/A';
        const destination = (issue.latitude && issue.longitude)
            ? `${issue.latitude},${issue.longitude}`
            : (issue.address ? encodeURIComponent(issue.address) : null);

        if (destination) {
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
            locationHtml = `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <span style="font-weight: 500;">${escapeHtml(issue.address) || 'Address Missing'}</span>
                    <a href="${mapsUrl}" target="_blank" class="btn-primary" 
                       style="display: inline-flex; align-items: center; justify-content: center; gap: 5px; font-size: 0.8rem; padding: 5px 10px; text-decoration: none; border-radius: 4px;">
                        <i class="fas fa-route"></i> Get Route
                    </a>
                </div>
            `;
        }

        const dateReported = issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : 'Unknown';

        const photoHtml = issue.photoUrl
            ? `<button class="btn-secondary" onclick="viewPhoto('${issue.photoUrl}')" style="padding: 4px 8px; font-size: 0.8rem;">View Photo</button>`
            : '<span style="color: #64748b; font-size: 0.85em;">No Photo</span>';

        tr.innerHTML = `
            <td>#${issue.id}</td>
            <td>${issue.reporterId || 'N/A'}</td>
            <td>${dateReported}</td>
            <td>${escapeHtml(issue.title)}</td>
            <td>${issue.category}</td>
            <td>${locationHtml}</td>
            <td>${photoHtml}</td>
            <td>
                <select class="status-select" id="status-${issue.id}" onchange="togglePhotoUpload(${issue.id})">
                    <option value="NEW" ${issue.status === 'NEW' ? 'selected' : ''}>New</option>
                    <option value="IN_PROGRESS" ${issue.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                    <option value="RESOLVED" ${issue.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
                    <option value="REJECTED" ${issue.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                </select>
                <div id="photo-container-${issue.id}" style="display: ${issue.status === 'RESOLVED' ? 'block' : 'none'}; margin-top: 8px;">
                     <input type="file" id="photo-${issue.id}" accept="image/*" style="font-size: 11px; width: 100%; max-width: 150px;" />
                     <div style="font-size: 10px; color: #666; margin-top: 2px;">Resolution Photo</div>
                </div>
            </td>
            <td>
                ${issue.assignedDepartment || 'Unassigned'}
            </td>
            <td>
                <button class="update-btn" onclick="updateIssueStatus(${issue.id})">Update</button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

async function updateIssueStatus(id) {
    const select = document.getElementById(`status-${id}`);
    const newStatus = select.value;
    const btn = select.closest('tr').querySelector('.update-btn');

    let resolutionPhotoUrl = null;

    if (newStatus === 'RESOLVED') {
        const fileInput = document.getElementById(`photo-${id}`);
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            try {
                resolutionPhotoUrl = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(file);
                });
            } catch (err) {
                alert('Failed to read image file');
                return;
            }
        } else {
            alert('Please select a resolution photo before resolving the issue.');
            return;
        }
    }

    const payload = { status: newStatus };
    if (resolutionPhotoUrl) {
        payload.resolutionPhotoUrl = resolutionPhotoUrl;
    }

    if (newStatus === 'REJECTED') {
        const reason = prompt('Please enter the reason for rejecting this issue:');
        if (reason === null) {
            return;
        }
        if (!reason.trim()) {
            alert('A rejection reason is required.');
            return;
        }
        payload.rejectionReason = reason.trim();
    }

    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/issues/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)

        });

        if (response.ok) {
            alert(`Issue #${id} updated to ${newStatus}`);
            loadIssues(); // Refresh data
        } else {
            const text = await response.text();
            alert(`Failed to update status: ${text}`);
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Error updating status. Please check connection.');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function togglePhotoUpload(id) {
    const select = document.getElementById(`status-${id}`);
    const container = document.getElementById(`photo-container-${id}`);
    if (select.value === 'RESOLVED') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        const fileInput = document.getElementById(`photo-${id}`);
        if (fileInput) fileInput.value = '';
    }
}

window.viewPhoto = function (url) {
    const w = window.open("");
    w.document.write(`<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; object-fit: contain;">`);
};

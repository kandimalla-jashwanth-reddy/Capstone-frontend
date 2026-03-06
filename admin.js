const API_BASE = 'http://localhost:8080/api';

document.addEventListener('DOMContentLoaded', function () {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    loadAdminProfile();
    loadIssues();
});

function toggleAdminProfile() {
    const profileDiv = document.querySelector('.user-info');
    if (profileDiv) {
        if (profileDiv.style.display === 'none' || !profileDiv.style.display) {
            profileDiv.style.display = 'block';
        } else {
            profileDiv.style.display = 'none';
        }
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

            if (nameEl) nameEl.textContent = user.name || 'Unknown';
            if (emailEl) emailEl.textContent = user.email || 'Unknown';
            if (deptEl) deptEl.textContent = user.department || 'Not Assigned';
            if (idEl) idEl.textContent = user.adminId || 'Not Applicable';
        } else {
            console.error('Failed to load admin profile data.');
        }
    } catch (error) {
        console.error('Error fetching admin profile:', error);
    }
}

async function loadIssues() {
    try {
        const response = await fetch(`${API_BASE}/issues`);
        if (response.ok) {
            const issues = await response.json();
            renderIssuesTable(issues);
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
        if (issue.latitude && issue.longitude) {
            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${issue.latitude},${issue.longitude}`;
            locationHtml = `<a href="${mapsUrl}" target="_blank" style="color: #2563eb; text-decoration: underline;">📍 Map</a><br><span style="font-size: 0.85em; color: #64748b;">${escapeHtml(issue.address) || ''}</span>`;
        } else if (issue.latitude) {
            locationHtml = '📍 Map';
        }

        const dateReported = issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : 'Unknown';

        const photoHtml = issue.photoUrl
            ? `<button class="btn-secondary" onclick="viewPhoto('${issue.photoUrl}')" style="padding: 4px 8px; font-size: 0.8rem;">View Photo</button>`
            : '<span style="color: #64748b; font-size: 0.85em;">No Photo</span>';

        tr.innerHTML = `
            <td>#${issue.id}</td>
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
            // User cancelled the prompt
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

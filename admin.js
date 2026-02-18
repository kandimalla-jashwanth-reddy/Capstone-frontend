const API_BASE = 'http://localhost:8080/api';

document.addEventListener('DOMContentLoaded', function () {
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN') {
        alert('Access Denied. You must be an admin to view this page.');
        window.location.href = 'login.html';
        return;
    }

    loadIssues();
});

function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
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

        tr.innerHTML = `
            <td>#${issue.id}</td>
            <td>${escapeHtml(issue.title)}</td>
            <td>${issue.category}</td>
            <td>${issue.latitude ? '📍 Map' : (escapeHtml(issue.address) || 'N/A')}</td>
            <td>
                <select class="status-select" id="status-${issue.id}">
                    <option value="NEW" ${issue.status === 'NEW' ? 'selected' : ''}>New</option>
                    <option value="IN_PROGRESS" ${issue.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
                    <option value="RESOLVED" ${issue.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
                    <option value="REJECTED" ${issue.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                </select>
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

    const originalText = btn.textContent;
    btn.textContent = 'Saving...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/issues/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
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

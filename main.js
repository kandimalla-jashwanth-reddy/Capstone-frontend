const API_BASE = 'http://localhost:8080/api';

// ── SHARED UTILITIES ──

/** Show status messages for auth/forms */
function showMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    el.className = `auth-message ${type}`;
    el.style.display = 'block';
    if (type === 'success') {
        setTimeout(() => { el.style.display = 'none'; }, 5000);
    }
}

/** Legacy support for generic message display */
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
    }
}

/** Logout: clear storage and go to login */
function logout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    window.location.href = 'login.html';
}

/** Fix backend relative URLs for images */
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

// ── AUTHENTICATION ──

function selectType(type) {
    const typeCustomer = document.getElementById('typeCustomer');
    const typeStaff = document.getElementById('typeStaff');
    const adminIdGroup = document.getElementById('adminIdGroup');
    const loginEmailLabel = document.getElementById('loginEmailLabel');
    const loginEmailInput = document.getElementById('loginEmail');

    if (type === 'staff') {
        if (typeStaff) typeStaff.classList.add('active');
        if (typeCustomer) typeCustomer.classList.remove('active');
        if (adminIdGroup) adminIdGroup.classList.add('show');
        const adminDeptGroup = document.getElementById('adminDeptGroup');
        if (adminDeptGroup) adminDeptGroup.classList.add('show');
        if (loginEmailLabel) loginEmailLabel.textContent = 'Login ID';
        if (loginEmailInput) {
            loginEmailInput.type = 'text';
            loginEmailInput.placeholder = 'Enter Government ID';
        }
    } else {
        if (typeCustomer) typeCustomer.classList.add('active');
        if (typeStaff) typeStaff.classList.remove('active');
        if (adminIdGroup) adminIdGroup.classList.remove('show');
        const adminDeptGroup = document.getElementById('adminDeptGroup');
        if (adminDeptGroup) adminDeptGroup.classList.remove('show');
        if (loginEmailLabel) loginEmailLabel.textContent = 'Email Address';
        if (loginEmailInput) {
            loginEmailInput.type = 'email';
            loginEmailInput.placeholder = 'you@example.com';
        }
    }
}

function togglePassword(inputId, btnId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if (!input || !btn) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
}

async function sendOtp() {
    const emailInput = document.getElementById('registerEmail');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) { showMsg('registerMessage', 'Please enter email first', 'error'); return; }

    try {
        sendOtpBtn.disabled = true;
        sendOtpBtn.textContent = 'Sending...';
        const res = await fetch(`${API_BASE}/auth/send-registration-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const text = await res.text();
        if (res.ok) {
            showMsg('registerMessage', 'OTP sent! Check your inbox.', 'success');
            const otpGroup = document.getElementById('otpGroup');
            if (otpGroup) otpGroup.style.display = 'block';
            startOTPTimer(sendOtpBtn);
        } else {
            showMsg('registerMessage', text, 'error');
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
    } catch (err) {
        showMsg('registerMessage', 'Server unavailable', 'error');
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send OTP';
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const btn = document.getElementById('registerBtn');
    const isStaff = document.getElementById('typeStaff').classList.contains('active');
    
    const formData = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        phone: document.getElementById('mobileNumber').value.trim(),
        password: document.getElementById('registerPassword').value,
        otp: document.getElementById('otpInput').value.trim(),
        role: isStaff ? 'ADMIN' : 'CITIZEN'
    };

    if (isStaff) {
        formData.adminId = document.getElementById('adminId').value.trim();
        formData.department = document.getElementById('adminDept').value;
        if (!formData.adminId || !/^\d{8}$/.test(formData.adminId)) {
            showMsg('registerMessage', 'Government ID must be 8 digits', 'error');
            return;
        }
        if (!formData.department) {
            showMsg('registerMessage', 'Please select your Department', 'error');
            return;
        }
    }

    if (formData.password !== document.getElementById('confirmPassword').value) {
        showMsg('registerMessage', 'Passwords do not match', 'error');
        return;
    }

    try {
        btn.disabled = true;
        btn.textContent = 'Creating Account...';
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const text = await res.text();
        if (res.ok) {
            showMsg('registerMessage', 'Account created! Redirecting...', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 2000);
        } else {
            showMsg('registerMessage', text, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    } catch (err) {
        showMsg('registerMessage', 'Registration failed', 'error');
        btn.disabled = false;
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const isStaff = document.getElementById('typeStaff').classList.contains('active');
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = isStaff ? 'ADMIN' : 'CITIZEN';

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const text = await res.text();
        if (res.ok) {
            const data = JSON.parse(text);
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userEmail', data.email);
            localStorage.setItem('userRole', data.role);
            localStorage.setItem('userId', data.userId);
            window.location.href = data.role === 'ADMIN' ? 'admin.html' : 'dashboard.html';
        } else {
            showMsg('loginMessage', text || 'Login failed', 'error');
        }
    } catch (err) {
        showMsg('loginMessage', 'Server unavailable', 'error');
    }
}

function startOTPTimer(button, duration = 60) {
    let timeLeft = duration;
    const originalText = 'Send OTP';
    button.disabled = true;
    const timer = setInterval(() => {
        button.textContent = `Resend in ${timeLeft}s`;
        if (timeLeft-- < 0) {
            clearInterval(timer);
            button.disabled = false;
            button.textContent = originalText;
        }
    }, 1000);
}

// ── DASHBOARD ──

async function loadDashboard() {
    const userEmail = localStorage.getItem('userEmail');
    const userId = localStorage.getItem('userId');
    if (!userEmail) { window.location.href = 'login.html'; return; }

    // Init greeting
    const nameEl = document.getElementById('userNameHeader');
    if (nameEl) nameEl.textContent = userEmail.split('@')[0];

    // Fetch user details
    try {
        const res = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
            const user = await res.json();
            if (nameEl) nameEl.textContent = user.name || userEmail.split('@')[0];
            if (user.id) fetchAndDisplayNotifications(user.id);
        }
    } catch (_) {}

    // Fetch user issues for stats and list
    if (userId) {
        try {
            const res = await fetch(`${API_BASE}/issues/user/${userId}`);
            const issues = res.ok ? await res.json() : [];
            fixIssueUrls(issues);
            renderStats(issues);
            renderIssueList(issues);
        } catch (_) { renderIssueList([]); }
    }

    // Load Near You feed
    initializeNearYou();

    // Fetch and display user location in top bar
    fetchUserLocation();
}

/** Fetch user location and reverse geocode it for the top bar */
async function fetchUserLocation() {
    const locText = document.getElementById('locationText');
    if (!locText) return;

    if (!navigator.geolocation) {
        locText.textContent = "Location unavailable";
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (res.ok) {
                const data = await res.json();
                const address = data.address;
                const city = address.city || address.town || address.village || address.suburb || "Metropolis";
                const neighborhood = address.suburb || address.neighbourhood || address.road || "";
                
                locText.textContent = neighborhood ? `${neighborhood}, ${city}` : city;
            } else {
                locText.textContent = "Location identified";
            }
        } catch (_) {
            locText.textContent = "Metropolis, City";
        }
    }, (err) => {
        locText.textContent = "Location access denied";
        console.warn("Geolocation error:", err.message);
    });
}

function renderStats(issues) {
    const sets = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    sets('totalReports', issues.length);
    sets('inProgressCount', issues.filter(i => i.status === 'IN_PROGRESS').length);
    sets('resolvedCount', issues.filter(i => i.status === 'RESOLVED').length);
    sets('pendingCount', issues.filter(i => ['NEW', 'PENDING'].includes(i.status)).length);
}

function renderIssueList(issues) {
    const list = document.getElementById('issueList');
    if (!list) return;
    if (!issues.length) {
        list.innerHTML = `<div class="empty-state"><p>No reports yet. <a href="report.html">Report one!</a></p></div>`;
        return;
    }
    const catIcon = c => ({ ROADS:'fa-road', WATER:'fa-tint', STREETLIGHT:'fa-lightbulb', GARBAGE:'fa-trash' }[c] || 'fa-info-circle');
    const statusClass = s => ({ NEW:'pending', IN_PROGRESS:'progress', RESOLVED:'resolved', REJECTED:'rejected' }[s] || 'pending');

    list.innerHTML = issues.slice(0, 6).map(issue => {
        const photo = (issue.photoUrls && issue.photoUrls.length > 0) ? issue.photoUrls[0] : issue.photoUrl;
        return `
        <div class="issue-row" onclick="openIssueModal(${issue.id})" style="cursor:pointer;">
            <div class="issue-row-icon">
                ${photo ? `<img src="${photo}" class="issue-row-thumb">` : `<i class="fas ${catIcon(issue.category)}"></i>`}
            </div>
            <div class="issue-row-main">
                <div class="issue-row-title">${issue.title || 'Untitled'}</div>
                <div class="issue-row-meta">${issue.address || 'Unknown Location'} · ${new Date(issue.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="issue-row-action">
                <span class="status-pill ${statusClass(issue.status)}">${issue.status}</span>
            </div>
        </div>`}).join('');
}

async function initializeNearYou() {
    const list = document.getElementById('nearYouList');
    if (!list) return;

    if (!navigator.geolocation) {
        fetchNearYouFallback();
        return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
            const res = await fetch(`${API_BASE}/issues`);
            if (res.ok) {
                const all = await res.json();
                fixIssueUrls(all);
                // Filter 5km radius
                const near = all.filter(i => {
                    if (!i.latitude || !i.longitude) return false;
                    const d = Math.sqrt(Math.pow(i.latitude - lat, 2) + Math.pow(i.longitude - lng, 2)) * 111; // Approx km
                    return d <= 5;
                });
                renderNearYou(near);
            }
        } catch (_) { fetchNearYouFallback(); }
    }, () => fetchNearYouFallback());
}

async function fetchNearYouFallback() {
    try {
        const res = await fetch(`${API_BASE}/issues`);
        if (res.ok) {
            const issues = await res.json();
            fixIssueUrls(issues);
            renderNearYou(issues);
        }
    } catch (_) {}
}

let allNearIssues = [];

function renderNearYou(issues, showAll = false) {
    const list = document.getElementById('nearYouList');
    const viewAllBtn = document.getElementById('viewAllNearYou');
    if (!list) return;
    
    console.log(`[NearYou] Found ${issues.length} reports nearby. ShowAll: ${showAll}`);
    allNearIssues = issues; // Cache for toggle

    if (!issues.length) {
        list.innerHTML = `<div class="empty-state"><p>No issues nearby.</p></div>`;
        if (viewAllBtn) viewAllBtn.style.display = 'none';
        return;
    }

    // Ensure button shows only if more than 4 issues and not already showing all
    if (viewAllBtn) {
        const hasMore = issues.length > 4;
        console.log(`[NearYou] Rendering ${issues.length} issues. showAll=${showAll}, hasMore=${hasMore}`);
        
        if (hasMore && !showAll) {
            viewAllBtn.style.setProperty('display', 'flex', 'important');
            viewAllBtn.onclick = (e) => {
                e.preventDefault();
                console.log("[NearYou] View All clicked.");
                renderNearYou(allNearIssues, true);
            };
        } else {
            viewAllBtn.style.display = 'none';
        }
    }

    const displayedIssues = showAll ? issues : issues.slice(0, 4);
    const statusClass = s => ({ NEW:'pending', IN_PROGRESS:'progress', RESOLVED:'resolved', REJECTED:'rejected' }[s] || 'pending');
    
    list.innerHTML = displayedIssues.map(issue => {
        const photo = (issue.photoUrls && issue.photoUrls.length > 0) ? issue.photoUrls[0] : issue.photoUrl;
        return `
        <div class="near-card" onclick="openIssueModal(${issue.id})">
            ${photo ? `<div class="near-card-img"><img src="${photo}" alt="Issue Photo"></div>` : ''}
            <div class="near-card-content">
                <div class="near-card-top">
                    <span class="near-card-author">${issue.reporterName || 'Citizen'}</span>
                    <span class="near-card-time">${new Date(issue.createdAt).toLocaleDateString()}</span>
                </div>
                <div class="near-card-title">${issue.title}</div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div class="near-card-loc"><i class="fas fa-map-marker-alt"></i> ${issue.address || 'Unknown'}</div>
                    <span class="status-pill ${statusClass(issue.status)}">${issue.status}</span>
                </div>
            </div>
        </div>`}).join('');
}

async function openIssueModal(id) {
    const modal = document.getElementById('issueDetailsModal');
    const body = document.getElementById('modalBody');
    if (!modal || !body) return;
    modal.style.display = 'flex';
    body.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    
    try {
        const res = await fetch(`${API_BASE}/issues/${id}`);
        const issue = await res.json();
        fixIssueUrls(issue);

        const photos = (issue.photoUrls || []).map(u => 
            `<img src="${u}" style="width:100%; border-radius:12px; margin-bottom:15px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">`
        ).join('');

        const resolutionHtml = (issue.status === 'RESOLVED' && issue.resolutionPhotoUrl) ? `
            <div class="resolution-section">
                <div class="resolution-title">
                    <i class="fas fa-check-circle"></i> Work Completed (Proof of Resolution)
                </div>
                <img src="${issue.resolutionPhotoUrl}" class="resolution-img" alt="Resolution Proof">
                ${issue.resolutionNote ? `<p style="font-size: 1.1rem; color: #065f46; background: #ecfdf5; padding: 15px; border-radius: 10px; border-left: 4px solid var(--dash-green);"><strong>Staff Note:</strong> ${issue.resolutionNote}</p>` : ''}
            </div>
        ` : (issue.status === 'REJECTED' && issue.rejectionReason) ? `
            <div class="rejection-section">
                <div class="rejection-title">
                    <i class="fas fa-exclamation-circle"></i> Report Not Accepted
                </div>
                <div class="rejection-box">
                    <strong>Reason:</strong> ${issue.rejectionReason}
                </div>
            </div>
        ` : '';

        body.innerHTML = `
            <div class="modal-photo-gallery">${photos}</div>
            <div style="margin-bottom:20px;">
                <span class="status-pill ${issue.status.toLowerCase()}">${issue.status}</span>
                <span style="margin-left:10px; color:var(--dash-slate); font-weight:600;"><i class="fas fa-tag"></i> ${issue.category}</span>
            </div>
            <p>${issue.description || 'No description provided for this report.'}</p>
            ${resolutionHtml}
            <div class="modal-meta">
                <div><i class="fas fa-map-marker-alt"></i> ${issue.address || 'Location Hidden'}</div>
                <div style="margin-top:8px;"><i class="fas fa-clock"></i> Reported on ${new Date(issue.createdAt).toLocaleString()}</div>
            </div>
        `;
    } catch (err) { 
        console.error("Error fetching issue details:", err);
        body.innerHTML = '<div style="text-align:center; padding:40px; color:var(--dash-red);"><i class="fas fa-exclamation-triangle fa-2x"></i><p>Error loading details.</p></div>'; 
    }
}

async function syncNavbar() {
    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) return;

    try {
        const res = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
            const user = await res.json();
            const uHeader = document.getElementById('userNameHeader');
            if (uHeader) uHeader.textContent = user.name || userEmail.split('@')[0];
            if (user.id) fetchAndDisplayNotifications(user.id);
        }
    } catch (_) {}
}

function initModals() {
    const closeIssueBtn = document.getElementById('closeIssueDetails');
    const issueModal = document.getElementById('issueDetailsModal');
    if (closeIssueBtn && issueModal) {
        closeIssueBtn.onclick = () => { issueModal.style.display = 'none'; };
        issueModal.onclick = (e) => { if (e.target === issueModal) issueModal.style.display = 'none'; };
    }
}

// ── REPORTING & PHOTO HANDLING ──

let uploadedPhotos = [];

// Helper to update submit button state based on photo validation
function updateSubmitBtnState() {
    const btn = document.getElementById('submitBtn');
    if (!btn) return;
    
    const isAnalyzing = uploadedPhotos.some(p => p.status === 'analyzing');
    const hasInvalid = uploadedPhotos.some(p => !p.isValid && p.status !== 'analyzing');
    const hasPhotos = uploadedPhotos.length > 0;
    const allValid = hasPhotos && !isAnalyzing && !hasInvalid;

    btn.disabled = !allValid;
}

// Global functions for the new premium report page
function selectCat(el) {
    document.querySelectorAll('.cat-option').forEach(opt => opt.classList.remove('selected'));
    el.classList.add('selected');
    const val = el.getAttribute('data-value');
    document.getElementById('category').value = val;
    
    // Toggle other category field
    const otherGroup = document.getElementById('otherCategoryGroup');
    if (otherGroup) {
        otherGroup.style.display = val === 'OTHER' ? 'block' : 'none';
    }
}

async function getLocation() {
    const locBtn = document.getElementById('getLocationBtn');
    const coordsEl = document.getElementById('coords');
    const locInfo = document.getElementById('locationInfo');
    const addressInput = document.getElementById('address');
    
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    locBtn.disabled = true;
    locBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting...';

    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lng;
        
        locBtn.disabled = false;
        locBtn.innerHTML = '<i class="fas fa-check"></i> Location Captured';

        // Reverse geocoding
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            if (res.ok) {
                const data = await res.json();
                if (addressInput) addressInput.value = data.display_name;
            }
        } catch (_) {}
    }, (err) => {
        alert("Location access denied or unavailable.");
        locBtn.disabled = false;
        locBtn.innerHTML = '<i class="fas fa-crosshairs"></i> Auto-Detect My Location';
    });
}

function handleFiles(files) {
    handleImageFiles(files);
}

async function submitReport() {
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('message');
    
    // Basic validation
    const title = document.getElementById('title').value.trim();
    const category = document.getElementById('category').value;
    const address = document.getElementById('address').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!title || !category || !address || !description) {
        alert("Please fill in all required fields.");
        return;
    }

    if (uploadedPhotos.length === 0) {
        alert("Please upload at least one photo evidence.");
        return;
    }

    if (uploadedPhotos.some(p => p.status === 'analyzing')) {
        alert("Please wait for AI image verification to complete.");
        return;
    }

    if (uploadedPhotos.some(p => !p.isValid)) {
        alert("Some photos were rejected by AI. Please remove them before submitting.");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const payload = {
        title,
        description,
        category: category === 'OTHER' ? document.getElementById('otherCategory').value : category,
        latitude: document.getElementById('latitude').value,
        longitude: document.getElementById('longitude').value,
        address,
        photoUrls: uploadedPhotos.map(p => p.dataUrl),
        reporterEmail: localStorage.getItem('userEmail'),
        reporterId: parseInt(localStorage.getItem('userId'))
    };

    try {
        const res = await fetch(`${API_BASE}/issues`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('Report Submitted Successfully!');
            window.location.href = 'dashboard.html';
        } else {
            const errText = await res.text();
            alert('Submission failed: ' + errText);
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
        }
    } catch (err) {
        alert('Server unavailable. Please try again later.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Report';
    }
}

function initReportPage() {
    // This is now largely handled by global functions called from HTML,
    // but we can keep it for any additional setup if needed.
    updateSubmitBtnState();
    updateUploadZoneVisibility();
}

function updateUploadZoneVisibility() {
    const dropZone = document.getElementById('dropZone');
    if (!dropZone) return;
    if (uploadedPhotos.length > 0) {
        dropZone.style.display = 'none';
    } else {
        dropZone.style.display = 'block';
    }
}

async function handleImageFiles(files) {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (uploadedPhotos.length + list.length > 5) { alert('Max 5 photos'); return; }
    
    for (const file of list) {
        // Compress before analysis
        const compressed = await compressImage(file);
        const id = Math.random().toString(36).substr(2, 9);
        const obj = { id, file: compressed, status: 'analyzing', isValid: false, dataUrl: null };
        uploadedPhotos.push(obj);
        renderPreview(obj);
        analyzePhoto(obj);
    }
    updateSubmitBtnState();
    updateUploadZoneVisibility();
}

/** Compress image using canvas before analysis */
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    const compressedFile = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.8);
            };
        };
    });
}

function renderPreview(obj) {
    const container = document.getElementById('photoPreviewContainer');
    // Remove existing add button if any
    const oldAdd = document.getElementById('addPhotoTile');
    if (oldAdd) oldAdd.remove();

    const div = document.createElement('div');
    div.id = `preview-${obj.id}`;
    div.className = 'photo-preview-item';
    div.innerHTML = `<img id="img-${obj.id}"><div class="p-status" id="stat-${obj.id}">⌛ Analyzing</div><button type="button" onclick="removePhoto('${obj.id}')">&times;</button>`;
    container.appendChild(div);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        obj.dataUrl = e.target.result;
        document.getElementById(`img-${obj.id}`).src = e.target.result;
    };
    reader.readAsDataURL(obj.file);

    // Re-add 'Add Photos' button if under limit
    if (uploadedPhotos.length < 5) {
        const addDiv = document.createElement('div');
        addDiv.id = 'addPhotoTile';
        addDiv.className = 'photo-preview-item add-photo-btn';
        addDiv.onclick = () => document.getElementById('fileInput').click();
        addDiv.innerHTML = `<i class="fas fa-plus"></i><span>Add Photos</span>`;
        container.appendChild(addDiv);
    }
}

function removePhoto(id) {
    uploadedPhotos = uploadedPhotos.filter(p => p.id !== id);
    const el = document.getElementById(`preview-${id}`);
    if (el) el.remove();
    updateSubmitBtnState();
    updateUploadZoneVisibility();
    
    // Refresh the add button
    const container = document.getElementById('photoPreviewContainer');
    const oldAdd = document.getElementById('addPhotoTile');
    if (oldAdd) oldAdd.remove();
    if (uploadedPhotos.length > 0 && uploadedPhotos.length < 5) {
        const addDiv = document.createElement('div');
        addDiv.id = 'addPhotoTile';
        addDiv.className = 'photo-preview-item add-photo-btn';
        addDiv.onclick = () => document.getElementById('fileInput').click();
        addDiv.innerHTML = `<i class="fas fa-plus"></i><span>Add Photos</span>`;
        container.appendChild(addDiv);
    }
}

async function analyzePhoto(obj) {
    try {
        const fd = new FormData();
        fd.append('image', obj.file);
        const res = await fetch(`${API_BASE}/image/analyze`, { method: 'POST', body: fd });
        if (res.ok) {
            const data = await res.json();
            obj.isValid = data.isValid && !data.isMorphed;
            obj.status = obj.isValid ? 'verified' : 'rejected';
            updatePreviewUI(obj);
        }
    } catch (_) { obj.status = 'error'; updatePreviewUI(obj); }
    updateSubmitBtnState();
}

function updatePreviewUI(obj) {
    const el = document.getElementById(`stat-${obj.id}`);
    if (!el) return;
    el.textContent = obj.status === 'verified' ? '✅ Verified' : (obj.status === 'rejected' ? '❌ Invalid' : '⚠️ Refused');
    el.style.background = obj.status === 'verified' ? 'rgba(74, 222, 128, 0.9)' : 'rgba(248, 113, 113, 0.9)';
}

// ── MISC: CHAT & NOTIFICATIONS ──

function initializeChatBot() {
    const toggle = document.getElementById('chatToggle');
    const win = document.getElementById('chatWindow');
    if (!toggle || !win) return;
    toggle.onclick = () => win.style.display = win.style.display === 'none' ? 'flex' : 'none';
    const form = document.getElementById('chatForm');
    if (form) {
        form.onsubmit = (e) => {
            e.preventDefault();
            const inp = document.getElementById('chatInput');
            if (!inp.value.trim()) return;
            const msgs = document.getElementById('chatMessages');
            const div = document.createElement('div');
            div.className = 'chat-msg user';
            div.textContent = inp.value;
            msgs.appendChild(div);
            inp.value = '';
            setTimeout(() => {
                const bot = document.createElement('div');
                bot.className = 'chat-msg bot';
                bot.textContent = "I'm the CrowdCivics assistant. You can report issues via the dashboard and track them in real-time!";
                msgs.appendChild(bot);
                msgs.scrollTop = msgs.scrollHeight;
            }, 800);
        };
    }
}

async function fetchAndDisplayNotifications(userId) {
    const badge = document.getElementById('notifBadge');
    const list = document.getElementById('notificationList');
    const bell = document.getElementById('notifBell');
    const dropdown = document.getElementById('notifDropdown');
    const clearBtn = document.getElementById('notifClear');

    let currentUpdateIds = [];

    // Helper to mark current updates as seen (clears badge but keeps in list)
    const markAsSeen = (ids) => {
        if (!ids.length) return;
        const seenIds = JSON.parse(localStorage.getItem('seenNotificationIds') || '[]');
        const newSeenIds = [...new Set([...seenIds, ...ids])].slice(-50);
        localStorage.setItem('seenNotificationIds', JSON.stringify(newSeenIds));
        if (badge) badge.style.display = 'none';
    };

    // Helper to mark current updates as cleared (removes from list permanently)
    const markAsCleared = (ids) => {
        if (!ids.length) return;
        const clearedIds = JSON.parse(localStorage.getItem('clearedNotificationIds') || '[]');
        const newClearedIds = [...new Set([...clearedIds, ...ids])].slice(-100);
        localStorage.setItem('clearedNotificationIds', JSON.stringify(newClearedIds));
        if (badge) badge.style.display = 'none';
        if (list) list.innerHTML = '<div class="notif-empty">No new updates</div>';
    };

    if (bell && dropdown) {
        bell.onclick = (e) => {
            e.stopPropagation();
            const isOpening = dropdown.style.display !== 'flex';
            dropdown.style.display = isOpening ? 'flex' : 'none';
            
            if (isOpening) {
                markAsSeen(currentUpdateIds);
            }
        };
        document.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; });
        dropdown.onclick = (e) => e.stopPropagation();
    }

    if (clearBtn) {
        clearBtn.onclick = () => {
            markAsCleared(currentUpdateIds);
        };
    }

    try {
        const res = await fetch(`${API_BASE}/issues/user/${userId}`);
        if (res.ok) {
            const issues = await res.json();
            const updates = issues.filter(i => i.status !== 'NEW').slice(0, 5);
            currentUpdateIds = updates.map(i => i.id);

            const seenIds = JSON.parse(localStorage.getItem('seenNotificationIds') || '[]');
            const clearedIds = JSON.parse(localStorage.getItem('clearedNotificationIds') || '[]');

            // Filter out notifications that the user has manually cleared
            const filteredUpdates = updates.filter(i => !clearedIds.includes(i.id));
            const filteredUpdateIds = filteredUpdates.map(i => i.id);

            // If dropdown is already open, mark them as seen immediately
            if (dropdown && dropdown.style.display === 'flex') {
                markAsSeen(filteredUpdateIds);
            } else {
                // Count items that are neither seen nor cleared
                const unseenCount = filteredUpdateIds.filter(id => !seenIds.includes(id)).length;
                
                if (badge && unseenCount > 0) {
                    badge.textContent = unseenCount;
                    badge.style.display = 'flex';
                } else if (badge) {
                    badge.style.display = 'none';
                }
            }

            if (list) {
                if (filteredUpdates.length > 0) {
                    list.innerHTML = filteredUpdates.map(i => `
                        <div class="notif-item ${i.status === 'RESOLVED' ? 'resolved' : 'update'}" onclick="openIssueModal(${i.id})">
                            <i class="fas ${i.status === 'RESOLVED' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                            <div class="notif-info">
                                <div class="notif-title">Issue "${i.title}" is now ${i.status}</div>
                                <div class="notif-time">${new Date(i.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    list.innerHTML = '<div class="notif-empty">No new updates</div>';
                }
            }
        }
    } catch (_) {}
}

// ── PROFILE SECTION ──

async function loadProfileData() {
    const userEmail = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    if (!userEmail) { window.location.href = 'login.html'; return; }

    try {
        const res = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(userEmail)}`);
        if (res.ok) {
            const user = await res.json();
            
            // Sidebar display
            const headerName = document.getElementById('profileHeaderName');
            const emailDisplay = document.getElementById('profileEmailDisplay');
            const avatar = document.getElementById('profileAvatar');
            if (headerName) headerName.textContent = user.name || userEmail.split('@')[0];
            if (emailDisplay) emailDisplay.textContent = user.email;
            if (avatar) avatar.textContent = (user.name || user.email).charAt(0).toUpperCase();

            // Navbar Greeting
            const headerGreeting = document.getElementById('userNameHeader');
            if (headerGreeting) headerGreeting.textContent = user.name || userEmail.split('@')[0];

            // Notifications badge & dropdown (Shared)
            if (user.id) fetchAndDisplayNotifications(user.id);

            // Account Info Card (Dynamic fields)
            const userName = document.getElementById('userName');
            const userEmailEl = document.getElementById('userEmail');
            const userPhone = document.getElementById('userPhone');
            const userId = document.getElementById('userId');
            const userDept = document.getElementById('userDept');
            const userGovId = document.getElementById('userGovId');

            if (userName) userName.textContent = user.name || "N/A";
            if (userEmailEl) userEmailEl.textContent = user.email;
            if (userPhone) userPhone.textContent = user.phone || "N/A";
            if (userId) userId.textContent = user.id || "N/A";
            if (userDept) userDept.textContent = user.department || "Not Assigned";
            if (userGovId) userGovId.textContent = user.adminId || "N/A";

            // Stats section - usually for citizens, hide for admins as per request
            const statsSection = document.querySelector('.profile-mini-stats');
            if (userRole === 'ADMIN' && statsSection) {
                statsSection.style.display = 'none';
            }

            // Fetch stats if citizen and userId exists
            if (userRole === 'CITIZEN' && user.id) {
                const issuesRes = await fetch(`${API_BASE}/issues/user/${user.id}`);
                if (issuesRes.ok) {
                    const issues = await issuesRes.json();
                    const total = issues.length;
                    const resolved = issues.filter(i => i.status === 'RESOLVED').length;
                    const rate = total > 0 ? (resolved / total * 100).toFixed(0) + '%' : '0%';
                    
                    const statTotal = document.getElementById('stat-total');
                    const statResolved = document.getElementById('stat-resolved');
                    const statRate = document.getElementById('stat-rate');
                    if (statTotal) statTotal.textContent = total;
                    if (statResolved) statResolved.textContent = resolved;
                    if (statRate) statRate.textContent = rate;
                }
            }
        }
    } catch (err) { console.error("Error loading profile:", err); }
}

function savePreferences() {
    const btn = document.getElementById('savePreferencesBtn');
    const msg = document.getElementById('prefMessage');
    if (!btn || !msg) return;

    btn.disabled = true;
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Simulate API call for preferences
    setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        msg.textContent = 'Preferences updated successfully!';
        msg.className = 'inline-msg success';
        msg.style.display = 'block';
        setTimeout(() => { msg.style.display = 'none'; }, 4000);
    }, 1200);
}

async function updatePassword() {
    const current = document.getElementById('currentPassword').value.trim();
    const newPass = document.getElementById('newUpdatePassword').value.trim();
    const confirm = document.getElementById('confirmUpdatePassword').value.trim();
    const msg = document.getElementById('passwordUpdateMessage');
    const btn = document.getElementById('updatePasswordBtn');

    if (!msg || !btn) return;

    if (newPass !== confirm) {
        msg.textContent = 'New passwords do not match';
        msg.className = 'inline-msg error';
        msg.style.display = 'block';
        return;
    }

    btn.disabled = true;
    const originalContent = btn.innerHTML;
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
            const errorText = await res.text();
            msg.textContent = errorText || 'Failed to update password';
            msg.className = 'inline-msg error';
        }
    } catch (err) {
        msg.textContent = 'Server connection failed';
        msg.className = 'inline-msg error';
    } finally {
        msg.style.display = 'block';
        btn.disabled = false;
        btn.innerHTML = originalContent;
        setTimeout(() => { if (msg.classList.contains('success')) msg.style.display = 'none'; }, 5000);
    }
}

// ── PROFILE EDITING ──

function toggleEditMode(field) {
    const row = document.getElementById(`row-${field}`);
    const valueEl = row.querySelector('.info-value');
    const inputEl = document.getElementById(`edit-${field}`);
    
    if (row.classList.contains('edit-mode')) {
        row.classList.remove('edit-mode');
    } else {
        // Pre-fill input
        inputEl.value = valueEl.textContent.trim();
        row.classList.add('edit-mode');
        inputEl.focus();
    }
}

async function saveProfileField(field) {
    const inputEl = document.getElementById(`edit-${field}`);
    const newValue = inputEl.value.trim();
    if (!newValue) return;

    const email = localStorage.getItem('userEmail');
    const currentName = document.getElementById('userName').textContent.trim();
    const currentPhone = document.getElementById('userPhone').textContent.trim();

    const updateData = {
        email: email,
        name: field === 'name' ? newValue : currentName,
        phone: field === 'phone' ? newValue : currentPhone
    };

    try {
        const res = await fetch(`${API_BASE}/auth/update-profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });

        if (res.ok) {
            // Update UI
            document.getElementById(`user${field.charAt(0).toUpperCase() + field.slice(1)}`).textContent = newValue;
            if (field === 'name') {
                const headName = document.getElementById('profileHeaderName');
                const headGreeting = document.getElementById('userNameHeader');
                if (headName) headName.textContent = newValue;
                if (headGreeting) headGreeting.textContent = newValue;
            }
            toggleEditMode(field);
            showMsg('message', 'Profile updated successfully!', 'success');
        } else {
            const err = await res.text();
            showMsg('message', err || 'Update failed', 'error');
        }
    } catch (err) {
        showMsg('message', 'Server error', 'error');
    }
}

// ── INITIALIZATION ──

document.addEventListener('DOMContentLoaded', () => {
    // Determine page and init
    syncNavbar();
    initModals();
    if (document.getElementById('statsRow')) loadDashboard();
    if (document.getElementById('reportForm') || document.querySelector('.report-form-card')) initReportPage();
    if (document.getElementById('chatToggle')) initializeChatBot();
    if (document.getElementById('accountSection')) loadProfileData();
    
    // Global Logout
    const lBtn = document.getElementById('logoutBtn');
    if (lBtn) lBtn.onclick = logout;
});
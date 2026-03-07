const API_BASE = 'http://localhost:8080/api';

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
    console.log(`MESSAGE ${type.toUpperCase()}: ${message}`);
}

function updateDebugInfo(message) {
    const debugElement = document.getElementById('debugText');
    if (debugElement) {
        debugElement.textContent = message;
    }
    console.log(`DEBUG: ${message}`);
}

function startOTPTimer(button, duration = 60) {
    let timeLeft = duration;
    const originalText = button.textContent;
    button.disabled = true;

    const timer = setInterval(() => {
        button.textContent = `Resend OTP (${timeLeft}s)`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timer);
            button.disabled = false;
            button.textContent = originalText;
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', function () {
    console.log('Page loaded - testing backend connection...');

    fetch(`${API_BASE}/auth/test`)
        .then(response => response.text())
        .then(result => {
            console.log('Backend connection: ' + result);
        })
        .catch(error => {
            console.error('Backend connection failed: ', error);
            showMessage('Backend connection failed. Make sure server is running on port 8080.', 'error');
        });

    initializeForgotPassword();

    initializeIssueDashboard();

    initializeChatBot();

    initializeProfilePreferences();

    initializePasswordUpdate();

    initializeUserLocationDisplay();

    initializeNotifications();
});

function initializeNotifications() {
    const bellBtn = document.getElementById('notificationBellBtn');
    const dropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');

    if (!bellBtn || !dropdown) return;

    bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');

        // Hide badge when notifications are checked and update last check time
        if (dropdown.classList.contains('show')) {
            if (badge) badge.style.display = 'none';
            localStorage.setItem('lastNotificationCheck', new Date().toISOString());
        }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });

    // Prevent closing when clicking inside the dropdown
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

async function fetchAndDisplayNotifications(userId) {
    const notificationList = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');

    if (!notificationList) return;

    try {
        const response = await fetch(`${API_BASE}/issues/user/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch user issues');

        const issues = await response.json();

        // Filter for RESOLVED or REJECTED issues
        const notificationIssues = issues.filter(issue =>
            issue.status === 'RESOLVED' || issue.status === 'REJECTED'
        );

        // Sort by updatedAt descending
        notificationIssues.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        const lastCheckStr = localStorage.getItem('lastNotificationCheck');
        const lastCheckDate = lastCheckStr ? new Date(lastCheckStr) : new Date(0);

        let unreadCount = 0;
        let htmlContent = '';

        if (notificationIssues.length === 0) {
            htmlContent = `
                <div class="notification-item" style="padding: 1rem; text-align: center; color: var(--text-muted); border-bottom: none;">
                    No new notifications
                </div>
            `;
        } else {
            notificationIssues.forEach(issue => {
                const updatedTime = new Date(issue.updatedAt || issue.resolvedAt || issue.createdAt);
                const isUnread = updatedTime > lastCheckDate;
                if (isUnread) unreadCount++;

                let iconHtml = '';
                let titleHtml = '';
                let descHtml = '';

                if (issue.status === 'RESOLVED') {
                    iconHtml = '<i class="fas fa-check-circle" style="color: var(--success-color);"></i>';
                    titleHtml = 'Issue Resolved';
                    descHtml = `Your report "${issue.title}" has been resolved.`;
                } else if (issue.status === 'REJECTED') {
                    iconHtml = '<i class="fas fa-times-circle" style="color: var(--danger-color);"></i>';
                    titleHtml = 'Issue Rejected';
                    descHtml = `Your report "${issue.title}" was rejected. ${issue.rejectionReason ? '<br>Reason: ' + issue.rejectionReason : ''}`;
                }

                // Format time nicely
                const timeStr = updatedTime.toLocaleDateString() + ' ' + updatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                htmlContent += `
                    <div class="notification-item ${isUnread ? 'unread' : ''}">
                        ${iconHtml}
                        <div class="notification-content">
                            <strong>${titleHtml}</strong>
                            <p>${descHtml}</p>
                            <span class="time">${timeStr}</span>
                        </div>
                    </div>
                `;
            });
        }

        notificationList.innerHTML = htmlContent;

        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }

    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
}

function initializeUserLocationDisplay() {
    const locationDisplay = document.getElementById('userLocationDisplay');
    if (!locationDisplay) return;

    if (!navigator.geolocation) {
        locationDisplay.innerHTML = '<i class="fas fa-map-marker-alt"></i> Location not supported';
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();

                let locationName = '';
                if (data.address) {
                    locationName = data.address.city || data.address.town || data.address.village || data.address.suburb || data.address.county || '';
                    if (locationName && data.address.state) {
                        locationName += ', ' + data.address.state;
                    }
                }

                if (locationName) {
                    locationDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${locationName}`;
                } else {
                    locationDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
                }
            } catch (error) {
                console.error('Error reverse geocoding:', error);
                locationDisplay.innerHTML = `<i class="fas fa-map-marker-alt"></i> Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
            }
        },
        (error) => {
            console.error('Geolocation error:', error);
            locationDisplay.innerHTML = '<i class="fas fa-map-marker-alt"></i> Location access denied';
        }
    );
}

function initializeForgotPassword() {
    const resetForm = document.getElementById('passwordResetForm');
    if (resetForm) {
        console.log('Forgot password page detected - initializing...');

        const sendResetOtpBtn = document.getElementById('sendResetOtpBtn');
        const emailInput = document.getElementById('resetEmail');
        const resetOtpGroup = document.getElementById('resetOtpGroup');
        const resetPasswordGroup = document.getElementById('resetPasswordGroup');
        const resetBtn = document.getElementById('resetBtn');

        if (sendResetOtpBtn) {
            sendResetOtpBtn.addEventListener('click', async function () {
                const email = emailInput.value.trim();

                if (!email) {
                    showMessage('Please enter your email address first', 'error');
                    return;
                }

                try {
                    showMessage('Sending Email OTP...', 'info');
                    sendResetOtpBtn.disabled = true;
                    sendResetOtpBtn.textContent = 'Sending...';

                    const response = await fetch(`${API_BASE}/auth/send-reset-otp`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: email })
                    });

                    const resultText = await response.text();
                    if (response.ok) {
                        showMessage('OTP sent to email! Check your inbox.', 'success');
                        resetOtpGroup.style.display = 'block';
                        resetPasswordGroup.style.display = 'block';
                        resetBtn.style.display = 'block';

                        startOTPTimer(sendResetOtpBtn);
                        document.getElementById('resetOtp').focus();
                    } else {
                        showMessage('Failed to send OTP: ' + resultText, 'error');
                        sendResetOtpBtn.disabled = false;
                        sendResetOtpBtn.textContent = 'Send OTP';
                    }
                } catch (error) {
                    console.error('OTP error:', error);
                    showMessage('Network error.', 'error');
                    sendResetOtpBtn.disabled = false;
                    sendResetOtpBtn.textContent = 'Send OTP';
                }
            });
        }

        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = emailInput.value.trim();
            const otp = document.getElementById('resetOtp').value.trim();
            const newPassword = document.getElementById('newPassword').value;

            if (!email || !otp || !newPassword) {
                showMessage('Please fill in all fields', 'error');
                return;
            }

            try {
                showMessage('Resetting password...', 'info');
                resetBtn.disabled = true;
                resetBtn.textContent = 'Processing...';

                const response = await fetch(`${API_BASE}/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: email,
                        otp: otp,
                        newPassword: newPassword
                    })
                });

                const resultText = await response.text();

                if (response.ok) {
                    showMessage('Password reset successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'reset-password.html';
                    }, 1500);
                } else {
                    showMessage(resultText, 'error');
                    resetBtn.disabled = false;
                    resetBtn.textContent = 'Reset Password';
                }
            } catch (error) {
                console.error('Reset error:', error);
                showMessage('Password reset failed.', 'error');
                resetBtn.disabled = false;
                resetBtn.textContent = 'Reset Password';
            }
        });
    }
}

if (document.getElementById('registerFormElement')) {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const phoneInput = document.getElementById('mobileNumber');
    const otpGroup = document.getElementById('otpGroup');
    const registerBtn = document.getElementById('registerBtn');

    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async function () {
            const email = document.getElementById('registerEmail').value.trim();

            if (!email) {
                showMessage('Please enter your email address first', 'error');
                return;
            }

            try {
                showMessage('Sending Email OTP...', 'info');
                sendOtpBtn.disabled = true;
                sendOtpBtn.textContent = 'Sending...';

                const response = await fetch(`${API_BASE}/auth/send-registration-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email })
                });

                const resultText = await response.text();
                if (response.ok) {
                    showMessage('OTP sent to email! Check your inbox.', 'success');
                    if (otpGroup) otpGroup.style.display = 'block';
                    startOTPTimer(sendOtpBtn);
                    const otpInput = document.getElementById('otpInput');
                    if (otpInput) otpInput.focus();
                } else {
                    showMessage('Failed to send OTP: ' + resultText, 'error');
                    sendOtpBtn.disabled = false;
                    sendOtpBtn.textContent = 'Send OTP';
                }
            } catch (error) {
                console.error('OTP error:', error);
                showMessage('Network error.', 'error');
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';
            }
        });
    }

    // Toggle Government ID field based on user type buttons
    const customerBtn = document.getElementById('customerBtn');
    const sellerBtn = document.getElementById('sellerBtn');
    const adminIdGroup = document.getElementById('adminIdGroup');
    const adminIdInput = document.getElementById('adminId');
    const formTitle = document.querySelector('.form-title');

    function setRole(role) {
        const adminDeptGroup = document.getElementById('adminDepartmentGroup');
        const adminDeptInput = document.getElementById('adminDepartment');

        if (role === 'municipal') {
            sellerBtn.classList.add('active');
            customerBtn.classList.remove('active');
            adminIdGroup.style.display = 'block';
            adminIdInput.setAttribute('required', 'true');
            if (adminDeptGroup) adminDeptGroup.style.display = 'block';
            if (adminDeptInput) adminDeptInput.setAttribute('required', 'true');
            if (formTitle) formTitle.textContent = 'Municipal Registration';
        } else {
            customerBtn.classList.add('active');
            sellerBtn.classList.remove('active');
            adminIdGroup.style.display = 'none';
            adminIdInput.removeAttribute('required');
            adminIdInput.value = '';
            if (adminDeptGroup) adminDeptGroup.style.display = 'none';
            if (adminDeptInput) {
                adminDeptInput.removeAttribute('required');
                adminDeptInput.value = '';
            }
            if (formTitle) formTitle.textContent = 'Citizen Registration';
        }
    }

    if (customerBtn && sellerBtn && adminIdGroup) {
        customerBtn.addEventListener('click', () => setRole('citizen'));
        sellerBtn.addEventListener('click', () => setRole('municipal'));
    }

    document.getElementById('registerFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('registerName').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            phone: document.getElementById('mobileNumber').value.trim(),
            password: document.getElementById('registerPassword').value,
            otp: document.getElementById('otpInput') ? document.getElementById('otpInput').value.trim() : '',
            password: document.getElementById('registerPassword').value,
            otp: document.getElementById('otpInput') ? document.getElementById('otpInput').value.trim() : '',
            role: document.getElementById('sellerBtn').classList.contains('active') ? 'ADMIN' : 'CITIZEN'
        };

        if (formData.role === 'ADMIN') {
            const adminId = document.getElementById('adminId').value.trim();
            const adminDepartment = document.getElementById('adminDepartment') ? document.getElementById('adminDepartment').value.trim() : '';

            if (!adminId) {
                showMessage('Please enter your Government Unique ID', 'error');
                return;
            }
            if (!/^\d{8}$/.test(adminId)) {
                showMessage('Government Unique ID must be exactly 8 digits', 'error');
                return;
            }
            if (!adminDepartment) {
                showMessage('Please select your Department', 'error');
                return;
            }

            formData.adminId = adminId;
            formData.department = adminDepartment;
        }

        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.otp) {
            showMessage('Please fill in all fields including OTP', 'error');
            return;
        }

        if (formData.password !== confirmPassword) {
            showMessage('Passwords do not match', 'error');
            return;
        }

        try {
            showMessage('Creating account...', 'info');
            if (registerBtn) {
                registerBtn.disabled = true;
                registerBtn.textContent = 'Creating Account...';
            }

            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const resultText = await response.text();

            if (response.ok) {
                showMessage('Registration successful! Redirecting...', 'success');
                setTimeout(() => {
                    const loginToggle = document.getElementById('loginToggle');
                    if (loginToggle) {
                        loginToggle.click();
                        // Reset form
                        document.getElementById('registerFormElement').reset();
                        if (otpGroup) otpGroup.style.display = 'none';
                        if (sendOtpBtn) {
                            sendOtpBtn.disabled = false;
                            sendOtpBtn.textContent = 'Send OTP';
                        }
                    } else {
                        window.location.href = 'login.html';
                    }
                }, 2000);
            } else {
                showMessage(resultText, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Registration failed.', 'error');
        } finally {
            if (registerBtn) {
                registerBtn.disabled = false;
                registerBtn.textContent = 'Create Account';
            }
        }
    });
}

// Login Role Toggle Logic
const loginCustomerBtn = document.getElementById('loginCustomerBtn');
const loginSellerBtn = document.getElementById('loginSellerBtn');
const loginEmailLabel = document.getElementById('loginEmailLabel');
const loginEmailInput = document.getElementById('loginEmail');

if (loginCustomerBtn && loginSellerBtn && loginEmailLabel && loginEmailInput) {
    function setLoginRole(role) {
        if (role === 'municipal') {
            loginSellerBtn.classList.add('active');
            loginCustomerBtn.classList.remove('active');
            loginEmailLabel.textContent = 'Government Unique ID';
            loginEmailInput.placeholder = 'Enter Government ID';
            loginEmailInput.type = 'text';
        } else {
            loginCustomerBtn.classList.add('active');
            loginSellerBtn.classList.remove('active');
            loginEmailLabel.textContent = 'Email Address';
            loginEmailInput.placeholder = 'you@example.com';
            loginEmailInput.type = 'email';
        }
    }

    loginCustomerBtn.addEventListener('click', () => setLoginRole('citizen'));
    loginSellerBtn.addEventListener('click', () => setLoginRole('municipal'));
}

if (document.getElementById('loginFormElement')) {
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();

        const isMunicipalStaff = document.getElementById('loginSellerBtn').classList.contains('active');
        const attemptedRole = isMunicipalStaff ? 'ADMIN' : 'CITIZEN';

        const loginData = {
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value,
            role: attemptedRole
        };

        if (!loginData.email || !loginData.password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        try {
            showMessage('Signing in...', 'info');

            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(loginData)
            });

            const resultText = await response.text();

            if (response.ok) {
                const data = JSON.parse(resultText);

                if (data.role !== attemptedRole) {
                    showMessage('Unauthorized access: Please select the correct user type for this account.', 'error');
                    return;
                }

                showMessage('Login successful! Redirecting...', 'success');

                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', data.email);
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userId', data.userId);

                setTimeout(() => {
                    if (data.role === 'ADMIN') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 1000);
            } else {
                let errorMsg = resultText;
                try {
                    const errData = JSON.parse(resultText);
                    if (errData.message) errorMsg = errData.message;
                } catch (e) {
                }
                showMessage(errorMsg || 'Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Login failed. Please check your connection.', 'error');
        }
    });
}

if (document.getElementById('userName')) {
    document.addEventListener('DOMContentLoaded', function () {
        console.log('Dashboard/home page initialization started');
        updateDebugInfo('Page loaded, checking authentication...');

        const userEmail = localStorage.getItem('userEmail');
        const isLoggedIn = localStorage.getItem('isLoggedIn');

        console.log('Auth check - Logged in:', isLoggedIn);
        console.log('Stored email:', userEmail);

        if (!isLoggedIn || !userEmail) {
            updateDebugInfo('Not authenticated, redirecting to login...');
            console.log('No authentication found, redirecting to login');
            showMessage('Please login first', 'error');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        updateDebugInfo(`Fetching data for: ${userEmail}`);
        loadUserData(userEmail);
    });
}

function loadUserData(userEmail) {
    const userUrl = `${API_BASE}/auth/user?email=${encodeURIComponent(userEmail)}`;
    console.log('API URL:', userUrl);
    updateDebugInfo(`Calling: ${userUrl}`);

    fetch(userUrl)
        .then(response => {
            console.log('Raw response:', response);
            updateDebugInfo(`Response status: ${response.status}`);

            if (response.status === 404) {
                return response.text().then(errorMessage => {
                    throw new Error(`User not found: ${errorMessage}`);
                });
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            return response.json();
        })
        .then(user => {
            console.log('User data received:', user);
            updateDebugInfo(`Data received for: ${user.name}`);

            if (user && typeof user === 'object') {
                if (document.getElementById('userName')) document.getElementById('userName').textContent = user.name || 'Unknown';
                if (document.getElementById('profileHeaderName')) document.getElementById('profileHeaderName').textContent = user.name || 'Your Profile';
                if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = user.email || 'Not provided';
                if (document.getElementById('userPhone')) document.getElementById('userPhone').textContent = user.phone || 'Not provided';
                if (document.getElementById('userId')) document.getElementById('userId').textContent = user.id || 'Unknown';

                console.log('UI updated successfully');
                updateDebugInfo('User data loaded successfully!');

                showMessage(`Welcome back, ${user.name}!`, 'success');

                if (document.getElementById('analyticsSummary')) {
                    loadAnalyticsSummary();
                }

                if (user.id) {
                    fetchAndDisplayNotifications(user.id);
                }
            } else {
                throw new Error('Invalid user data format received');
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            updateDebugInfo(`Error: ${error.message}`);

            if (document.getElementById('userName')) document.getElementById('userName').textContent = 'Error Loading';
            if (document.getElementById('userEmail')) document.getElementById('userEmail').textContent = userEmail;
            if (document.getElementById('userPhone')) document.getElementById('userPhone').textContent = 'Check Console';
            if (document.getElementById('userId')) document.getElementById('userId').textContent = 'N/A';

            showMessage(`Failed to load user data: ${error.message}`, 'error');
        });
}

if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', function () {
        console.log('Logout initiated');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
        console.log('localStorage cleared');
        showMessage('Logged out successfully', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });
}

function initializeIssueDashboard() {
    const issueForm = document.getElementById('issueForm');
    if (!issueForm) {
        return;
    }

    console.log('Initializing issue reporting dashboard');

    const useLocationBtn = document.getElementById('useLocationBtn');
    const locationText = document.getElementById('locationText');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                showMessage('Geolocation is not supported in this browser.', 'error');
                return;
            }

            showMessage('Detecting your location...', 'info');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    latInput.value = latitude;
                    lngInput.value = longitude;
                    if (locationText) {
                        locationText.textContent = `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}`;
                    }
                    showMessage('Location captured successfully.', 'success');
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    showMessage('Unable to get your location. Please allow location access or enter address manually.', 'error');
                }
            );
        });
    }

    if (issueForm && !issueForm.dataset.listenerAttached) {
        issueForm.dataset.listenerAttached = 'true';
        issueForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userEmail = localStorage.getItem('userEmail');
            const reporterName = document.getElementById('userName')
                ? document.getElementById('userName').textContent
                : '';
            const reporterPhone = document.getElementById('userPhone')
                ? document.getElementById('userPhone').textContent
                : '';

            const formData = new FormData();
            formData.append('title', document.getElementById('issueTitle').value.trim());
            formData.append('description', document.getElementById('issueDescription').value.trim());
            formData.append('category', document.getElementById('issueCategory').value);
            formData.append('priority', document.getElementById('issuePriority').value);
            formData.append('address', document.getElementById('issueAddress').value.trim());

            const lat = latInput.value;
            const lng = lngInput.value;
            if (lat) formData.append('latitude', lat);
            if (lng) formData.append('longitude', lng);

            if (reporterName) formData.append('reporterName', reporterName);
            if (userEmail) formData.append('reporterEmail', userEmail);
            if (reporterPhone && reporterPhone !== 'Not provided') {
                formData.append('reporterPhone', reporterPhone);
            }

            const photoInput = document.getElementById('issuePhoto');
            if (photoInput && photoInput.files && photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            if (!formData.get('title') || !formData.get('category')) {
                showMessage('Please provide at least a title and category for the issue.', 'error');
                return;
            }

            try {
                showMessage('Submitting issue...', 'info');

                const response = await fetch(`${API_BASE}/issues`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || 'Failed to submit issue');
                }

                const savedIssue = await response.json();
                console.log('Issue created:', savedIssue);
                showMessage('Issue submitted successfully!', 'success');

                issueForm.reset();
                if (locationText) {
                    locationText.textContent = 'No location selected';
                }
                latInput.value = '';
                lngInput.value = '';

                if (userEmail) {
                    loadUserIssues(userEmail);
                }
                loadAnalyticsSummary();
            } catch (err) {
                console.error('Issue submission error:', err);
                showMessage(`Failed to submit issue: ${err.message}`, 'error');
            }
        });
    }
}



async function loadAnalyticsSummary() {
    const container = document.getElementById('analyticsSummary');
    if (!container) return;

    try {
        container.innerHTML = '<p>Loading analytics...</p>';
        const resp = await fetch(`${API_BASE}/admin/analytics/summary`);
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const data = await resp.json();

        container.innerHTML = '';

        const totalCard = document.createElement('div');
        totalCard.className = 'analytics-card';
        totalCard.innerHTML = `
            <h4>Total Issues</h4>
            <div class="seperatediv"><strong>${data.totalIssues ?? 0}</strong> reported</div>
        `;
        container.appendChild(totalCard);

        const statusMap = data.byStatus || {};
        Object.keys(statusMap).forEach(key => {
            const card = document.createElement('div');
            card.className = 'analytics-card';
            card.innerHTML = `
                <h4>Status: ${key}</h4>
                <div class="seperatediv"><strong>${statusMap[key]}</strong> reported</div>
            `;
            container.appendChild(card);
        });

        const catMap = data.byCategory || {};
        Object.keys(catMap).forEach(key => {
            const card = document.createElement('div');
            card.className = 'analytics-card';
            card.innerHTML = `
                <h4>Category: ${key}</h4>
                <div class="seperatediv"><strong>${catMap[key]}</strong> reported</div>
            `;
            container.appendChild(card);
        });

        const avgCard = document.createElement('div');
        avgCard.className = 'analytics-card';
        avgCard.innerHTML = `
            <h4>Avg. Resolution Time</h4>
            <div class="seperatediv"><strong>${(data.avgResolutionHours || 0).toFixed(2)}</strong> hours (resolved issues)</div>
        `;
        container.appendChild(avgCard);
    } catch (err) {
        console.error('Failed to load analytics:', err);
        container.innerHTML = '<p>Failed to load analytics data.</p>';
    }
}

function initializeChatBot() {
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatToggle || !chatWindow || !chatForm || !chatInput || !chatMessages) {
        return;
    }

    function openChat() {
        chatWindow.classList.add('open');
        chatWindow.setAttribute('aria-hidden', 'false');
        chatInput.focus();

        if (!chatMessages.dataset.initialized) {
            addBotMessage("Hi there! 👋 I'm your friendly CrowdCivics assistant. How can I help you make our city better today?");
            chatMessages.dataset.initialized = 'true';
        }
    }

    function closeChat() {
        chatWindow.classList.remove('open');
        chatWindow.setAttribute('aria-hidden', 'true');
    }

    function addMessage(text, sender) {
        const msg = document.createElement('div');
        msg.className = `chat-message ${sender}`;
        msg.textContent = text;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addBotMessage(text) {
        addMessage(text, 'bot');
    }

    function getBotReply(text) {
        const t = text.toLowerCase();

        // Friendly greetings
        if (t === 'hi' || t === 'hello' || t === 'hey' || t.includes('hey there')) {
            return "Hey there! 👋 I'm your friendly neighborhood CrowdCivics bot. How's it going today? Need any help with reporting issues or checking your profile?";
        }
        if (t.includes('how are you') || t.includes('whats up') || t.includes("what's up")) {
            return "I'm doing great, thanks for asking! 😊 Just hanging out here waiting to help you make our city better. What's on your mind?";
        }
        if (t.includes('thanks') || t.includes('thank you')) {
            return "You're very welcome! Let me know if you need anything else. Have an awesome day! 🌟";
        }
        if (t === 'bye' || t === 'goodbye' || t.includes('see ya')) {
            return "Catch you later! Keep up the great work in the community! 👋";
        }

        // Feature-specific friendly responses
        if (t.includes('register') || t.includes('sign up') || t.includes('account')) {
            return "Getting set up is super easy! Just head over to the landing page, hit 'Create Account', pop in your details and verify your OTP. You'll be ready to go in no time! 🚀";
        }
        if (t.includes('login') || t.includes('sign in')) {
            return "Just hop over to the Login page and use your email and password. Once you're in, we'll take you straight to your dashboard! 🔑";
        }
        if (t.includes('report') || t.includes('issue') || t.includes('problem')) {
            return "Spotted a problem? No worries! 🛠️ Just go to 'Report Issue' on your dashboard. Tell us what's wrong, add a photo if you have one, pin the location, and hit submit. We'll take it from there!";
        }
        if (t.includes('status') || t.includes('track') || t.includes('progress')) {
            return "Curious about your reports? 🕵️‍♂️ You can track them all in the 'My Reports' section on your dashboard. We'll keep you posted if the status is NEW, IN_PROGRESS, or RESOLVED!";
        }
        if (t.includes('analytics') || t.includes('overview') || t.includes('statistics') || t.includes('chart')) {
            return "Oh, you want the big picture? 📊 Check out the 'City Overview' section! It shows you all the cool stats like total issues reported, how quickly we're fixing things, and what types of issues are common down your street.";
        }
        if (t.includes('profile') || t.includes('name') || t.includes('phone') || t.includes('email')) {
            return "Your profile is where you keep all your personal details up to date! 👤 We attach this info to your reports so the city staff knows who the local hero is and can contact you if they need to.";
        }

        // Friendly fallback
        return "I'm still learning, so I might not understand everything perfectly yet! 😅 But I'm great at helping with registration, logging in, reporting issues, or checking analytics. Want to chat about one of those?";
    }

    chatToggle.addEventListener('click', () => {
        if (chatWindow.classList.contains('open')) {
            closeChat();
        } else {
            openChat();
        }
    });

    if (chatClose) {
        chatClose.addEventListener('click', () => {
            closeChat();
        });
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        const reply = getBotReply(text);
        setTimeout(() => {
            addBotMessage(reply);
        }, 300);
    });
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

window.testPassword = function (password) {
    fetch(`${API_BASE}/auth/test-password?password=${encodeURIComponent(password)}`)
        .then(response => response.text())
        .then(result => console.log('Password test:', result));
};

window.testUser = function (email) {
    fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(email)}`)
        .then(response => response.json())
        .then(result => console.log('User test:', result))
        .catch(error => console.log('User test error:', error));
};

window.debugOTP = function (email, purpose = 'PASSWORD_RESET') {
    fetch(`${API_BASE}/auth/debug/otp-status?email=${encodeURIComponent(email)}&purpose=${purpose}`)
        .then(response => response.text())
        .then(result => console.log('OTP Debug:', result))
        .catch(error => console.log('OTP Debug error:', error));
};

document.addEventListener('DOMContentLoaded', () => {
    const adminToggle = document.getElementById('adminLoginToggle');
    const emailLabel = document.getElementById('emailLabel');
    const emailInput = document.getElementById('email');

    if (adminToggle && emailLabel && emailInput) {
        adminToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                emailLabel.textContent = 'Government Admin ID';
                emailInput.placeholder = 'Enter your Admin ID';
            } else {
                emailLabel.textContent = 'Email Address';
                emailInput.placeholder = 'Enter your email';
            }
        });
    }
});

function initReportPage() {
    const getLocationBtn = document.getElementById('getLocationBtn');
    const locationInfo = document.getElementById('locationInfo');
    const coordsSpan = document.getElementById('coords');
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');

    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                getLocationBtn.textContent = 'Acquiring Location...';
                getLocationBtn.disabled = true;

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;

                        latInput.value = lat;
                        lngInput.value = lng;

                        if (coordsSpan) coordsSpan.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        if (locationInfo) locationInfo.style.display = 'flex';
                        getLocationBtn.innerHTML = '✅ Location Secured';
                        getLocationBtn.classList.remove('btn-secondary');
                        getLocationBtn.classList.add('btn-primary');
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert("Unable to retrieve your location. Please ensure location services are enabled.");
                        getLocationBtn.textContent = '📍 Retry Location';
                        getLocationBtn.disabled = false;
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
            }
        });
    }

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const photoDataInput = document.getElementById('photoData');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageFile(file);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageFile(file);
            }
        });
    }

    async function handleImageFile(file) {
        const p = dropZone.querySelector('p');
        if (p) {
            p.textContent = `⏳ Checking image for AI edits...`;
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await fetch("http://localhost:3000/check-image", {
                method: "POST",
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                if (data.ai_probability > 5) {
                    alert("edited by using ai");
                    if (p) p.textContent = `📸 Click to take a photo or upload`;
                    fileInput.value = ""; // Reset file input
                    if (imagePreview) {
                        imagePreview.src = "";
                        imagePreview.style.display = 'none';
                    }
                    if (photoDataInput) photoDataInput.value = "";
                    return; // Reject image
                }
            } else {
                console.warn("AI check failed or service unavailable, allowing image upload.");
            }
        } catch (error) {
            console.error("Error connecting to AI image detector:", error);
            // Decide if you want to block upload if service is down. For now, we proceed.
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (imagePreview) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            if (photoDataInput) photoDataInput.value = e.target.result;
            if (p) p.textContent = `✅ ${file.name} selected (AI Check Passed)`;
        };
        reader.readAsDataURL(file);
    }

    const reportForm = document.getElementById('reportForm');
    if (reportForm && !reportForm.dataset.listenerAttached) {
        reportForm.dataset.listenerAttached = 'true';
        reportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!localStorage.getItem('isLoggedIn')) {
                alert("You must be logged in to report an issue.");
                window.location.href = 'login.html';
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            const userEmail = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');

            const issueData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                category: document.getElementById('category').value,
                latitude: document.getElementById('latitude').value,
                longitude: document.getElementById('longitude').value,
                address: document.getElementById('address') ? document.getElementById('address').value : null,
                photoUrl: document.getElementById('photoData') ? document.getElementById('photoData').value : null,
                reporterEmail: userEmail,
                reporterId: userId ? parseInt(userId) : null
            };

            try {
                const response = await fetch(`${API_BASE}/issues`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(issueData)
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(`Issue Reported Successfully!`);
                    window.location.href = 'dashboard.html';
                } else {
                    const errorText = await response.text();
                    alert(`Failed to submit report: ${errorText}`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Report';
                }
            } catch (error) {
                console.error('Error reporting issue:', error);
                alert('An error occurred. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Report';
            }
        });
    }
}

function initDashboardPage() {
    const userNameSpan = document.getElementById('userName');
    const issueList = document.getElementById('issueList');
    const analyticsSummary = document.getElementById('analyticsSummary');

    const userName = localStorage.getItem('userEmail') || 'Citizen';
    if (userNameSpan) userNameSpan.textContent = userName.split('@')[0];

    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    loadUserIssues();

    async function loadUserIssues() {
        const userId = localStorage.getItem('userId');
        if (!userId) {
            if (issueList) issueList.innerHTML = '<p class="message info">User ID not found. Please log in again.</p>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/issues/user/${userId}`);
            if (response.ok) {
                const issues = await response.json();
                renderIssues(issues);
                updateAnalytics(issues);
            } else {
                if (issueList) issueList.innerHTML = '<p class="message error">Failed to load issues.</p>';
            }
        } catch (error) {
            console.error('Error loading issues:', error);
            if (issueList) issueList.innerHTML = '<p class="message error">Error loading issues.</p>';
        }
    }

    window.dashboardIssues = [];

    function renderIssues(issues) {
        if (!issueList) return;

        if (!issues || issues.length === 0) {
            issueList.innerHTML = '<p class="message info">You haven\'t reported any issues yet.</p>';
            return;
        }

        // Sort by date descending
        issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        window.dashboardIssues = issues;

        renderIssueList(3);
    }

    window.renderIssueList = function (limit) {
        if (!issueList) return;
        const issuesToRender = window.dashboardIssues.slice(0, limit);
        const hasMore = limit < window.dashboardIssues.length;

        let html = issuesToRender.map(issue => {
            let feedbackHtml = '';

            if (issue.status === 'RESOLVED' || issue.status === 'REJECTED') {
                if (issue.rating != null) {
                    // Show existing feedback
                    let stars = '';
                    for (let i = 1; i <= 5; i++) {
                        stars += i <= issue.rating ? '★' : '☆';
                    }
                    feedbackHtml = `
                    <div class="feedback-section" style="margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 5px 0; font-size: 0.95rem;">Your Feedback</h4>
                        <div style="color: #f59e0b; font-size: 1.2rem; margin-bottom: 5px;">${stars}</div>
                        ${issue.feedback ? `<p style="margin: 0; font-size: 0.9rem; color: #475569;">"${escapeHtml(issue.feedback)}"</p>` : ''}
                    </div>`;
                } else {
                    // Show feedback form for resolved/rejected statuses
                    feedbackHtml = `
                    <div class="feedback-section" style="margin-top: 15px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem;">Rate Experience</h4>
                        <form onsubmit="submitFeedback(event, ${issue.id})" class="feedback-form">
                            <div class="star-rating" style="color: #ccc; font-size: 1.5rem; cursor: pointer; margin-bottom: 10px;" id="star-rating-${issue.id}">
                                <span onclick="setRating(${issue.id}, 1)">★</span>
                                <span onclick="setRating(${issue.id}, 2)">★</span>
                                <span onclick="setRating(${issue.id}, 3)">★</span>
                                <span onclick="setRating(${issue.id}, 4)">★</span>
                                <span onclick="setRating(${issue.id}, 5)">★</span>
                                <input type="hidden" id="rating-${issue.id}" required>
                            </div>
                            <textarea id="feedback-${issue.id}" rows="2" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-bottom: 10px;" placeholder="Leave a comment (optional)..."></textarea>
                            <button type="submit" class="btn-primary" style="padding: 5px 10px; font-size: 0.85rem;">Submit Feedback</button>
                        </form>
                    </div>`;
                }
            }

            return `
            <div class="issue-card">
                <div class="issue-card-header">
                    <span class="issue-title">${escapeHtml(issue.title)}</span>
                    <span class="issue-status status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    Reported on ${new Date(issue.createdAt).toLocaleDateString()} • ${issue.category}
                </div>
                <div class="issue-description">${escapeHtml(issue.description)}</div>
                ${issue.photoUrl ? `<div style="margin-top: 10px;"><img src="${issue.photoUrl}" class="issue-photo-thumb" alt="Issue Photo"></div>` : ''}
                ${issue.status === 'REJECTED' && issue.rejectionReason ? `
                    <div style="margin-top: 15px; padding: 10px; border-left: 4px solid #ef4444; background: #fef2f2; border-radius: 4px;">
                        <h4 style="margin: 0 0 5px 0; font-size: 0.95rem; color: #b91c1c;">Rejection Reason</h4>
                        <p style="margin: 0; font-size: 0.9rem; color: #7f1d1d;">${escapeHtml(issue.rejectionReason)}</p>
                    </div>
                ` : ''}
                ${issue.assignedDepartment ? `<div class="issue-meta" style="margin-top:8px;">Has been assigned to: <strong>${issue.assignedDepartment}</strong></div>` : ''}
                
                ${issue.status === 'RESOLVED' && issue.resolutionPhotoUrl ? `
                    <div style="margin-top: 15px; border-top: 1px dashed #e2e8f0; padding-top: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h4 style="margin: 0; font-size: 0.95rem; color: #15803d;">Resolution Proof</h4>
                            <div>
                                <button type="button" onclick="viewPhoto('${issue.resolutionPhotoUrl}')" class="btn-secondary" style="padding: 4px 8px; font-size: 0.8rem;">View Proof</button>
                            </div>
                        </div>
                    </div>` : ''}

                ${feedbackHtml}
            </div>
            `;
        }).join('');

        if (hasMore) {
            html += `<div style="text-align: center; margin-top: 20px;">
                        <button type="button" onclick="renderIssueList(${limit + 3})" class="btn-secondary">View More</button>
                     </div>`;
        }

        issueList.innerHTML = html;
    }

    function updateAnalytics(issues) {
        if (!analyticsSummary) return;

        const total = issues.length;

        analyticsSummary.innerHTML = `
            <div class="analytics-card">
                <h4>My Reports</h4>
                <p>${total}</p>
            </div>
        `;
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

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path.includes('dashboard.html')) {
        initDashboardPage();
    } else if (path.includes('report.html')) {
        initReportPage();
    }

    // Password Toggle Logic
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    const loginPassword = document.getElementById('loginPassword');

    if (toggleLoginPassword && loginPassword) {
        toggleLoginPassword.addEventListener('click', () => {
            const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            loginPassword.setAttribute('type', type);
            toggleLoginPassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
        });
    }

    const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
    const registerPassword = document.getElementById('registerPassword');

    if (toggleRegisterPassword && registerPassword) {
        toggleRegisterPassword.addEventListener('click', () => {
            const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            registerPassword.setAttribute('type', type);
            toggleRegisterPassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
        });
    }
});

// Feedback functionality
window.setRating = function (issueId, rating) {
    const starContainer = document.getElementById(`star-rating-${issueId}`);
    if (!starContainer) return;

    document.getElementById(`rating-${issueId}`).value = rating;

    const stars = starContainer.getElementsByTagName('span');
    for (let i = 0; i < stars.length; i++) {
        if (i < rating) {
            stars[i].style.color = '#f59e0b';
        } else {
            stars[i].style.color = '#ccc';
        }
    }
};

window.submitFeedback = async function (e, issueId) {
    e.preventDefault();
    const ratingInput = document.getElementById(`rating-${issueId}`);
    const rating = ratingInput ? parseInt(ratingInput.value) : null;
    const feedback = document.getElementById(`feedback-${issueId}`) ? document.getElementById(`feedback-${issueId}`).value : null;

    if (!rating) {
        alert('Please select a star rating.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/issues/${issueId}/feedback`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ rating, feedback })
        });

        if (response.ok) {
            alert('Feedback submitted successfully!');
            window.location.reload();
        } else {
            const errorText = await response.text();
            alert(`Failed to submit feedback: ${errorText}`);
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        alert('An error occurred. Please try again.');
    }
};

window.viewPhoto = function (url) {
    const w = window.open("");
    w.document.write(`<img src="${url}" style="max-width: 100%; height: auto; display: block; margin: 0 auto; object-fit: contain;">`);
};

window.downloadPhoto = function (url, filename) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

function initializeProfilePreferences() {
    const saveBtn = document.getElementById('savePreferencesBtn');
    const emailUpdates = document.getElementById('prefEmailUpdates');
    const smsAlerts = document.getElementById('prefSmsAlerts');
    const newsletter = document.getElementById('prefNewsletter');

    if (!saveBtn || !emailUpdates || !smsAlerts || !newsletter) {
        return;
    }

    const savedEmail = localStorage.getItem('prefEmailUpdates');
    const savedSms = localStorage.getItem('prefSmsAlerts');
    const savedNews = localStorage.getItem('prefNewsletter');

    if (savedEmail !== null) emailUpdates.checked = savedEmail === 'true';
    if (savedSms !== null) smsAlerts.checked = savedSms === 'true';
    if (savedNews !== null) newsletter.checked = savedNews === 'true';

    saveBtn.addEventListener('click', function () {
        localStorage.setItem('prefEmailUpdates', emailUpdates.checked);
        localStorage.setItem('prefSmsAlerts', smsAlerts.checked);
        localStorage.setItem('prefNewsletter', newsletter.checked);

        saveBtn.textContent = 'Saved!';
        saveBtn.disabled = true;

        showMessage('Notification preferences saved successfully.', 'success');

        setTimeout(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }, 2000);
    });
}

function initializePasswordUpdate() {
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    const messageDiv = document.getElementById('passwordUpdateMessage');

    if (!updatePasswordForm || !updatePasswordBtn || !messageDiv) return;

    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newUpdatePassword').value;
        const confirmPassword = document.getElementById('confirmUpdatePassword').value;
        const userEmail = localStorage.getItem('userEmail');

        messageDiv.textContent = '';
        messageDiv.style.color = '';

        if (!currentPassword || !newPassword || !confirmPassword) {
            messageDiv.textContent = 'Please fill in all fields.';
            messageDiv.style.color = 'red';
            return;
        }

        if (newPassword !== confirmPassword) {
            messageDiv.textContent = 'New passwords do not match.';
            messageDiv.style.color = 'red';
            return;
        }

        if (!userEmail) {
            messageDiv.textContent = 'User email not found. Please log in again.';
            messageDiv.style.color = 'red';
            return;
        }

        try {
            updatePasswordBtn.disabled = true;
            updatePasswordBtn.textContent = 'Updating...';

            const response = await fetch(`${API_BASE}/auth/update-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: userEmail,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const resultText = await response.text();

            if (response.ok) {
                messageDiv.textContent = 'Password updated successfully!';
                messageDiv.style.color = 'green';
                updatePasswordForm.reset();
            } else {
                messageDiv.textContent = resultText || 'Failed to update password.';
                messageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Password update error:', error);
            messageDiv.textContent = 'Network error occurred.';
            messageDiv.style.color = 'red';
        } finally {
            updatePasswordBtn.disabled = false;
            updatePasswordBtn.textContent = 'Update Password';
        }
    });
}
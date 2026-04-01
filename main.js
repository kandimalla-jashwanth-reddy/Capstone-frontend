const API_BASE = 'http://localhost:8080/api';

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = message;
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

        if (dropdown.classList.contains('show')) {
            if (badge) badge.style.display = 'none';
            localStorage.setItem('lastNotificationCheck', new Date().toISOString());
        }
    });

    document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && dropdown.classList.contains('show')) {
            dropdown.classList.remove('show');
        }
    });

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

        const notificationIssues = issues.filter(issue =>
            ['RESOLVED', 'REJECTED', 'IN_PROGRESS', 'NEW'].includes(issue.status)
        );

        // Sort by the latest update time
        notificationIssues.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.resolvedAt || a.createdAt);
            const timeB = new Date(b.updatedAt || b.resolvedAt || b.createdAt);
            return timeB - timeA;
        });

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
                } else if (issue.status === 'IN_PROGRESS') {
                    iconHtml = '<i class="fas fa-spinner fa-spin" style="color: var(--warning-color);"></i>';
                    titleHtml = 'Issue In Progress';
                    descHtml = `Work has started on your report "${issue.title}".`;
                } else if (issue.status === 'NEW') {
                    iconHtml = '<i class="fas fa-file-alt" style="color: var(--primary-color);"></i>';
                    titleHtml = 'Report Received';
                    descHtml = `Your report "${issue.title}" has been successfully submitted and is under review.`;
                }

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
                    const a = data.address;
                    const parts = [
                        a.neighbourhood || a.suburb || a.city_district || a.quarter,
                        a.city || a.town || a.village || a.county
                    ].filter(Boolean);
                    
                    locationName = parts.length > 0 ? parts.join(', ') : (data.display_name || '');
                    
                    if (locationName && a.state && !locationName.includes(a.state)) {
                        locationName += ', ' + a.state;
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
    const registerEmailInput = document.getElementById('registerEmail');
    if (registerEmailInput) {
        registerEmailInput.addEventListener('blur', async function() {
            const email = this.value.trim();
            if (!email || !email.includes('@')) return;

            try {
                const response = await fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(email)}`);
                if (response.ok) {
                    showMessage('This email is already registered. Please sign in instead.', 'error');
                    this.classList.add('input-error');
                    if (sendOtpBtn) sendOtpBtn.disabled = true;
                } else {
                    this.classList.remove('input-error');
                    if (sendOtpBtn) sendOtpBtn.disabled = false;
                }
            } catch (error) {
                console.error('Email check failed:', error);
            }
        });
    }

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
                    if (resultText === 'Email already registered') {
                        showMessage('This email is already registered. <a href="login.html" style="color:white; text-decoration:underline;">Click here to Login</a>', 'error');
                    } else {
                        showMessage('Failed to send OTP: ' + resultText, 'error');
                    }
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

    const customerBtn = document.getElementById('customerBtn');
    const sellerBtn = document.getElementById('sellerBtn');
    const adminIdGroup = document.getElementById('adminIdGroup');
    const adminIdInput = document.getElementById('adminId');
    const formTitle = document.querySelector('.form-title');

    function setRole(role) {
        if (role === 'municipal') {
            sellerBtn.classList.add('active');
            customerBtn.classList.remove('active');
            adminIdGroup.style.display = 'block';
            adminIdInput.setAttribute('required', 'true');
            if (formTitle) formTitle.textContent = 'Municipal Registration';
        } else {
            customerBtn.classList.add('active');
            sellerBtn.classList.remove('active');
            adminIdGroup.style.display = 'none';
            adminIdInput.removeAttribute('required');
            adminIdInput.value = '';
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

            if (!adminId) {
                showMessage('Please enter your Government Unique ID', 'error');
                return;
            }
            if (!/^\d{8}$/.test(adminId)) {
                showMessage('Government Unique ID must be exactly 8 digits', 'error');
                return;
            }

            formData.adminId = adminId;
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
                if (resultText === 'Email already registered') {
                    showMessage('This email is already registered. <a href="login.html" style="color:white; text-decoration:underline;">Click here to Login</a>', 'error');
                } else {
                    showMessage(resultText, 'error');
                }
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

                // showMessage(`Welcome back, ${user.name}!`, 'success');

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
                    loadUserIssues();
                    const userId = localStorage.getItem('userId');
                    if (userId) fetchAndDisplayNotifications(userId);
                }
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

        const reply = window.getBotReply(text);
        setTimeout(() => {
            addBotMessage(reply);
        }, 300);
    });
}

window.getBotReply = function (text) {
    const t = text.toLowerCase();

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

    if (t.includes('register the issue') || t.includes('how to report') || t.includes('submit an issue')) {
        return "Reporting an issue is easy! 🛠️ First, sign in to your account. Then go to your Dashboard and click on 'Report Issue'. Fill in the title, description, category, and location. You can even upload a photo to help the authorities understand the problem better. Once submitted, you can track its progress in real-time!";
    }

    if (t.includes('register') || t.includes('sign up') || t.includes('account')) {
        return "Getting set up is super easy! Just head over to the landing page, hit 'Create Account', pop in your details and verify your OTP. You'll be ready to go in no time! 🚀";
    }
    if (t.includes('login') || t.includes('sign in')) {
        return "Just hop over to the Login page and use your email and password. Once you're in, we'll take you straight to your dashboard! 🔑";
    }
    if (t.includes('report') || t.includes('issue') || t.includes('problem')) {
        return "Spotted a problem? No worries! 🛠️ Just sign in and go to 'Report Issue' on your dashboard. Tell us what's wrong, add a photo if you have one, pin the location, and hit submit. We'll take it from there!";
    }
    if (t.includes('status') || t.includes('track') || t.includes('progress')) {
        return "Curious about your reports? 🕵️‍♂️ You can track them all in the 'My Reports' section on your dashboard after you sign in. We'll keep you posted if the status is NEW, IN_PROGRESS, or RESOLVED!";
    }
    if (t.includes('analytics') || t.includes('overview') || t.includes('statistics') || t.includes('chart')) {
        return "Oh, you want the big picture? 📊 Check out the 'City Overview' section! It shows you all the cool stats like total issues reported, how quickly we're fixing things, and what types of issues are common down your street.";
    }
    if (t.includes('profile') || t.includes('name') || t.includes('phone') || t.includes('email')) {
        return "Your profile is where you keep all your personal details up to date! 👤 We attach this info to your reports so the city staff knows who the local hero is and can contact you if they need to.";
    }

    return "I'm still learning, so I might not understand everything perfectly yet! 😅 But I'm great at helping with registration, logging in, reporting issues, or checking analytics. Want to chat about one of those?";
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

    const categorySelect = document.getElementById('category');
    const otherCategoryGroup = document.getElementById('otherCategoryGroup');
    const otherCategoryInput = document.getElementById('otherCategory');

    if (categorySelect && otherCategoryGroup) {
        categorySelect.addEventListener('change', () => {
            if (categorySelect.value === 'OTHER') {
                otherCategoryGroup.style.display = 'block';
                otherCategoryInput.required = true;
            } else {
                otherCategoryGroup.style.display = 'none';
                otherCategoryInput.required = false;
            }
        });
    }

    if (getLocationBtn) {
        getLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                getLocationBtn.textContent = 'Acquiring Location...';
                getLocationBtn.disabled = true;

                // Factor out success handler
                const handleLocationSuccess = async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;

                    latInput.value = lat;
                    lngInput.value = lng;

                    try {
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                        const data = await response.json();
                        
                        let address = data.display_name;
                        if (data.address) {
                            const a = data.address;
                            const addressParts = [
                                a.house_number,
                                a.road || a.pedestrian || a.path,
                                a.neighbourhood,
                                a.suburb,
                                a.city_district || a.quarter,
                                a.city || a.town || a.village,
                                a.state,
                                a.postcode
                            ].filter(Boolean);
                            const uniqueParts = addressParts.filter((part, index) => addressParts.indexOf(part) === index);
                            if (uniqueParts.length > 0) address = uniqueParts.join(', ');
                        }

                        if (document.getElementById('address')) {
                            document.getElementById('address').value = address || data.display_name;
                        }
                        if (coordsSpan) coordsSpan.textContent = address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        
                        getLocationBtn.innerHTML = '✅ Location Secured';
                        getLocationBtn.classList.remove('btn-secondary');
                        getLocationBtn.classList.add('btn-primary');
                    } catch (error) {
                        console.error("Reverse geocoding failed:", error);
                        if (coordsSpan) coordsSpan.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        getLocationBtn.innerHTML = '✅ Coordinates Captured';
                    } finally {
                        if (locationInfo) locationInfo.style.display = 'flex';
                    }
                };

                const handleLocationError = (error) => {
                    console.warn("High accuracy location failed, trying fallback...", error);
                    navigator.geolocation.getCurrentPosition(
                        handleLocationSuccess,
                        (fallbackError) => {
                            console.error("Geolocation failed:", fallbackError);
                            alert("Unable to retrieve your location. Please ensure location services are enabled or enter coordinates manually.");
                            getLocationBtn.textContent = '📍 Retry Location';
                            getLocationBtn.disabled = false;
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
                    );
                };

                navigator.geolocation.getCurrentPosition(
                    handleLocationSuccess,
                    handleLocationError,
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
            }
        });
    }

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewContainer = document.getElementById('photoPreviewContainer');

    // New state management for multiple photos
    let uploadedPhotos = []; // Array of { id, file, dataUrl, isValid, status }

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageFiles(e.target.files);
                e.target.value = ''; // Reset for next selection
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
            dropZone.style.backgroundColor = '#f0f9ff';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.backgroundColor = '#f8fafc';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#cbd5e1';
            dropZone.style.backgroundColor = '#f8fafc';
            if (e.dataTransfer.files.length > 0) {
                handleImageFiles(e.dataTransfer.files);
            }
        });
    }

    function handleImageFiles(files) {
        const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
        
        if (uploadedPhotos.length + fileList.length > 5) {
            alert("Maximum 5 photos allowed. Please remove existing ones first.");
            return;
        }

        fileList.forEach(file => {
            const photoId = Math.random().toString(36).substr(2, 9);
            const photoObj = {
                id: photoId,
                file: file,
                dataUrl: null,
                isValid: false,
                status: 'analyzing'
            };
            uploadedPhotos.push(photoObj);
            renderPhotoPreview(photoObj);
            analyzePhoto(photoObj);
        });
        updateAddCardVisibility();
        updateSubmitButtonState();
    }

    function updateAddCardVisibility() {
        // Remove existing add card
        const existingCard = document.getElementById('add-photo-card');
        if (existingCard) existingCard.remove();

        // Hide primary dropZone if we have photos (user request: show "add photo" option instead)
        if (uploadedPhotos.length > 0) {
            dropZone.style.display = 'none';
        } else {
            dropZone.style.display = 'block';
        }

        // Add small card to grid if < 5
        if (uploadedPhotos.length > 0 && uploadedPhotos.length < 5) {
            const addCard = document.createElement('div');
            addCard.id = 'add-photo-card';
            addCard.className = 'photo-preview-item add-card';
            addCard.style = 'cursor: pointer; border: 2px dashed #cbd5e1; border-radius: 12px; height: 110px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; transition: all 0.2s;';
            addCard.innerHTML = `
                <div style="font-size: 1.5rem; color: #64748b;">+</div>
                <div style="font-size: 0.75rem; color: #64748b; font-weight: 500;">Add Photo</div>
            `;
            addCard.onclick = () => fileInput.click();
            addCard.onmouseover = () => { addCard.style.borderColor = 'var(--primary-color)'; addCard.style.backgroundColor = '#f1f5f9'; };
            addCard.onmouseout = () => { addCard.style.borderColor = '#cbd5e1'; addCard.style.backgroundColor = '#f8fafc'; };
            previewContainer.appendChild(addCard);
        }
    }

    async function analyzePhoto(photoObj) {
        // Read file for preview
        const reader = new FileReader();
        reader.onload = (e) => {
            photoObj.dataUrl = e.target.result;
            const previewImg = document.getElementById(`img-${photoObj.id}`);
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.opacity = '0.5'; // Keeping it dim while analyzing
            }
        };
        reader.readAsDataURL(photoObj.file);

        // Call AI API to analyze image
        try {
            const formData = new FormData();
            formData.append('image', photoObj.file);

            const response = await fetch(`${API_BASE}/image/analyze`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                photoObj.isValid = result.isValid && !result.isMorphed;
                photoObj.status = photoObj.isValid ? 'verified' : 'rejected';
                photoObj.rejectionReason = result.rejectionReason;

                if (photoObj.isValid && result.identified_category && result.identified_category !== 'OTHER' && categorySelect) {
                    // Auto-suggest category if current one is default
                    if (!categorySelect.value || categorySelect.value === '') {
                        categorySelect.value = result.identified_category;
                        categorySelect.dispatchEvent(new Event('change'));
                    }
                }
                
                updatePreviewUI(photoObj);
            } else {
                photoObj.isValid = false;
                photoObj.status = 'failed';
                updatePreviewUI(photoObj, "Verification failed");
            }
        } catch (error) {
            console.error('Photo analysis error:', error);
            photoObj.isValid = false;
            photoObj.status = 'failed';
            updatePreviewUI(photoObj, "Service offline");
        } finally {
            updateSubmitButtonState();
        }
    }

    function renderPhotoPreview(photoObj) {
        if (!previewContainer) return;
        
        const div = document.createElement('div');
        div.id = `preview-${photoObj.id}`;
        div.style = 'position: relative; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; height: 110px; background: #f1f5f9; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);';
        
        div.innerHTML = `
            <img id="img-${photoObj.id}" style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s;">
            <div id="status-${photoObj.id}" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(30, 41, 59, 0.8); color: white; font-size: 0.65rem; padding: 4px; text-align: center; backdrop-filter: blur(2px);">
                ⌛ Analyzing...
            </div>
            <button type="button" class="img-remove-btn" onclick="removePhoto('${photoObj.id}')" style="position: absolute; top: 4px; right: 4px; background: rgba(255,255,255,0.9); border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #ef4444; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #fee2e2;">✕</button>
        `;
        
        previewContainer.appendChild(div);
    }

    window.removePhoto = function(photoId) {
        uploadedPhotos = uploadedPhotos.filter(p => p.id !== photoId);
        const el = document.getElementById(`preview-${photoId}`);
        if (el) el.remove();
        updateAddCardVisibility();
        updateSubmitButtonState();
    };

    function updatePreviewUI(photoObj, errorMsg) {
        const statusEl = document.getElementById(`status-${photoObj.id}`);
        const previewImg = document.getElementById(`img-${photoObj.id}`);
        if (!statusEl) return;

        if (photoObj.status === 'verified') {
            statusEl.innerHTML = '✅ Verified';
            statusEl.style.backgroundColor = 'rgba(16, 185, 129, 0.85)';
            if (previewImg) previewImg.style.opacity = '1';
        } else if (photoObj.status === 'rejected') {
            statusEl.innerHTML = '❌ Rejected';
            statusEl.style.backgroundColor = 'rgba(239, 68, 68, 0.85)';
            statusEl.title = photoObj.rejectionReason || "Issue not identified";
            if (previewImg) previewImg.style.opacity = '0.3';
        } else {
            statusEl.innerHTML = `⚠️ ${errorMsg || 'Failed'}`;
            statusEl.style.backgroundColor = 'rgba(100, 116, 139, 0.85)';
        }
    }

    const submitBtn = document.getElementById('submitBtn');
    
    function updateSubmitButtonState() {
        if (!submitBtn) return;
        
        if (uploadedPhotos.length === 0) {
            setSubmitEnabled(false);
            submitBtn.textContent = 'Submit Report';
            return;
        }

        const allAnalyzed = uploadedPhotos.every(p => p.status !== 'analyzing');
        const anyVerified = uploadedPhotos.some(p => p.status === 'verified');
        const anyIssue = uploadedPhotos.some(p => p.status === 'rejected' || p.status === 'failed');

        if (!allAnalyzed) {
            setSubmitEnabled(false);
            submitBtn.textContent = 'Verifying Photos...';
        } else if (anyIssue) {
            setSubmitEnabled(false);
            submitBtn.textContent = 'Remove Rejected Photos';
            const rejected = uploadedPhotos.find(p => p.status === 'rejected');
            if (rejected) showMessage(rejected.rejectionReason || "One or more photos were rejected. Please remove them.", "error");
        } else if (anyVerified) {
            setSubmitEnabled(true);
            submitBtn.textContent = 'Submit Report';
        } else {
            setSubmitEnabled(false);
            submitBtn.textContent = 'Check Photos';
        }
    }

    function setSubmitEnabled(enabled) {
        if (!submitBtn) return;
        submitBtn.disabled = !enabled;
        if (enabled) {
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            submitBtn.style.filter = 'none';
        } else {
            submitBtn.style.opacity = '0.45';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.filter = 'grayscale(40%)';
        }
    }

    // Initialize state
    updateSubmitButtonState();

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

            // Final check on verified photos
            if (uploadedPhotos.length === 0) {
                showMessage("Please upload at least one valid photo of the issue.", "error");
                return;
            }

            const pending = uploadedPhotos.some(p => p.status === 'analyzing');
            if (pending) {
                showMessage("Please wait for photo verification to complete.", "info");
                return;
            }

            const invalid = uploadedPhotos.filter(p => !p.isValid);
            if (invalid.length > 0) {
                showMessage("One or more photos are invalid. Please remove them before submitting.", "error");
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            submitBtn.style.opacity = '0.7';

            const userEmail = localStorage.getItem('userEmail');
            const userId = localStorage.getItem('userId');

            let finalCategory = document.getElementById('category').value;
            if (finalCategory === 'OTHER') {
                finalCategory = document.getElementById('otherCategory').value || 'OTHER';
            }

            // Collect all verified photo data URLs
            const photoUrls = uploadedPhotos.map(p => p.dataUrl);

            const issueData = {
                title: document.getElementById('title').value,
                description: document.getElementById('description').value,
                category: finalCategory,
                latitude: document.getElementById('latitude').value,
                longitude: document.getElementById('longitude').value,
                address: document.getElementById('address') ? document.getElementById('address').value : null,
                photoUrls: photoUrls, // Send as array
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
                    alert(`Issue Reported Successfully with ${photoUrls.length} photos!`);
                    window.location.href = 'dashboard.html';
                } else {
                    const errorText = await response.text();
                    alert(`Failed to submit report: ${errorText}`);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit Report';
                    submitBtn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Error reporting issue:', error);
                alert('An error occurred during submission. Please check your connection.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Report';
                submitBtn.style.opacity = '1';
            }
        });
    }
}

function initDashboardPage() {
    const userNameSpan = document.getElementById('userName');
    const issueList = document.getElementById('issueList');
    const nearYouList = document.getElementById('nearYouList');

    const userName = localStorage.getItem('userEmail') || 'Citizen';
    if (userNameSpan) userNameSpan.textContent = userName.split('@')[0];

    if (!localStorage.getItem('isLoggedIn')) {
        window.location.href = 'login.html';
        return;
    }

    loadUserIssues();
    const userId = localStorage.getItem('userId');
    if (userId) fetchAndDisplayNotifications(userId);
    window.nearYouIssues = [];
    loadNearYouIssues();

    const viewAllNearYou = document.getElementById('viewAllNearYou');
    if (viewAllNearYou) {
        viewAllNearYou.addEventListener('click', (e) => {
            e.preventDefault();
            renderNearYouIssues(); // Show all
            viewAllNearYou.style.display = 'none';
        });
    }

    const closeIssueDetails = document.getElementById('closeIssueDetails');
    const issueDetailsModal = document.getElementById('issueDetailsModal');

    if (closeIssueDetails && issueDetailsModal) {
        closeIssueDetails.onclick = () => {
            issueDetailsModal.style.display = 'none';
        }
        window.onclick = (event) => {
            if (event.target == issueDetailsModal) {
                issueDetailsModal.style.display = 'none';
            }
        }
    }

    async function loadNearYouIssues() {
        if (!nearYouList) return;
        
        nearYouList.innerHTML = '<p class="message info">Detecting location to show issues near you...</p>';

        if (!navigator.geolocation) {
            nearYouList.innerHTML = '<p class="message error">Geolocation not supported. Showing all recent issues.</p>';
            fetchAllIssues();
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            await fetchAndFilterIssues(userLat, userLng);
        }, (error) => {
            console.error('Geolocation error:', error);
            nearYouList.innerHTML = '<p class="message error">Unable to detect location. Showing all recent issues.</p>';
            fetchAllIssues();
        });
    }

    async function fetchAllIssues() {
        try {
            const response = await fetch(`${API_BASE}/issues`);
            if (response.ok) {
                window.nearYouIssues = await response.json();
                renderNearYouIssues(2);
            }
        } catch (error) {
            console.error('Error loading fallback issues:', error);
        }
    }

    async function fetchAndFilterIssues(userLat, userLng) {
        try {
            const response = await fetch(`${API_BASE}/issues`);
            if (response.ok) {
                const allIssues = await response.json();
                
                // Filter by 3km radius
                const filteredIssues = allIssues.filter(issue => {
                    if (issue.latitude && issue.longitude) {
                        const dist = calculateDistance(userLat, userLng, issue.latitude, issue.longitude);
                        return dist <= 3; // 3km radius
                    }
                    return false;
                });

                window.nearYouIssues = filteredIssues;
                
                if (filteredIssues.length === 0) {
                    nearYouList.innerHTML = '<p class="message info">No recent issues reported within 3km of your location.</p>';
                } else {
                    renderNearYouIssues(2);
                }
            } else {
                nearYouList.innerHTML = '<p class="message error">Failed to load local feed.</p>';
            }
        } catch (error) {
            console.error('Error loading near you issues:', error);
            if (nearYouList) nearYouList.innerHTML = '<p class="message error">Error loading local feed.</p>';
        }
    }

    window.renderNearYouIssues = function (limit) {
        if (!nearYouList) return;
        const issues = window.nearYouIssues;

        if (!issues || issues.length === 0) {
            nearYouList.innerHTML = '<p class="message info">No recent issues in your area.</p>';
            return;
        }

        // Sort by date new to old
        issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const issuesToRender = limit ? issues.slice(0, limit) : issues;

        const html = issuesToRender.map(issue => {
            console.log("Rendering Near You Issue:", issue);
            const timeAgo = getTimeAgo(issue.createdAt);
            const categoryClass = `category-${issue.category.toLowerCase().replace(/\s+/g, '-')}`;

            // Generate random-ish like/comment numbers for the "feed" look if they don't exist
            const likes = issue.id % 20 + 5;
            const comments = issue.id % 8 + 1;

            return `
            <div class="near-you-card">
                <div class="near-you-header">
                    <div>
                        <span class="near-you-reporter">${escapeHtml(issue.reporterName || 'Anonymous Citizen')}</span>
                        <div class="near-you-category ${categoryClass}" style="display: inline-block; margin-left: 10px; padding: 2px 8px; font-size: 0.75rem;">
                            ${escapeHtml(issue.category)}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="issue-status status-${issue.status}" style="font-size: 0.7rem; padding: 2px 8px;">${issue.status}</span>
                        <span class="near-you-time">${timeAgo}</span>
                    </div>
                </div>
                <div class="near-you-description">
                    ${escapeHtml(issue.description)}
                </div>
                ${(issue.photoUrls && issue.photoUrls.length > 0) ? 
                    `<img src="${issue.photoUrls[0]}" class="near-you-image" alt="Issue Image" style="object-fit: cover; width: 100%; height: 280px; border-radius: 12px; margin-bottom: 15px;">` : 
                    (issue.photoUrl ? `<img src="${issue.photoUrl}" class="near-you-image" alt="Issue Image" style="object-fit: cover; width: 100%; height: 280px; border-radius: 12px; margin-bottom: 15px;">` : '')}
                <div class="near-you-footer">
                    <div class="near-you-interactions">
                        <div class="interaction-item">
                            <i class="far fa-heart"></i>
                            <span>${likes}</span>
                        </div>
                        <div class="interaction-item">
                            <i class="far fa-comment"></i>
                            <span>${comments}</span>
                        </div>
                    </div>
                    <a href="#" class="near-you-link" onclick="openIssueDetails(${issue.id})">View Details</a>
                </div>
            </div>
            `;
        }).join('');

        nearYouList.innerHTML = html;
    }

    window.openIssueDetails = function (issueId) {
        const issue = window.nearYouIssues.find(i => i.id === issueId);
        if (!issue) return;

        const modal = document.getElementById('issueDetailsModal');
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalIssueTitle');

        if (!modal || !modalBody) return;

        modalTitle.textContent = issue.title || `Issue #${issue.id}`;

        let feedbackHtml = '';
        if (issue.rating != null) {
            let stars = '';
            for (let i = 1; i <= 5; i++) {
                stars += i <= issue.rating ? '★' : '☆';
            }
            feedbackHtml = `
            <div style="margin-top: 20px; padding: 15px; background: #fffbeb; border-radius: 12px; border: 1px solid #fef3c7;">
                <h4 style="margin: 0 0 8px 0; color: #92400e; font-size: 0.95rem;">Citizen Feedback</h4>
                <div style="color: #f59e0b; font-size: 1.25rem; margin-bottom: 5px;">${stars}</div>
                ${issue.feedback ? `<p style="margin: 0; font-size: 0.9rem; color: #92400e; font-style: italic;">"${escapeHtml(issue.feedback)}"</p>` : ''}
            </div>`;
        }

        modalBody.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    <span class="issue-status status-${issue.status}" style="margin-bottom: 10px; display: inline-block;">${issue.status}</span>
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-muted);">
                        Reported by <strong>${escapeHtml(issue.reporterName || 'Anonymous')}</strong><br>
                        on ${new Date(issue.createdAt).toLocaleDateString()}
                    </p>
                </div>
                <div style="text-align: right;">
                    <span style="background: #f1f5f9; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${issue.category}</span>
                </div>
            </div>

            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px; font-size: 1rem;">Description</h4>
                <p style="color: var(--text-main); line-height: 1.6; font-size: 0.95rem;">${escapeHtml(issue.description)}</p>
            </div>

            ${(issue.photoUrls && issue.photoUrls.length > 0) ? `
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 12px; font-size: 1rem;">Evidence Photos (${issue.photoUrls.length})</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    ${issue.photoUrls.map((url, idx) => `
                        <div style="border-radius: 10px; overflow: hidden; border: 1px solid #e2e8f0; cursor: zoom-in; height: 160px;" onclick="viewPhoto('${url}')">
                            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" alt="Evidence ${idx+1}">
                        </div>
                    `).join('')}
                </div>
            </div>` : (issue.photoUrl ? `
            <div style="margin-bottom: 25px;">
                <h4 style="margin-bottom: 10px; font-size: 1rem;">Report Photo</h4>
                <img src="${issue.photoUrl}" style="width: 100%; border-radius: 12px; box-shadow: var(--shadow-md); cursor: zoom-in;" alt="Issue Photo" onclick="viewPhoto('${issue.photoUrl}')">
            </div>` : '')}

            ${issue.status === 'RESOLVED' && issue.resolutionPhotoUrl ? `
            <div style="margin-top: 25px; padding-top: 25px; border-top: 2px dashed #e2e8f0;">
                <h4 style="margin-bottom: 10px; font-size: 1rem; color: #15803d; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-check-circle"></i> Resolution Proof
                </h4>
                <img src="${issue.resolutionPhotoUrl}" style="width: 100%; border-radius: 12px; box-shadow: var(--shadow-md); border: 2px solid #dcfce7;" alt="Resolution Proof">
            </div>` : ''}

            ${feedbackHtml}
        `;

        modal.style.display = 'block';
    }

    function getTimeAgo(dateString) {
        const now = new Date();
        const past = new Date(dateString);
        const diffInMs = now - past;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

        if (diffInDays > 0) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        if (diffInHours > 0) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        if (diffInMinutes > 0) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

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

        issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        console.log("Rendering My Reports:", issues);
        window.dashboardIssues = issues;

        renderIssueList(4);
    }

    window.renderIssueList = function (limit) {
        if (!issueList) return;
        const issuesToRender = window.dashboardIssues.slice(0, limit);
        const hasMore = limit < window.dashboardIssues.length;

        let html = issuesToRender.map(issue => {
            let feedbackHtml = '';

            if (issue.status === 'RESOLVED' || issue.status === 'REJECTED') {
                if (issue.rating != null) {
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
                ${(issue.photoUrls && issue.photoUrls.length > 0) ? 
                    `<div style="margin-top: 15px; display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px;">
                        ${issue.photoUrls.map(url => `<img src="${url}" class="issue-photo-thumb" style="width: 140px; height: 100px; object-fit: cover; border-radius: 10px; flex-shrink: 0; cursor: pointer; border: 1px solid #e2e8f0;" onclick="viewPhoto('${url}')">`).join('')}
                    </div>` : 
                    (issue.photoUrl ? `<div style="margin-top: 12px;"><img src="${issue.photoUrl}" class="issue-photo-thumb" alt="Issue Photo" style="width: 160px; height: 120px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 1px solid #e2e8f0;" onclick="viewPhoto('${issue.photoUrl}')"></div>` : '')}
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
            html += `<div style="text-align: center; margin-top: 30px; width: 100%;">
                <button onclick="renderIssueList(${limit + 4})" class="btn-secondary" style="padding: 10px 40px; font-weight: 600;">
                    View More Issues
                </button>
            </div>`;
        }

        issueList.innerHTML = html;
    }

    function updateAnalytics(issues) {
        // Analytics section was replaced by Near You feed as per user request
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
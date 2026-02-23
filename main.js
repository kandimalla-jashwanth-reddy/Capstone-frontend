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
});

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

        const loginData = {
            email: document.getElementById('loginEmail').value.trim(),
            password: document.getElementById('loginPassword').value
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
                document.getElementById('userName').textContent = user.name || 'Unknown';
                document.getElementById('userEmail').textContent = user.email || 'Not provided';
                document.getElementById('userPhone').textContent = user.phone || 'Not provided';
                document.getElementById('userId').textContent = user.id || 'Unknown';

                console.log('UI updated successfully');
                updateDebugInfo('User data loaded successfully!');

                showMessage(`Welcome back, ${user.name}!`, 'success');

                if (document.getElementById('issueList')) {
                    loadUserIssues(user.email);
                }
                if (document.getElementById('analyticsSummary')) {
                    loadAnalyticsSummary();
                }
            } else {
                throw new Error('Invalid user data format received');
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            updateDebugInfo(`Error: ${error.message}`);

            document.getElementById('userName').textContent = 'Error Loading';
            document.getElementById('userEmail').textContent = userEmail;
            document.getElementById('userPhone').textContent = 'Check Console';
            document.getElementById('userId').textContent = 'N/A';

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

async function loadUserIssues(userEmail) {
    const listEl = document.getElementById('issueList');
    if (!listEl) return;

    try {
        listEl.innerHTML = '<p>Loading your reports...</p>';
        const resp = await fetch(`${API_BASE}/issues?reporterEmail=${encodeURIComponent(userEmail)}`);
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }
        const issues = await resp.json();

        if (!issues || issues.length === 0) {
            listEl.innerHTML = '<p>You have not reported any issues yet.</p>';
            return;
        }

        listEl.innerHTML = '';
        issues.forEach(issue => {
            const card = document.createElement('div');
            card.className = 'issue-card';

            const statusClass = `status-${issue.status}`;

            card.innerHTML = `
                <div class="issue-card-header">
                    <span class="issue-title">${issue.title}</span>
                    <span class="issue-status ${statusClass}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    <span>Category: ${issue.category || 'N/A'}</span> ·
                    <span>Priority: ${issue.priority || 'N/A'}</span> ·
                    <span>Department: ${issue.assignedDepartment || 'Pending Routing'}</span>
                </div>
                <div class="issue-description">
                    ${issue.description || 'No description provided.'}
                </div>
                ${issue.photoUrl ? `<img class="issue-photo-thumb" src="${issue.photoUrl}" alt="Issue photo">` : ''}
                <div class="issue-meta">
                    <span>Created: ${issue.createdAt ? new Date(issue.createdAt).toLocaleString() : 'N/A'}</span>
                </div>
            `;

            listEl.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load issues:', err);
        listEl.innerHTML = '<p>Failed to load your reports. Please try again later.</p>';
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
            <p><strong>${data.totalIssues ?? 0}</strong> reported</p>
        `;
        container.appendChild(totalCard);

        const statusCard = document.createElement('div');
        statusCard.className = 'analytics-card';
        statusCard.innerHTML = '<h4>By Status</h4>';
        const statusMap = data.byStatus || {};
        Object.keys(statusMap).forEach(key => {
            const p = document.createElement('p');
            p.textContent = `${key}: ${statusMap[key]}`;
            statusCard.appendChild(p);
        });
        container.appendChild(statusCard);

        const catCard = document.createElement('div');
        catCard.className = 'analytics-card';
        catCard.innerHTML = '<h4>By Category</h4>';
        const catMap = data.byCategory || {};
        Object.keys(catMap).forEach(key => {
            const p = document.createElement('p');
            p.textContent = `${key}: ${catMap[key]}`;
            catCard.appendChild(p);
        });
        container.appendChild(catCard);

        const avgCard = document.createElement('div');
        avgCard.className = 'analytics-card';
        avgCard.innerHTML = `
            <h4>Avg. Resolution Time</h4>
            <p>${(data.avgResolutionHours || 0).toFixed(2)} hours (resolved issues)</p>
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
            addBotMessage('Hi! I am the CrowdCivics assistant. How can I help?');
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

        if (t.includes('register') || t.includes('sign up') || t.includes('account')) {
            return 'To register, go to the landing page, click "Create Account", fill in your details, verify the OTP, and then you can log in to the dashboard.';
        }
        if (t.includes('login') || t.includes('sign in')) {
            return 'Use your email and password on the Login page. After successful login you will be redirected to the dashboard.';
        }
        if (t.includes('report') || t.includes('issue') || t.includes('problem')) {
            return 'On the dashboard, open "Report Issue", add a title, description, category, optional photo and location, then submit. The issue will appear under "My Reports".';
        }
        if (t.includes('status') || t.includes('track') || t.includes('progress')) {
            return 'You can track the status of your submitted issues in the "My Reports" section on the dashboard. Each report shows its current status such as NEW, IN_PROGRESS, or RESOLVED.';
        }
        if (t.includes('analytics') || t.includes('overview') || t.includes('statistics') || t.includes('chart')) {
            return 'The "City Overview" section on the dashboard shows analytics like total issues, counts by status, counts by category, and average resolution time.';
        }
        if (t.includes('profile') || t.includes('name') || t.includes('phone') || t.includes('email')) {
            return 'Your profile page shows your name, email, phone, and user ID. These details are attached to every issue you submit so staff can follow up.';
        }

        return 'I am a simple built-in assistant. Try asking about registration, login, how to report an issue, how to track status, or what analytics are available.';
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
        dropZone.addEventListener('click', () => fileInput.click());

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

    function handleImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (imagePreview) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            if (photoDataInput) photoDataInput.value = e.target.result;
            const p = dropZone.querySelector('p');
            if (p) p.textContent = `✅ ${file.name} selected`;
        };
        reader.readAsDataURL(file);
    }

    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
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
                    alert(`Issue Reported Successfully! ID: ${result.id}`);
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

    function renderIssues(issues) {
        if (!issueList) return;

        if (!issues || issues.length === 0) {
            issueList.innerHTML = '<p class="message info">You haven\'t reported any issues yet.</p>';
            return;
        }

        issueList.innerHTML = issues.map(issue => `
            <div class="issue-card">
                <div class="issue-card-header">
                    <span class="issue-title">${escapeHtml(issue.title)}</span>
                    <span class="issue-status status-${issue.status}">${issue.status}</span>
                </div>
                <div class="issue-meta">
                    Reported on ${new Date(issue.createdAt).toLocaleDateString()} • ${issue.category}
                </div>
                <div class="issue-description">${escapeHtml(issue.description)}</div>
                ${issue.photoUrl ? `<img src="${issue.photoUrl}" class="issue-photo-thumb" alt="Issue Photo">` : ''}
                ${issue.assignedDepartment ? `<div class="issue-meta" style="margin-top:8px;">Has been assigned to: <strong>${issue.assignedDepartment}</strong></div>` : ''}
            </div>
        `).join('');
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
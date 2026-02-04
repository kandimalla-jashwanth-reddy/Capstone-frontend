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

document.addEventListener('DOMContentLoaded', function() {
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

    // Initialize forgot password page (if relevant)
    initializeForgotPassword();

    // Initialize issue reporting dashboard (if relevant)
    initializeIssueDashboard();

    // Initialize chatbot widget (if present on page)
    initializeChatBot();
});

function initializeForgotPassword() {
    const resetForm = document.getElementById('passwordResetForm');
    if (resetForm) {
        console.log('Forgot password page detected - initializing...');
        
        let otpSent = false;
        const resetBtn = document.getElementById('resetBtn');
        const otpGroup = document.getElementById('otpGroup');
        const passwordGroup = document.getElementById('passwordGroup');
        
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Forgot password form submitted');
            
            const email = document.getElementById('email').value.trim();
            const otp = document.getElementById('otp') ? document.getElementById('otp').value.trim() : '';
            const newPassword = document.getElementById('newPassword') ? document.getElementById('newPassword').value : '';
            
            console.log('Form data:', { 
                email, 
                otp, 
                newPassword: newPassword ? '***' : 'not set', 
                otpSent 
            });
            
            // Basic validation
            if (!email) {
                showMessage('Please enter your email address', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showMessage('Please enter a valid email address', 'error');
                return;
            }

            try {
                if (!otpSent) {
                    // STEP 1: Send OTP
                    console.log('Step 1: Sending OTP to', email);
                    showMessage('Sending OTP...', 'info');
                    resetBtn.disabled = true;
                    resetBtn.textContent = 'Sending OTP...';
                    
                    const response = await fetch(`${API_BASE}/auth/send-reset-otp`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email: email })
                    });
                    
                    const result = await response.text();
                    console.log('OTP send response:', { 
                        status: response.status, 
                        result: result 
                    });
                    
                    if (response.ok) {
                        showMessage('OTP sent successfully! Check your console for the OTP code. Enter the OTP and new password below.', 'success');
                        otpSent = true;
                        
                        // Show OTP and Password fields
                        if (otpGroup) otpGroup.style.display = 'block';
                        if (passwordGroup) passwordGroup.style.display = 'block';
                        
                        // Update button text
                        resetBtn.disabled = false;
                        resetBtn.textContent = 'Reset Password';
                        
                        // Start OTP timer
                        startOTPTimer(resetBtn);
                        
                        // Focus on OTP field
                        setTimeout(() => {
                            const otpField = document.getElementById('otp');
                            if (otpField) otpField.focus();
                        }, 100);
                        
                    } else {
                        showMessage('Failed to send OTP: ' + result, 'error');
                        resetBtn.disabled = false;
                        resetBtn.textContent = 'Send OTP';
                    }
                    
                } else {
                    // STEP 2: Reset Password with OTP
                    console.log('Step 2: Resetting password with OTP');
                    
                    if (!otp || otp.length !== 6) {
                        showMessage('Please enter a valid 6-digit OTP', 'error');
                        return;
                    }
                    
                    if (!newPassword || newPassword.length < 6) {
                        showMessage('Password must be at least 6 characters', 'error');
                        return;
                    }
                    
                    showMessage('Resetting password...', 'info');
                    resetBtn.disabled = true;
                    resetBtn.textContent = 'Resetting...';
                    
                    const response = await fetch(`${API_BASE}/auth/reset-password`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: email,
                            newPassword: newPassword,
                            otp: otp
                        })
                    });
                    
                    const result = await response.text();
                    console.log('Password reset response:', { 
                        status: response.status, 
                        result: result 
                    });
                    
                    if (response.ok) {
                        showMessage('Password reset successful! Redirecting to login...', 'success');
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 2000);
                    } else {
                        showMessage('Password reset failed: ' + result, 'error');
                        resetBtn.disabled = false;
                        resetBtn.textContent = 'Reset Password';
                    }
                }
                
            } catch (error) {
                console.error('Password reset error:', error);
                showMessage('Operation failed. Please check your connection and try again.', 'error');
                resetBtn.disabled = false;
                resetBtn.textContent = otpSent ? 'Reset Password' : 'Send OTP';
            }
        });
    }
}

// Registration with OTP
if (document.getElementById('registrationForm')) {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const emailInput = document.getElementById('email');
    const otpGroup = document.getElementById('otpGroup');
    const registerBtn = document.getElementById('registerBtn');
    
    sendOtpBtn.addEventListener('click', async function() {
        const email = emailInput.value.trim();
        
        if (!email) {
            showMessage('Please enter your email first', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }
        
        try {
            showMessage('Sending OTP...', 'info');
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
            console.log('OTP send response:', { status: response.status, result: resultText });
            
            if (response.ok) {
                showMessage('OTP sent! Check your console for the OTP code.', 'success');
                otpGroup.style.display = 'block';
                registerBtn.disabled = false;
                startOTPTimer(sendOtpBtn);
                
                document.getElementById('otp').focus();
            } else {
                showMessage('Failed to send OTP: ' + resultText, 'error');
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = 'Send OTP';
            }
        } catch (error) {
            console.error('OTP send error:', error);
            showMessage('Network error. Please check if backend is running on port 8080.', 'error');
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Send OTP';
        }
    });
    
    document.getElementById('registrationForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            password: document.getElementById('password').value,
            otp: document.getElementById('otp').value.trim()
        };
        
        console.log('Registration attempt:', { ...formData, password: '***' });
        
        if (!formData.name || !formData.email || !formData.phone || !formData.password || !formData.otp) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (formData.otp.length !== 6) {
            showMessage('OTP must be 6 digits', 'error');
            return;
        }

        try {
            showMessage('Creating account...', 'info');
            registerBtn.disabled = true;
            registerBtn.textContent = 'Creating Account...';
            
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const resultText = await response.text();
            console.log('Registration response:', { status: response.status, result: resultText });
            
            if (response.ok) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage(resultText, 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showMessage('Registration failed. Please check your connection.', 'error');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = 'Create Account';
        }
    });
}

// Login Functionality
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const loginData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };
        
        console.log('Login attempt:', { ...loginData, password: '***' });
        
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
            console.log('Login response:', { 
                status: response.status, 
                statusText: response.statusText,
                result: resultText 
            });
            
            if (response.ok) {
                showMessage('Login successful! Redirecting...', 'success');
                
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', loginData.email);
                console.log('Stored in localStorage:', { 
                    isLoggedIn: true, 
                    userEmail: loginData.email 
                });
                
                setTimeout(() => {
                    // After login, go to the main dashboard (not the public landing page)
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showMessage(resultText || 'Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('Login failed. Please check your connection.', 'error');
        }
    });
}

// Load user data for pages that show profile info
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

                // After loading user info, also load their issues and analytics if those sections exist
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

// Logout functionality
if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', function() {
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

// Issue reporting dashboard
function initializeIssueDashboard() {
    const issueForm = document.getElementById('issueForm');
    if (!issueForm) {
        return; // not on the dashboard page
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

// Simple in-page chatbot (no external API)
function initializeChatBot() {
    const chatToggle = document.getElementById('chatToggle');
    const chatWindow = document.getElementById('chatWindow');
    const chatClose = document.getElementById('chatClose');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatToggle || !chatWindow || !chatForm || !chatInput || !chatMessages) {
        return; // chatbot not on this page
    }

    function openChat() {
        chatWindow.classList.add('open');
        chatWindow.setAttribute('aria-hidden', 'false');
        chatInput.focus();

        if (!chatMessages.dataset.initialized) {
            addBotMessage('Hi! I am the CrowdCivics assistant. You can ask how to register, how to report an issue, or how to check your report status.');
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

// Email validation helper
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Test functions for debugging
window.testPassword = function(password) {
    fetch(`${API_BASE}/auth/test-password?password=${encodeURIComponent(password)}`)
        .then(response => response.text())
        .then(result => console.log('Password test:', result));
};

window.testUser = function(email) {
    fetch(`${API_BASE}/auth/user?email=${encodeURIComponent(email)}`)
        .then(response => response.json())
        .then(result => console.log('User test:', result))
        .catch(error => console.log('User test error:', error));
};

window.debugOTP = function(email, purpose = 'PASSWORD_RESET') {
    fetch(`${API_BASE}/auth/debug/otp-status?email=${encodeURIComponent(email)}&purpose=${purpose}`)
        .then(response => response.text())
        .then(result => console.log('OTP Debug:', result))
        .catch(error => console.log('OTP Debug error:', error));
};
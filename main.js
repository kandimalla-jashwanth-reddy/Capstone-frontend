// Configuration
const API_BASE = 'http://localhost:8080/api';

// Utility Functions
function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // Auto-hide success messages after 5 seconds
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

// OTP Timer Functionality
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

// Test connection on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded - testing backend connection...');
    
    // Test backend connection
    fetch(`${API_BASE}/auth/test`)
        .then(response => response.text())
        .then(result => {
            console.log('Backend connection: ' + result);
        })
        .catch(error => {
            console.error('Backend connection failed: ', error);
            showMessage('Backend connection failed. Make sure server is running on port 8080.', 'error');
        });
});

// Registration with OTP
if (document.getElementById('registrationForm')) {
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const emailInput = document.getElementById('email');
    const otpGroup = document.getElementById('otpGroup');
    const registerBtn = document.getElementById('registerBtn');
    
    // Send OTP functionality
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
                showMessage('OTP sent! Check your console/terminal for the OTP code.', 'success');
                otpGroup.style.display = 'block';
                registerBtn.disabled = false;
                startOTPTimer(sendOtpBtn);
                
                // Focus on OTP input
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
    
    // Registration form submission
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
        
        // Validation
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

// Forgot Password with OTP
if (document.getElementById('passwordResetForm')) {
    let otpSent = false;
    
    document.getElementById('passwordResetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        const newPassword = document.getElementById('newPassword').value;
        const otpInput = document.getElementById('otp');
        const otp = otpInput ? otpInput.value.trim() : null;
        
        console.log('Password reset attempt:', { email: email, newPassword: '***', otp: otp });
        
        if (!email || !newPassword) {
            showMessage('Please fill in all fields', 'error');
            return;
        }
        
        if (!isValidEmail(email)) {
            showMessage('Please enter a valid email address', 'error');
            return;
        }

        try {
            // First send OTP if not already sent
            if (!otpSent) {
                showMessage('Sending OTP...', 'info');
                
                const otpResponse = await fetch(`${API_BASE}/auth/send-reset-otp`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: email })
                });
                
                const otpResult = await otpResponse.text();
                console.log('Reset OTP response:', { status: otpResponse.status, result: otpResult });
                
                if (otpResponse.ok) {
                    showMessage('OTP sent! Check your console/terminal for the OTP code.', 'success');
                    otpSent = true;
                    
                    // Add OTP field dynamically
                    const form = document.getElementById('passwordResetForm');
                    if (!document.getElementById('otp')) {
                        const otpGroup = document.createElement('div');
                        otpGroup.className = 'form-group';
                        otpGroup.innerHTML = `
                            <label for="otp">Enter OTP</label>
                            <input type="text" id="otp" name="otp" placeholder="Enter 6-digit OTP" maxlength="6" required>
                        `;
                        const submitBtn = form.querySelector('button');
                        form.insertBefore(otpGroup, submitBtn);
                    }
                    return;
                } else {
                    showMessage(otpResult, 'error');
                    return;
                }
            }
            
            // If OTP is provided, proceed with password reset
            if (!otp || otp.length !== 6) {
                showMessage('Please enter a valid 6-digit OTP', 'error');
                return;
            }
            
            showMessage('Resetting password...', 'info');
            
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
            console.log('Password reset response:', { status: response.status, result: result });
            
            if (response.ok) {
                showMessage('Password reset successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage(result, 'error');
            }
        } catch (error) {
            console.error('Password reset error:', error);
            showMessage('Password reset failed. Please check your connection.', 'error');
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
                
                // Store login state
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userEmail', loginData.email);
                console.log('Stored in localStorage:', { 
                    isLoggedIn: true, 
                    userEmail: loginData.email 
                });
                
                setTimeout(() => {
                    window.location.href = 'index.html';
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

// Load user data for home page
if (document.getElementById('userName')) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Home page initialization started');
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
                // Update user interface
                document.getElementById('userName').textContent = user.name || 'Unknown';
                document.getElementById('userEmail').textContent = user.email || 'Not provided';
                document.getElementById('userPhone').textContent = user.phone || 'Not provided';
                document.getElementById('userId').textContent = user.id || 'Unknown';
                
                console.log('UI updated successfully');
                updateDebugInfo('User data loaded successfully!');
                
                // Show success message
                showMessage(`Welcome back, ${user.name}!`, 'success');
            } else {
                throw new Error('Invalid user data format received');
            }
        })
        .catch(error => {
            console.error('Error loading user data:', error);
            updateDebugInfo(`Error: ${error.message}`);
            
            // Update UI with error state
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
    fetch(`${API_BASE}/auth/test-user?email=${encodeURIComponent(email)}`)
        .then(response => response.text())
        .then(result => console.log('User test:', result));
};
// DOM Elements
const loginToggle = document.getElementById('loginToggle');
const registerToggle = document.getElementById('registerToggle');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const toggleLoginPassword = document.getElementById('toggleLoginPassword');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
const loginPassword = document.getElementById('loginPassword');
const registerPassword = document.getElementById('registerPassword');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');

// Toggle between Login and Register forms
loginToggle.addEventListener('click', () => {
    loginToggle.classList.add('active');
    registerToggle.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
});

registerToggle.addEventListener('click', () => {
    registerToggle.classList.add('active');
    loginToggle.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
});

switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    registerToggle.click();
});

switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    loginToggle.click();
});

// Toggle password visibility
toggleLoginPassword.addEventListener('click', () => {
    const type = loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    loginPassword.setAttribute('type', type);
    toggleLoginPassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
});

toggleRegisterPassword.addEventListener('click', () => {
    const type = registerPassword.getAttribute('type') === 'password' ? 'text' : 'password';
    registerPassword.setAttribute('type', type);
    toggleRegisterPassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
});

// Form submission
// Form submission logic moved to main.js for backend integration
// loginFormElement.addEventListener('submit', ...);
// registerFormElement.addEventListener('submit', ...);

// Auto-focus on the first input field when switching forms
loginToggle.addEventListener('click', () => {
    setTimeout(() => document.getElementById('loginEmail').focus(), 300);
});

registerToggle.addEventListener('click', () => {
    setTimeout(() => document.getElementById('registerName').focus(), 300);
});

// Initialize with login form focused
// Initialize with login form focused
document.getElementById('loginEmail').focus();

// Navigation Header Buttons
const navSignInBtn = document.getElementById('navSignInBtn');
const navSignUpBtn = document.getElementById('navSignUpBtn');

if (navSignInBtn) {
    navSignInBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginToggle.click();
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    });
}

if (navSignUpBtn) {
    navSignUpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerToggle.click();
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    });
}


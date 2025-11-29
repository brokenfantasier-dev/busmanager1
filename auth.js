function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    const user = users[username.toLowerCase()];

    if (user && user.password === password) {
        sessionStorage.setItem('user', JSON.stringify({ username: username, role: user.role }));
        window.location.href = 'dashboard.html';
    } else {
        errorMessage.textContent = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
        errorMessage.style.display = 'block';
    }
}

function handleLogout() {
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

function checkAuth() {
    const userString = sessionStorage.getItem('user');
    if (!userString) {
        window.location.href = 'index.html';
        return;
    }
    const user = JSON.parse(userString);
    
    // Display user info
    const usernameDisplay = document.getElementById('username-display');
    const userRoleDisplay = document.getElementById('user-role-display');
    if (usernameDisplay) usernameDisplay.textContent = user.username;
    if (userRoleDisplay) userRoleDisplay.textContent = user.role;

    // Show admin-only elements if user is admin
    if (user.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'list-item'; // or 'block', 'flex' depending on the element
        });
    }
}

function isAdmin() {
    const userString = sessionStorage.getItem('user');
    if (!userString) return false;
    const user = JSON.parse(userString);
    return user.role === 'admin';
}


// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    const mobileLogoutButton = document.getElementById('mobileLogoutButton');
    if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', handleLogout);
    }
});

    
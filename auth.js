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
    if (!userString && !window.location.pathname.endsWith('index.html')) {
        window.location.href = 'index.html';
        return;
    }
    if (userString && window.location.pathname.endsWith('index.html')) {
         window.location.href = 'dashboard.html';
        return;
    }

    if (userString) {
        const user = JSON.parse(userString);
        
        // Hiển thị thông tin người dùng
        const usernameDisplay = document.getElementById('username-display');
        const userRoleDisplay = document.getElementById('user-role-display');
        if (usernameDisplay) usernameDisplay.textContent = user.username;
        if (userRoleDisplay) userRoleDisplay.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        // Hiển thị các thành phần chỉ dành cho admin nếu người dùng là admin
        if (user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = 'none';
            });
        }
    }
}


function isAdmin() {
    const userString = sessionStorage.getItem('user');
    if (!userString) return false;
    const user = JSON.parse(userString);
    return user.role === 'admin';
}


// Gắn các bộ lắng nghe sự kiện
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

    

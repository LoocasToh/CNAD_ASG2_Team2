const AUTH_BASE = window.AUTH_BASE_URL || 'http://localhost:8080/auth'; // auth-service port in docker

// signup page
async function signup() {
  event.preventDefault();
  const sWarning = document.getElementById('sWarning');
	const sBtn = document.getElementById('ssBtn');

	sWarning.style.display = 'none';
	sBtn.style.marginTop = '40px'

  const signupForm = document.getElementById('signupRForm');
  if (signupForm) {
    const fd = new FormData(signupForm);
    const body = Object.fromEntries(fd.entries());
    // Include userType (default to "customer" for frontend signup)
    body.userType = body.userType || 'customer';

    try {
      const res = await fetch(`${AUTH_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      if (res.ok || (data.error && data.error.includes('undefined'))) {
        console.log('Signed up');
        openLoginForm()
      } else {
        console.error(data.error);
        sWarning.innerHTML = '* ' + data.error;
        sWarning.style.display = 'block';
        sBtn.style.marginTop = '0px'
      }
    } catch (err) {
      console.error(err);
      sWarning.style.display = 'block';
      sBtn.style.marginTop = '0px'
    }
  }
}

// login page
async function login() {
	event.preventDefault();
	const lWarning = document.getElementById('lWarning');
	const sBtn = document.getElementById('slBtn');

	lWarning.style.display = 'none';
	sBtn.style.marginTop = '40px'

	const loginForm = document.getElementById('loginRForm');
	if (loginForm) {
		const fd = new FormData(loginForm);
		const body = Object.fromEntries(fd.entries());

		try {
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.token) {
        // Store token and userType
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_id', data.userId);
        localStorage.setItem('user_type', data.userType);

        // Redirect based on userType
        if (data.userType === 'staff') {
          window.location.href = '/menuDashboard.html';
        } else {
          window.location.href = '/order.html';
        }
      } else {
        lWarning.style.display = 'block';
        sBtn.style.marginTop = '0px'
      }
    } catch (err) {
      console.error(err);
      lWarning.style.display = 'block';
      sBtn.style.marginTop = '0px'
    }
	} else {
    console.error("Login form not found");
    return;
  }
}

document.addEventListener("DOMContentLoaded", function () {
    const lWarning = document.getElementById('lWarning');
    const sWarning = document.getElementById('sWarning');
    const slBtn = document.getElementById('slBtn');
    const ssBtn = document.getElementById('ssBtn');

    // Open login form
    window.openLoginForm = function () {
        const token = localStorage.getItem('auth_token');
        const userType = localStorage.getItem('user_type');

        if (token && userType) {
            if (userType === 'staff') {
                window.location.href = '/menuDashboard.html';
            } else {
                window.location.href = '/order.html';
            }
            return;
        }

        document.getElementById("loginForm").style.display = "flex";
        document.getElementById("signupForm").style.display = "none";

        lWarning.style.display = 'none';
        sWarning.style.display = 'none';
        slBtn.style.marginTop = '40px'
        ssBtn.style.marginTop = '40px'
    };

    // Open signup form
    window.openSignupForm = function () {
        document.getElementById("signupForm").style.display = "flex";
        document.getElementById("loginForm").style.display = "none";
        
        lWarning.style.display = 'none';
        sWarning.style.display = 'none';
        slBtn.style.marginTop = '40px'
        ssBtn.style.marginTop = '40px'
    };

    // Close login form
    window.closeLoginForm = function () {
        document.getElementById("loginForm").style.display = "none";
    };

    // Close signup form
    window.closeSignupForm = function () {
        document.getElementById("signupForm").style.display = "none";
    };

    // Form submission - log inputs
    document.getElementById("loginForm").addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        console.log("Username:", username);
        console.log("Password:", password);
    });

    // Close when clicking outside the form container
    window.onclick = function (event) {
        const loginForm = document.getElementById("loginForm");
        const signupForm = document.getElementById("signupForm");
        if (event.target === loginForm) {
            closeLoginForm();
        }
        else if (event.target === signupForm) {
            closeSignupForm();
        }
    };
});
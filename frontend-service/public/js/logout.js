document.getElementById("logout-btn").addEventListener("click", () => {
    // Clear session info
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userType');
    localStorage.removeItem("cart");

    // Redirect to login
    window.location.href = '/index.html';
});
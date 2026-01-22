const AUTH_BASE = window.AUTH_BASE_URL || 'http://localhost:8080/auth'; // auth-service port in docker

// profile
async function loadProfile() {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    window.location.href = '/index.html';
    return;
  }

  try {
    const res = await fetch(`${AUTH_BASE}/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Unauthorized');

    const data = await res.json();
    document.dispatchEvent(new CustomEvent('userDataStored', { detail: data }));
    return data;

  } catch (err) {
    localStorage.removeItem('auth_token');
    window.location.href = '/index.html';
  }
}


document.addEventListener("DOMContentLoaded", async function () {
    const protectedPages = ['order.html', 'cart.html', 'confirmation.html', 'payment.html', 'profile.html'];

    const currentPage = window.location.pathname.split("/").pop();
    if (protectedPages.includes(currentPage)) {
        await loadProfile();
    }
});
// =========================
// DOM Elements
// =========================
// Call buttons
const callHelperBtn = document.getElementById('call-helper-btn');
const callBackupBtn = document.getElementById('call-backup-btn');
const emergency911Btn = document.getElementById('emergency-911-btn');

// Timer elements
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
const timerCancelBtn = document.getElementById('timer-cancel-btn');
const modalTimerDisplay = document.getElementById('modal-timer-display');
const timerMessage = document.getElementById('timer-message');
const callRecipient = document.getElementById('call-recipient');
const callStatus = document.getElementById('call-status');

// Modal elements
const callTimerModal = document.getElementById('call-timer-modal');
const timerModalTitle = document.getElementById('timer-modal-title');
const cancelCallBtn = document.getElementById('cancel-call-btn');
const callConnectedBtn = document.getElementById('call-connected-btn');
const needHelpBtn = document.getElementById('need-help-btn');
const emergencyBackup = document.getElementById('emergency-backup');

// Toast
const toast = document.getElementById('toast');

// User section
const userSection = document.getElementById('auth-area');
const userDropdown = userSection.querySelector('.user-dropdown');
const loginLink = document.getElementById('login-link');
const logoutLink = document.getElementById('logout-link');
const headerUserName = document.getElementById('headerUserName');

// =========================
// API + Auth helpers (match Profile page)
// =========================
const API_BASE = window.AUTH_BASE_URL || "http://localhost:8080/auth";

function getToken() {
  return (
    localStorage.getItem("careCompanionToken") ||
    sessionStorage.getItem("careCompanionToken") ||
    ""
  );
}

async function apiAuthTry(paths, options = {}) {
  let lastErr = null;

  for (const p of paths) {
    try {
      return await apiAuth(p, options);
    } catch (e) {
      lastErr = e;
      // try next
    }
  }

  throw lastErr || new Error("All endpoints failed");
}


function getCurrentUser() {
  return (
    JSON.parse(localStorage.getItem("careCompanionUser")) ||
    JSON.parse(sessionStorage.getItem("careCompanionUser")) ||
    null
  );
}

async function apiAuth(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// =========================
// State Variables
// =========================
let currentTimer = 30;
let timerInterval;
let activeCall = null; // 'helper', 'backup', 'family', 'emergency'
let callActive = false;
let emergencyMode = false;

// Dynamic contacts loaded from backend
let contacts = [];
let helperMain = null;
let helperBackup = null;
let familyContacts = [];

// =========================
// Initialize Page
// =========================
document.addEventListener('DOMContentLoaded', async function () {
  // Set current date
  setCurrentDate();

  // Update greeting based on time of day
  updateGreeting();

  // Set up event listeners
  setupEventListeners();

  // Check user authentication
  checkAuthStatus();

  // Load contacts into the page (if logged in)
  try {
    await loadContactsIntoEmergencies();
  } catch (e) {
    console.error(e);
    // Don’t block UI — page can still work with hardcoded defaults
  }
});

// =========================
// Date & Time Functions
// =========================
function setCurrentDate() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const dateDisplay = document.getElementById('current-date-display');
  dateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

function updateGreeting() {
  const hour = new Date().getHours();
  const greetingMessage = document.getElementById('greeting-message');
  let greeting = '';

  if (hour < 12) {
    greeting = 'Good morning! Stay safe and remember your helpers are here for you.';
  } else if (hour < 18) {
    greeting = 'Good afternoon! Stay safe and remember your helpers are here for you.';
  } else {
    greeting = 'Good evening! Stay safe and remember your helpers are here for you.';
  }

  greetingMessage.textContent = greeting;
}

// =========================
// Load contacts into Emergencies UI
// =========================
async function loadContactsIntoEmergencies() {
  const token = getToken();
  if (!token) return;

  const data = await apiAuthTry(
  [
    "/me/contacts",
    "/profile/me/contacts",
    "/api/me/contacts",
    "/api/profile/me/contacts",
  ],
  { method: "GET" }
);

  contacts = data?.contacts || [];

  // helpers = caregiver/helper/doctor
  const helpers = contacts
    .filter(c => {
      const rel = String(c.relationship || "").toLowerCase();
      return ["caregiver", "helper", "doctor"].includes(rel);
    })
    .sort((a, b) => (b.isPrimary || 0) - (a.isPrimary || 0) || (b.id || 0) - (a.id || 0));

  helperMain = helpers[0] || null;
  helperBackup = helpers[1] || null;

  // family = everything else
  familyContacts = contacts
    .filter(c => {
      const rel = String(c.relationship || "").toLowerCase();
      return !["caregiver", "helper", "doctor"].includes(rel);
    })
    .sort((a, b) => (b.isPrimary || 0) - (a.isPrimary || 0) || (b.id || 0) - (a.id || 0));

  // --- Update helper cards (requires small HTML ids, see below)
  const mainNameEl = document.getElementById("main-helper-name");
  const mainPhoneEl = document.getElementById("main-helper-phone");
  const backupNameEl = document.getElementById("backup-helper-name");
  const backupPhoneEl = document.getElementById("backup-helper-phone");

  if (helperMain && mainNameEl && mainPhoneEl) {
    mainNameEl.textContent = helperMain.name || "Main Helper";
    mainPhoneEl.textContent = helperMain.phone || "-";
    callHelperBtn.dataset.phone = helperMain.phone || "";
    callHelperBtn.dataset.name = helperMain.name || "Main Helper";
  }

  if (helperBackup && backupNameEl && backupPhoneEl) {
    backupNameEl.textContent = helperBackup.name || "Backup Helper";
    backupPhoneEl.textContent = helperBackup.phone || "-";
    callBackupBtn.dataset.phone = helperBackup.phone || "";
    callBackupBtn.dataset.name = helperBackup.name || "Backup Helper";
  }

  // --- Render family section dynamically (requires container id, see below)
  const familyContainer = document.getElementById("family-container");
  if (familyContainer) {
    if (!familyContacts.length) {
      familyContainer.innerHTML = `<p style="color:#718096; padding:12px;">No family contacts yet.</p>`;
    } else {
      familyContainer.innerHTML = familyContacts.map(renderFamilyCard).join("");

      // Bind click events for dynamically created buttons
      familyContainer.querySelectorAll(".family-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const phone = e.currentTarget.dataset.phone || "";
          const name = e.currentTarget.dataset.name || "Family";
          startCallTimer("family", name, false);

          // Optional real call
          // if (phone) window.location.href = `tel:${phone}`;
        });
      });
    }
  }
}

function renderFamilyCard(c) {
  return `
    <div class="contact-card">
      <div class="contact-header">
        <div class="contact-avatar family-avatar">
          <i class="fas fa-users"></i>
        </div>
        <div class="contact-info">
          <h3>${escapeHTML(c.name)}</h3>
          <p class="contact-role">${escapeHTML(c.relationship || "Family")}</p>
          ${Number(c.isPrimary) === 1 ? `<p class="contact-relationship"><i class="fas fa-star"></i> Primary</p>` : ""}
        </div>
      </div>

      <div class="contact-details">
        <p><i class="fas fa-phone"></i> <strong>Phone:</strong> ${escapeHTML(c.phone || "-")}</p>
      </div>

      <button class="contact-call-btn family-btn" data-phone="${escapeHTML(c.phone || "")}" data-name="${escapeHTML(c.name)}">
        <i class="fas fa-phone"></i>
        <span>CALL</span>
        <small>Talk to ${escapeHTML(c.name)}</small>
      </button>
    </div>
  `;
}

// =========================
// Call Timer Functions
// =========================
function startCallTimer(callType, recipientName, isEmergency = false) {
  // Stop any existing timer
  stopCallTimer();

  // Set active call
  activeCall = callType;
  emergencyMode = isEmergency;
  callActive = true;

  // Update sidebar timer
  timerDisplay.textContent = '30s';
  timerStatus.textContent = `Calling ${recipientName}`;
  timerCancelBtn.style.display = 'block';

  // Update modal
  timerModalTitle.textContent = `Calling ${recipientName}`;
  callRecipient.textContent = recipientName;
  callStatus.textContent = 'Connecting...';

  // Show emergency backup for emergency calls
  if (isEmergency) {
    emergencyBackup.style.display = 'block';
    timerMessage.innerHTML = `
            You have <span class="time-remaining">30 seconds</span> to talk.<br>
            If timer reaches 0, <strong>EMERGENCY SERVICES will be notified automatically</strong>.
        `;
  } else {
    emergencyBackup.style.display = 'none';
    timerMessage.innerHTML = `
            You have <span class="time-remaining">30 seconds</span> to talk.<br>
            If timer reaches 0, your helper will be alerted to check on you.
        `;
  }

  // Show timer modal
  callTimerModal.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Start countdown
  currentTimer = 30;
  modalTimerDisplay.textContent = currentTimer;
  updateTimerColor();

  timerInterval = setInterval(() => {
    currentTimer--;
    modalTimerDisplay.textContent = currentTimer;
    timerDisplay.textContent = `${currentTimer}s`;
    updateTimerColor();

    // Update call status
    if (currentTimer === 25) {
      callStatus.textContent = 'Ringing...';
    } else if (currentTimer === 20) {
      callStatus.textContent = 'Call connected - start talking';
    } else if (currentTimer <= 10) {
      callStatus.textContent = `${currentTimer}s remaining`;
    }

    // Timer reaches 0 - automatic action
    if (currentTimer <= 0) {
      clearInterval(timerInterval);
      handleTimerExpired();
    }
  }, 1000);

  // Show toast notification
  showToast(`Calling ${recipientName}... Timer started.`, 'info');
}

function updateTimerColor() {
  if (currentTimer > 10) {
    modalTimerDisplay.style.color = '#10b981';
    timerDisplay.style.color = '#10b981';
  } else if (currentTimer > 5) {
    modalTimerDisplay.style.color = '#f59e0b';
    timerDisplay.style.color = '#f59e0b';
  } else {
    modalTimerDisplay.style.color = '#ef4444';
    timerDisplay.style.color = '#ef4444';
  }
}

function stopCallTimer() {
  clearInterval(timerInterval);
  callActive = false;
  emergencyMode = false;

  // Reset sidebar timer
  timerDisplay.textContent = 'Ready';
  timerStatus.textContent = 'No active call';
  timerCancelBtn.style.display = 'none';

  // Close modal
  callTimerModal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function handleTimerExpired() {
  clearInterval(timerInterval);

  if (emergencyMode) {
    triggerEmergencyAlert();
  } else {
    triggerCheckInAlert();
  }

  stopCallTimer();
}

// =========================
// Alert Functions
// =========================
function triggerEmergencyAlert() {
  console.log('EMERGENCY ALERT: Timer expired, sending emergency services');
  showToast('EMERGENCY ALERT SENT! Help is on the way.', 'emergency');

  setTimeout(() => {
    alert('🚨 EMERGENCY ALERT ACTIVATED 🚨\n\nEmergency services have been notified and are on their way.\n\nPlease stay on the line if you can. Help is coming!');
  }, 1000);
}

function triggerCheckInAlert() {
  console.log('CHECK-IN ALERT: Timer expired, notifying caregiver');
  showToast('Alert sent to caregiver to check on you.', 'warning');

  setTimeout(() => {
    alert('⏰ CHECK-IN ALERT ⏰\n\nYour caregiver has been alerted to check on you.\n\nThey will contact you or come to check on you soon.');
  }, 1000);
}

// =========================
// Call Functions (now uses DB-loaded names/phones if available)
// =========================
function initiateHelperCall(isBackup = false) {
  const btn = isBackup ? callBackupBtn : callHelperBtn;

  const recipientName =
    btn.dataset.name ||
    (isBackup ? 'Backup Helper' : 'Main Helper');

  startCallTimer(isBackup ? 'backup' : 'helper', recipientName, false);

  // Optional real call
  // const phone = btn.dataset.phone || "";
  // if (phone) window.location.href = `tel:${phone}`;
}

function initiateEmergency911() {
  startCallTimer('emergency', '911 Emergency Services', true);
  // window.location.href = 'tel:911';
}

// =========================
// Modal Button Functions
// =========================
function cancelActiveCall() {
  if (confirm('Are you sure you want to cancel this call?')) {
    stopCallTimer();
    showToast('Call cancelled.', 'info');
  }
}

function markCallConnected() {
  if (timerInterval) {
    clearInterval(timerInterval);
    callStatus.textContent = 'Call connected - talking';
    timerStatus.textContent = 'On call...';
    modalTimerDisplay.textContent = '✓';
    modalTimerDisplay.style.color = '#10b981';

    showToast('Great! Keep talking. Call will end normally.', 'success');

    setTimeout(() => {
      stopCallTimer();
      showToast('Call ended normally.', 'info');
    }, 5000);
  }
}

function requestMoreHelp() {
  if (emergencyMode) {
    triggerEmergencyAlert();
    stopCallTimer();
  } else {
    showToast('Upgrading to emergency alert...', 'warning');
    clearInterval(timerInterval);
    triggerEmergencyAlert();
    stopCallTimer();
  }
}

// =========================
// Toast Notification
// =========================
function showToast(message, type = 'info') {
  const toastMessage = toast.querySelector('.toast-message');
  const toastIcon = toast.querySelector('.toast-icon');

  toastMessage.textContent = message;

  switch (type) {
    case 'success':
      toastIcon.className = 'fas fa-check-circle toast-icon';
      toastIcon.style.color = '#10b981';
      break;
    case 'warning':
      toastIcon.className = 'fas fa-exclamation-triangle toast-icon';
      toastIcon.style.color = '#f59e0b';
      break;
    case 'emergency':
      toastIcon.className = 'fas fa-exclamation-circle toast-icon';
      toastIcon.style.color = '#ef4444';
      break;
    case 'info':
    default:
      toastIcon.className = 'fas fa-info-circle toast-icon';
      toastIcon.style.color = '#3b82f6';
      break;
  }

  toast.classList.add('show');
  const duration = type === 'emergency' ? 5000 : 3000;
  setTimeout(() => toast.classList.remove('show'), duration);
}

// =========================
// Authentication Functions (match Profile page keys)
// =========================
function checkAuthStatus() {
  const token = getToken();
  const user = getCurrentUser();

  if (token && user) {
    headerUserName.textContent = user.name || 'User';
    loginLink.style.display = 'none';
    logoutLink.style.display = 'flex';
  } else {
    headerUserName.textContent = 'Guest';
    loginLink.style.display = 'flex';
    logoutLink.style.display = 'none';
  }
}

function logoutUser() {
  if (!confirm("Are you sure you want to logout?")) return;

  localStorage.removeItem("careCompanionToken");
  localStorage.removeItem("careCompanionUser");
  localStorage.removeItem("careCompanionRemember");
  sessionStorage.removeItem("careCompanionUser");

  showToast("Logged out successfully", "success");
  setTimeout(() => (window.location.href = "LoginScreen.html"), 500);
}

// =========================
// Event Listeners Setup
// =========================
function setupEventListeners() {
  // Call buttons
  callHelperBtn.addEventListener('click', () => initiateHelperCall(false));
  callBackupBtn.addEventListener('click', () => initiateHelperCall(true));
  emergency911Btn.addEventListener('click', initiateEmergency911);

  // Timer controls
  timerCancelBtn.addEventListener('click', cancelActiveCall);
  cancelCallBtn.addEventListener('click', cancelActiveCall);
  callConnectedBtn.addEventListener('click', markCallConnected);
  needHelpBtn.addEventListener('click', requestMoreHelp);

  // Close modal when clicking outside
  callTimerModal.addEventListener('click', (e) => {
    if (e.target === callTimerModal) {
      if (confirm('Cancel the call and timer?')) {
        stopCallTimer();
      }
    }
  });

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && callTimerModal.style.display === 'flex') {
      if (confirm('Cancel the call and timer?')) {
        stopCallTimer();
      }
    }
  });

  // User dropdown
  userSection.addEventListener('mouseenter', () => {
    userDropdown.style.display = 'block';
  });

  userSection.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!userDropdown.matches(':hover')) {
        userDropdown.style.display = 'none';
      }
    }, 200);
  });

  userDropdown.addEventListener('mouseleave', () => {
    userDropdown.style.display = 'none';
  });

  // Logout link
  logoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    logoutUser();
  });

  // Smooth scroll for sidebar links
  document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });

        document.querySelectorAll('.sidebar-menu li').forEach(item => {
          item.classList.remove('active');
        });
        link.parentElement.classList.add('active');
      }
    });
  });

  // Visual guide items - show which button to press
  document.querySelectorAll('.visual-item').forEach(item => {
    item.addEventListener('click', () => {
      const buttonType = item.getAttribute('data-button');
      let message = '';

      switch (buttonType) {
        case 'helper':
          message = 'Press the GREEN "Call Helper" button for daily help';
          break;
        case 'family':
          message = 'Press the BLUE "Call Family" button to talk to family';
          break;
        case 'emergency':
          message = 'Press the RED "Emergency 911" button ONLY for serious emergencies';
          break;
      }

      showToast(message, 'info');
    });
  });
}

// =========================
// Accessibility Features
// =========================
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.altKey) {
    switch (e.key) {
      case '1':
        e.preventDefault();
        initiateHelperCall(false);
        break;
      case '2':
        e.preventDefault();
        initiateHelperCall(true);
        break;
      case '9':
        e.preventDefault();
        if (confirm('Are you sure you want to call 911?')) {
          initiateEmergency911();
        }
        break;
      case 'c':
        e.preventDefault();
        if (callActive) cancelActiveCall();
        break;
      case ' ':
        e.preventDefault();
        if (callActive) markCallConnected();
        break;
    }
  }
});

// Announce timer changes for screen readers (kept as-is)
function announceTimer(time) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = `${time} seconds remaining`;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// =========================
// Export for testing if needed
// =========================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startCallTimer,
    stopCallTimer,
    initiateHelperCall,
    initiateEmergency911,
    showToast
  };
}

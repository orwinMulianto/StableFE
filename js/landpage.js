const BASE_URL = "http://localhost:8080/api/v1";

const { createTimer } = anime;

// ── TIMER ──
let seconds = 0;
setInterval(() => {
  seconds++;
  if (seconds >= 3600) seconds = 0;
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const timeEl = document.getElementById("time");
  if (timeEl) timeEl.innerHTML = `${mins}:${secs}`;
}, 1000);

// ── PREVENT ZOOM ──
document.addEventListener("keydown", (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === "+" || e.key === "-" || e.key === "=")
  ) {
    e.preventDefault();
  }
});
document.addEventListener(
  "wheel",
  (e) => {
    if (e.ctrlKey) e.preventDefault();
  },
  { passive: false },
);

document.addEventListener("DOMContentLoaded", () => {
  feather.replace();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = "../page/dashboard.html";
    return;
  }

  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("modal-close");

  document.querySelectorAll("#open-login").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      overlay.classList.add("active");
    });
  });

  closeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    overlay.classList.remove("active");
  });

  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("active");
  });

  const googleBtn = document.getElementById("btn-google");
  googleBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = `${BASE_URL}/auth/google/login`;
  });

  const togglePassword = document.getElementById("togglePassword");
  const loginPassInput = document.getElementById("loginPasswordInput");
  if (togglePassword && loginPassInput) {
    togglePassword.addEventListener("click", () => {
      const isHidden = loginPassInput.type === "password";
      loginPassInput.type = isHidden ? "text" : "password";
      togglePassword.innerHTML = isHidden
        ? `<i data-feather="eye"></i>`
        : `<i data-feather="eye-off"></i>`;
      feather.replace();
    });
  }
});
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

// ── SEMUA LOGIC DI SATU DOMContentLoaded ──
document.addEventListener("DOMContentLoaded", () => {
  // Feather icons
  feather.replace();

  // Token dari Google OAuth callback
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = "../page/dashboard.html";
    return;
  }

  // Modal
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

  // Google login
  const googleBtn = document.getElementById("btn-google");
  googleBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "http://localhost:8080/api/v1/auth/google/login";
  });

  // Toggle password
  const togglePassword = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("passwordInput");
  if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
      const isHidden = passwordInput.type === "password";
      passwordInput.type = isHidden ? "text" : "password";
      togglePassword.innerHTML = isHidden
        ? `<i data-feather="eye"></i>`
        : `<i data-feather="eye-off"></i>`;
      feather.replace();
    });
  }

  // Login
  const loginBtn = document.getElementById("loginBtn");
  console.log("loginBtn:", loginBtn); // ← cek apakah null

  if (loginBtn) {
    const errorEl = document.createElement("p");
    errorEl.style.cssText =
      "color:#ff4d4d;font-size:0.78rem;text-align:center;margin-top:8px;min-height:18px;";
    loginBtn.insertAdjacentElement("afterend", errorEl);

    loginBtn.addEventListener("click", async () => {
      const emailInput = document.getElementById("emailInput");
      const passwordInput = document.getElementById("passwordInput");
      const rememberMe = document.getElementById("rememberMe");

      const email = emailInput?.value.trim() ?? "";
      const password = passwordInput?.value ?? "";
      const remember = rememberMe?.checked ?? false;

      errorEl.textContent = "";

      if (!email || !password) {
        errorEl.textContent = "Email dan password wajib diisi.";
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = "SIGNING IN...";

      try {
        const res = await fetch("http://localhost:8080/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        console.log("FULL RESPONSE:", data);
        console.log("TOKEN:", data?.data?.token);

        if (!res.ok) {
          const msg = data.message || data.error || "";
          if (
            msg.includes("belum diverifikasi") ||
            msg.includes("not verified")
          ) {
            localStorage.setItem("pending_email", email);
            window.location.href = "../page/verify-email.html";
            return;
          }
          errorEl.textContent = msg || "Login gagal.";
          loginBtn.disabled = false;
          loginBtn.textContent = "SIGN IN";
          return;
        }

        const savedToken = data.data?.token;
        if (remember) {
          localStorage.setItem("token", savedToken);
        } else {
          sessionStorage.setItem("token", savedToken);
        }

        window.location.href = "../page/dashboard.html";
      } catch (err) {
        console.error(err);
        errorEl.textContent = "Server error. Coba lagi.";
        loginBtn.disabled = false;
        loginBtn.textContent = "SIGN IN";
      }
    });
  }
  const savedToken = data.data?.token;
  const user = data.data?.user;

  if (savedToken) {
    if (remember) {
      localStorage.setItem("token", savedToken);
    } else {
      sessionStorage.setItem("token", savedToken);
    }
  }

  const role = user?.role || user?.Role || "";
  if (role === "TRAINER") {
    window.location.href = "../page/trainer-dashboard.html";
  } else {
    window.location.href = "../page/dashboard.html";
  }
});

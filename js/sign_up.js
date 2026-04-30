document.addEventListener("DOMContentLoaded", () => {
  feather.replace();
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

  // ── TOGGLE PASSWORD (modal login) ──
  const toggleLoginPassword = document.getElementById("toggleLoginPassword");
  const loginPasswordInput = document.getElementById("loginPasswordInput");
  if (toggleLoginPassword && loginPasswordInput) {
    toggleLoginPassword.addEventListener("click", () => {
      const isHidden = loginPasswordInput.type === "password";
      loginPasswordInput.type = isHidden ? "text" : "password";
      toggleLoginPassword.innerHTML = isHidden
        ? `<i data-feather="eye"></i>`
        : `<i data-feather="eye-off"></i>`;
      feather.replace();
    });
  }

  // ── TOKEN DARI GOOGLE CALLBACK ──
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    localStorage.setItem("token", token);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = "../page/home.html";
  }

  // ── GOOGLE ──
  const googleSignup = document.getElementById("googleSignup");
  if (googleSignup) {
    googleSignup.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "http://localhost:8080/api/v1/auth/google/login";
    });
  }

  const overlay = document.getElementById("modal-overlay");
  const closeBtn = document.getElementById("modal-close");

  // ← pakai querySelectorAll bukan getElementById
  document.querySelectorAll("#open-login").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (overlay) overlay.classList.add("active");
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      overlay.classList.remove("active");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  }

  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    const loginError = document.createElement("p");
    loginError.style.cssText =
      "color:#ff4d4d; font-size:0.78rem; text-align:center; margin-top:8px; min-height:18px;";
    loginBtn.insertAdjacentElement("afterend", loginError);

    loginBtn.addEventListener("click", async () => {
      const email = document.getElementById("emailInput")?.value.trim() ?? "";
      const password =
        document.getElementById("loginPasswordInput")?.value ?? "";
      const rememberMe =
        document.getElementById("rememberMe")?.checked ?? false;

      loginError.textContent = "";

      if (!email || !password) {
        loginError.textContent = "Email dan password wajib diisi.";
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

        if (!res.ok || data.status === false) {
          const msg = (data.error || data.message || "").toLowerCase();

          if (msg.includes("verifikasi")) {
            localStorage.setItem("pending_email", email);
            window.location.href = "../page/verify_email.html";
            return;
          }

          loginError.textContent = msg || "Login gagal.";
          loginBtn.disabled = false;
          loginBtn.textContent = "SIGN IN";
          return;
        }

        const savedToken = data.data?.token;
        if (rememberMe) {
          localStorage.setItem("token", savedToken);
        } else {
          sessionStorage.setItem("token", savedToken);
        }

        window.location.href = "../page/dashboard.html";
      } catch (err) {
        console.error(err);
        loginError.textContent = "Server error. Coba lagi.";
        loginBtn.disabled = false;
        loginBtn.textContent = "SIGN IN";
      }
    });
  }

  // ── SIGNUP FORM ──
  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    const signupError = document.createElement("p");
    signupError.style.cssText =
      "color:#ff4d4d; font-size:0.78rem; text-align:center; margin-top:8px; min-height:18px;";
    signupForm.appendChild(signupError);

    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      signupError.textContent = "";

      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("passwordInput").value;
      const username = `${firstName} ${lastName}`.trim();
      const btn = document.getElementById("signupBtn");

      if (!firstName || !lastName || !email || !password) {
        signupError.textContent = "Semua field wajib diisi.";
        return;
      }
      if (password.length < 6) {
        signupError.textContent = "Password minimal 6 karakter.";
        return;
      }

      btn.disabled = true;
      btn.textContent = "CREATING...";

      try {
        const res = await fetch("http://localhost:8080/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        });

        const data = await res.json();

        if (!res.ok || data.status === false) {
          signupError.textContent =
            data.message || data.error || "Register gagal.";
          btn.disabled = false;
          btn.textContent = "CREATE ACCOUNT";
          return;
        }
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");

        localStorage.setItem("pending_email", email);
        window.location.href = "../page/verify_email.html";
      } catch (err) {
        console.error(err);
        signupError.textContent = "Server error. Coba lagi.";
        btn.disabled = false;
        btn.textContent = "CREATE ACCOUNT";
      }
    });
  }
});

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

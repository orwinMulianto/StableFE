(function stableLoginModal() {
  const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";
  let lastFocusedElement = null;

  function getRootPrefix() {
    const path = window.location.pathname.replaceAll("\\", "/");
    const pageIndex = path.lastIndexOf("/page/");

    if (pageIndex === -1) return "";

    const insidePage = path.slice(pageIndex + "/page/".length);
    const folderDepth = Math.max(
      0,
      insidePage.split("/").filter(Boolean).length - 1,
    );

    return "../".repeat(folderDepth + 1);
  }

  function createModalIfMissing() {
    if (document.getElementById("modal-overlay")) return;

    const rootPrefix = getRootPrefix();

    document.body.insertAdjacentHTML(
      "beforeend",
      `
        <div class="modal-overlay" id="modal-overlay" aria-hidden="true">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="loginTitle">
            <div class="modal-logo">
              <img src="${rootPrefix}Img/logo.png" alt="Logo STABLE" />
            </div>

            <h2 id="loginTitle">Sign in to STABLE</h2>

            <div class="form-group">
              <label for="emailInput">EMAIL</label>
              <input type="email" id="emailInput" autocomplete="email" />
            </div>

            <div class="form-group">
              <label for="loginPasswordInput">PASSWORD</label>
              <div class="input-wrapper">
                <input
                  type="password"
                  id="loginPasswordInput"
                  autocomplete="current-password"
                />
                <span id="togglePassword" role="button" tabindex="0" aria-label="Show password">
                  <i data-feather="eye-off"></i>
                </span>
              </div>
            </div>

            <div class="form-extras">
              <label class="remember-me">
                <input type="checkbox" id="rememberMe" />
                Remember me
              </label>
              <a href="#" class="forgot">Forgot Password?</a>
            </div>

            <button class="btn-create" id="loginBtn" type="button">SIGN IN</button>

            <div class="divider"><span>or</span></div>

            <button class="btn-google" id="btn-google" type="button">
              <img
                src="https://www.google.com/favicon.ico"
                alt=""
                width="20"
              />
              Continue with Google
            </button>

            <p class="signup-text">
              New to STABLE?
              <a href="${rootPrefix}page/sign_up.html">Create an account</a>
            </p>
            <a href="#" class="back-home" id="modal-close">Back</a>
          </div>
        </div>
      `,
    );

    if (window.feather) {
      window.feather.replace();
    }
  }

  function getElements() {
    return {
      overlay: document.getElementById("modal-overlay"),
      modal: document.querySelector("#modal-overlay .modal"),
      closeBtn: document.getElementById("modal-close"),
      loginBtn: document.getElementById("loginBtn"),
      googleBtn: document.getElementById("btn-google"),
      emailInput: document.getElementById("emailInput"),
      passwordInput: document.getElementById("loginPasswordInput"),
      rememberMe: document.getElementById("rememberMe"),
      togglePassword: document.getElementById("togglePassword"),
    };
  }

  function ensureErrorElement(loginBtn) {
    let errorEl = document.getElementById("loginError");

    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.id = "loginError";
      errorEl.className = "login-error";
      loginBtn.insertAdjacentElement("afterend", errorEl);
    }

    return errorEl;
  }

  function openLoginModal() {
    const { overlay, emailInput } = getElements();
    if (!overlay) return;

    lastFocusedElement = document.activeElement;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("login-modal-open");
    document.body.classList.add("login-modal-open");

    const errorEl = document.getElementById("loginError");
    if (errorEl) errorEl.textContent = "";

    window.setTimeout(() => emailInput?.focus(), 80);
  }

  function closeLoginModal() {
    const { overlay } = getElements();
    if (!overlay) return;

    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("login-modal-open");
    document.body.classList.remove("login-modal-open");

    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }

    if (window.location.hash === "#login") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  function normalizeLoginResult(result) {
    const data = result.data || result;
    const user = data.user || result.user || {};
    const token =
      data.token ||
      data.access_token ||
      data.accessToken ||
      result.token ||
      "";

    return {
      token,
      user: {
        id: user.id || user.ID || user.user_id || data.user_id || null,
        name:
          user.name ||
          user.Name ||
          user.username ||
          user.Username ||
          data.name ||
          data.username ||
          "Guest",
        email: user.email || user.Email || data.email || "",
        role: user.role || user.Role || data.role || "USER",
      },
    };
  }

  function parseJwt(token) {
    try {
      const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
      return JSON.parse(atob(payload));
    } catch (error) {
      return null;
    }
  }

  function mergeUser(baseUser, nextUser = {}) {
    const payload = parseJwt(baseUser.token || "") || {};
    return {
      id:
        payload.id ||
        payload.user_id ||
        payload.sub ||
        nextUser.id ||
        nextUser.ID ||
        nextUser.user_id ||
        nextUser.UserID ||
        baseUser.id ||
        null,
      name:
        nextUser.name ||
        nextUser.Name ||
        nextUser.username ||
        nextUser.Username ||
        baseUser.name ||
        "Guest",
      email: nextUser.email || nextUser.Email || baseUser.email || "",
      role:
        payload.role ||
        payload.Role ||
        nextUser.role ||
        nextUser.Role ||
        baseUser.role ||
        "USER",
    };
  }

  async function fetchLatestUser(user, token) {
    if (!user?.id || !token) return user;

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return user;

      const result = await response.json();
      return mergeUser({ ...user, token }, result.data || result);
    } catch (error) {
      console.warn("failed to refresh user role:", error);
      return user;
    }
  }

  function saveLoginSession(token, user, remember) {
    const storage = remember ? localStorage : sessionStorage;

    localStorage.removeItem("token");
    localStorage.removeItem("stableUser");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("stableUser");

    storage.setItem("token", token);
    storage.setItem("stableUser", JSON.stringify(user));
  }

  function cleanGoogleCallbackURL() {
    const url = new URL(window.location.href);
    const callbackKeys = [
      "token",
      "access_token",
      "accessToken",
      "google_token",
      "id",
      "user_id",
      "name",
      "username",
      "email",
      "role",
      "user",
    ];

    callbackKeys.forEach((key) => url.searchParams.delete(key));

    const cleanURL = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", cleanURL);
  }

  function parseGoogleUserFromQuery(params) {
    const rawUser = params.get("user");

    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        return {
          id: parsedUser.id || parsedUser.ID || parsedUser.user_id || null,
          name:
            parsedUser.name ||
            parsedUser.Name ||
            parsedUser.username ||
            parsedUser.Username ||
            "Guest",
          email: parsedUser.email || parsedUser.Email || "",
          role: parsedUser.role || parsedUser.Role || "USER",
        };
      } catch (error) {
        console.warn("Google user query is not valid JSON:", error);
      }
    }

    return {
      id: params.get("id") || params.get("user_id") || null,
      name: params.get("name") || params.get("username") || "Guest",
      email: params.get("email") || "",
      role: params.get("role") || "USER",
    };
  }

  async function handleGoogleCallbackFromQuery() {
    const params = new URLSearchParams(window.location.search);
    const token =
      params.get("token") ||
      params.get("access_token") ||
      params.get("accessToken") ||
      params.get("google_token");

    if (!token) {
      return false;
    }

    let user = mergeUser({ token }, parseGoogleUserFromQuery(params));
    user = await fetchLatestUser(user, token);

    saveLoginSession(token, user, true);
    cleanGoogleCallbackURL();
    redirectAfterLogin(user);

    return true;
  }

  function redirectAfterLogin(user) {
    const rootPrefix = getRootPrefix();
    const customRedirect = document.body.dataset.loginRedirect;

    if (customRedirect === "reload") {
      window.location.reload();
      return;
    }

    if (customRedirect) {
      window.location.href = customRedirect;
      return;
    }

    const role = String(user.role || "").toLowerCase();

    if (role === "trainer") {
      window.location.href = `${rootPrefix}page/trainer/trainer-dashboard.html`;
      return;
    }

    window.location.href = `${rootPrefix}page/dashboard.html`;
  }

  function setButtonLoading(loginBtn, isLoading) {
    loginBtn.disabled = isLoading;
    loginBtn.textContent = isLoading ? "SIGNING IN..." : "SIGN IN";
  }

  async function handleLogin() {
    const {
      loginBtn,
      emailInput,
      passwordInput,
      rememberMe,
    } = getElements();
    const errorEl = ensureErrorElement(loginBtn);
    const email = emailInput?.value.trim() || "";
    const password = passwordInput?.value || "";
    const remember = rememberMe?.checked || false;

    errorEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "Email dan password wajib diisi.";
      return;
    }

    setButtonLoading(loginBtn, true);

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = result.message || "";
        const error = result.error || "";
        const combined = `${message} ${error}`.toLowerCase();

        if (
          combined.includes("belum diverifikasi") ||
          combined.includes("not verified")
        ) {
          localStorage.setItem("pending_email", email);
          window.location.href = `${getRootPrefix()}page/verify_email.html`;
          return;
        }

        errorEl.textContent = message || error || "Login gagal.";
        return;
      }

      const session = normalizeLoginResult(result);

      if (!session.token) {
        errorEl.textContent = "Token login tidak ditemukan dari server.";
        return;
      }

      session.user = await fetchLatestUser(session.user, session.token);
      saveLoginSession(session.token, session.user, remember);
      errorEl.classList.add("success");
      errorEl.textContent = "Login berhasil.";

      window.setTimeout(() => redirectAfterLogin(session.user), 250);
    } catch (error) {
      console.error("login error:", error);
      errorEl.textContent = "Server error. Coba lagi.";
    } finally {
      setButtonLoading(loginBtn, false);
    }
  }

  function updatePasswordIcon(isVisible) {
    const { togglePassword } = getElements();
    if (!togglePassword) return;

    togglePassword.innerHTML = `<i data-feather="${isVisible ? "eye" : "eye-off"}"></i>`;
    togglePassword.setAttribute(
      "aria-label",
      isVisible ? "Hide password" : "Show password",
    );

    if (window.feather) {
      window.feather.replace();
    }
  }

  function togglePasswordVisibility() {
    const { passwordInput } = getElements();
    if (!passwordInput) return;

    const isVisible = passwordInput.type === "text";
    passwordInput.type = isVisible ? "password" : "text";
    updatePasswordIcon(!isVisible);
  }

  function bindEvents() {
    const {
      overlay,
      modal,
      closeBtn,
      loginBtn,
      googleBtn,
      passwordInput,
      togglePassword,
    } = getElements();

    if (!overlay || !modal || !loginBtn) return;

    ensureErrorElement(loginBtn);

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("#open-login, [data-open-login]");

      if (trigger) {
        event.preventDefault();
        openLoginModal();
      }
    });

    closeBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      closeLoginModal();
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeLoginModal();
    });

    loginBtn.addEventListener("click", handleLogin);

    passwordInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleLogin();
    });

    togglePassword?.addEventListener("click", togglePasswordVisibility);
    togglePassword?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        togglePasswordVisibility();
      }
    });

    googleBtn?.addEventListener("click", () => {
      window.location.href = `${API_BASE}/auth/google/login`;
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay.classList.contains("active")) {
        closeLoginModal();
      }
    });

    if (window.location.hash === "#login") {
      openLoginModal();
    }
  }

  async function init() {
    if (await handleGoogleCallbackFromQuery()) {
      return;
    }

    createModalIfMissing();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }
})();

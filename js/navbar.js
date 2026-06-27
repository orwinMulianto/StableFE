(function initializeNavbar() {
  if (window.__stableNavbarInitialized) {
    return;
  }
  window.__stableNavbarInitialized = true;
  const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";

  function readJSON(storage, key) {
    try {
      const value = storage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      storage.removeItem(key);
      return null;
    }
  }

  function readUser() {
    return (
      readJSON(localStorage, "stableUser") ||
      readJSON(sessionStorage, "stableUser")
    );
  }

  function readToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  function clearStoredAuthUser() {
    localStorage.removeItem("stableUser");
    sessionStorage.removeItem("stableUser");
  }

  function isAuthenticated() {
    return Boolean(readToken());
  }

  function writeUser(user) {
    const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
    storage.setItem("stableUser", JSON.stringify(user));
  }

  function parseJwt(token) {
    try {
      const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
      return JSON.parse(atob(payload));
    } catch (error) {
      return null;
    }
  }

  function parseUserFromParams(params, token) {
    const rawUser = params.get("user");
    const payload = token ? parseJwt(token) : null;

    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        return normalizeUser(parsedUser, payload);
      } catch (error) {
        console.warn("Google callback user query is not valid JSON:", error);
      }
    }

    return normalizeUser(
      {
        id: params.get("id") || params.get("user_id"),
        name: params.get("name") || params.get("username"),
        email: params.get("email"),
        role: params.get("role"),
      },
      payload,
    );
  }

  function normalizeUser(user, payload) {
    return {
      id:
        payload?.id ||
        payload?.user_id ||
        payload?.sub ||
        user?.id ||
        user?.ID ||
        user?.user_id ||
        user?.UserID ||
        null,
      name:
        user?.name ||
        user?.Name ||
        user?.username ||
        user?.Username ||
        payload?.name ||
        payload?.username ||
        "User",
      email: user?.email || user?.Email || payload?.email || "",
      role: payload?.role || payload?.Role || user?.role || user?.Role || "USER",
    };
  }

  function cleanAuthCallbackURL() {
    const url = new URL(window.location.href);
    const keys = [
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

    keys.forEach((key) => {
      url.searchParams.delete(key);
      url.hash = url.hash
        .replace(new RegExp(`([#&])${key}=[^&]*`, "g"), "$1")
        .replace(/[?#&]+$/, "");
    });

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  async function fetchLatestUser(user, token) {
    if (!user?.id || !token) return user;

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return user;

      const result = await response.json();
      return normalizeUser(result.data || result, null);
    } catch (error) {
      console.warn("failed to refresh navbar user:", error);
      return user;
    }
  }

  async function consumeAuthCallback() {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );
    const token =
      searchParams.get("token") ||
      searchParams.get("access_token") ||
      searchParams.get("accessToken") ||
      searchParams.get("google_token") ||
      hashParams.get("token") ||
      hashParams.get("access_token") ||
      hashParams.get("accessToken") ||
      hashParams.get("google_token");

    if (!token) {
      return null;
    }

    const params = searchParams.toString() ? searchParams : hashParams;
    const user = await fetchLatestUser(parseUserFromParams(params, token), token);

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("stableUser");
    localStorage.setItem("token", token);
    localStorage.setItem("stableUser", JSON.stringify(user));
    cleanAuthCallbackURL();

    return user;
  }

  function getRootPrefix() {
    const path = window.location.pathname.replaceAll("\\", "/");
    const pageIndex = path.lastIndexOf("/page/");

    if (pageIndex === -1) {
      return "";
    }

    const insidePage = path.slice(pageIndex + "/page/".length);
    const folderDepth = Math.max(
      0,
      insidePage.split("/").filter(Boolean).length - 1,
    );

    return "../".repeat(folderDepth + 1);
  }

  function pathTo(route) {
    return `${getRootPrefix()}${route.replace(/^\/+/, "")}`;
  }

  function getCurrentPage() {
    const page = window.location.pathname.split("/").pop();
    return page || "index.html";
  }

  function isPublicOnlyPage() {
    return ["index.html", "sign_up.html", "verify_email.html"].includes(
      getCurrentPage(),
    );
  }

  function dashboardPathFor(user) {
    const role = String(user?.role || user?.Role || "").toLowerCase();
    return role === "trainer"
      ? pathTo("page/trainer/trainer-dashboard.html")
      : pathTo("page/dashboard.html");
  }

  function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = String(value);
    return element.innerHTML;
  }

  function publicMenu() {
    return [
      {
        label: "Home",
        href: pathTo("index.html"),
        page: "index.html",
      },
      {
        label: "About",
        href: pathTo("page/about.html"),
        page: "about.html",
      },
      {
        label: "Trainer",
        href: pathTo("page/trainer.html"),
        page: "trainer.html",
      },
      {
        label: "Sign Up",
        href: pathTo("page/sign_up.html"),
        page: "sign_up.html",
      },
      {
        label: "Log in",
        href: "#login",
        page: null,
        id: "open-login",
      },
    ];
  }

  function memberMenu() {
    return [
      {
        label: "Home",
        href: pathTo("page/dashboard.html"),
        page: "dashboard.html",
      },
      {
        label: "Workout",
        href: pathTo("page/workout.html"),
        page: "workout.html",
      },
      {
        label: "Trainer",
        href: pathTo("page/trainer.html"),
        page: "trainer.html",
      },
      {
        label: "Profile",
        href: pathTo("page/profile.html"),
        page: "profile.html",
      },
    ];
  }

  function trainerMenu() {
    return [
      {
        label: "Home",
        href: pathTo("page/trainer/trainer-dashboard.html"),
        page: "trainer-dashboard.html",
      },
      {
        label: "Clients",
        href: pathTo("page/trainer/trainer-clients.html"),
        page: "trainer-clients.html",
      },
      {
        label: "Profile",
        href: pathTo("page/trainer/trainer-profile.html"),
        page: "trainer-profile.html",
      },
    ];
  }

  function createLink(item, currentPage) {
    const activeClass = item.page === currentPage ? " active" : "";
    const idAttribute = item.id ? ` id="${item.id}"` : "";
    const pageAttribute = item.page ? ` data-page="${item.page}"` : "";

    return `
      <a
        href="${item.href}"
        class="nav-link${activeClass}"
        ${pageAttribute}${idAttribute}
      >
        ${item.label}
      </a>
    `;
  }

  function renderNavbar() {
    const navbarLogo = document.getElementById("navbarLogo");
    const navbarLogoImage = document.getElementById("navbarLogoImage");
    const navbarMenu = document.getElementById("navbar-menu");
    const navActions = document.querySelector(".navbar .nav-actions");

    if (!navbarLogo || !navbarLogoImage || !navbarMenu) {
      return;
    }

    const currentPage = getCurrentPage();
    const authenticated = isAuthenticated();
    const user = authenticated ? readUser() : null;
    const role = String(user?.role || user?.Role || "").toLowerCase();
    const menu = user
      ? role === "trainer"
        ? trainerMenu()
        : memberMenu()
      : publicMenu();

    navbarLogo.href = user ? dashboardPathFor(user) : pathTo("index.html");

    navbarLogoImage.src = pathTo("Img/logo.png");

    navbarMenu.innerHTML = menu
      .map((item) => createLink(item, currentPage))
      .join("");

    if (navActions) {
      navActions.innerHTML = user
        ? `<span class="user-greeting">${escapeHTML(
            user.name || user.username || user.Username || "User",
          )}</span>`
        : "";
    }
  }

  function openLoginFromHash() {
    if (window.location.hash !== "#login") {
      return;
    }

    const loginTrigger = document.getElementById("open-login");
    if (loginTrigger) {
      window.setTimeout(() => loginTrigger.click(), 0);
    }
  }

  async function start() {
    const callbackUser = await consumeAuthCallback();

    if (callbackUser && getCurrentPage() === "index.html") {
      window.location.href = dashboardPathFor(callbackUser);
      return;
    }

    const token = readToken();
    let storedUser = readUser();

    if (!token) {
      clearStoredAuthUser();
      renderNavbar();
      openLoginFromHash();
      return;
    }

    if (token) {
      storedUser = normalizeUser(storedUser || {}, parseJwt(token));
    }

    if (storedUser) {
      storedUser = await fetchLatestUser(storedUser, token);
      writeUser(storedUser);
    }

    if (storedUser && isPublicOnlyPage()) {
      window.location.href = dashboardPathFor(storedUser);
      return;
    }

    renderNavbar();
    openLoginFromHash();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => start(), { once: true });
  } else {
    start();
  }
})();

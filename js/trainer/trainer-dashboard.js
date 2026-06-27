const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";

const DEFAULT_TRAINER_PROFILE = {
  specialization: "-",
  experience: "-",
  bio: "-",
};

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function parseJwt(token) {
  try {
    const payload = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(payload));
  } catch (error) {
    return null;
  }
}

function readJSON(key, fallback = null) {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = storage.getItem(key);
      if (value) return JSON.parse(value);
    } catch (error) {
      storage.removeItem(key);
    }
  }

  return fallback;
}

function getAuthIdentity() {
  const tokenPayload = parseJwt(getToken() || "") || {};
  const storedUser = readJSON("stableUser", {});

  return {
    id:
      tokenPayload.id ||
      tokenPayload.user_id ||
      tokenPayload.sub ||
      storedUser.id ||
      storedUser.ID ||
      storedUser.user_id ||
      storedUser.UserID,
    role: tokenPayload.role || tokenPayload.Role || storedUser.role || storedUser.Role,
  };
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Good Morning";
  if (hour < 15) return "Good Afternoon";
  if (hour < 19) return "Good Evening";
  return "Good Night";
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function getInitials(name = "Client") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function resolveImageURL(path) {
  if (!path) return "../../Img/defaultavatar.png";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  if (path.startsWith("/Img/")) return `../..${path}`;
  return path;
}

function getTrainerDisplayName(user = {}, trainer = {}) {
  return (
    trainer.name ||
    trainer.Name ||
    trainer.username ||
    trainer.Username ||
    trainer.trainer_name ||
    trainer.TrainerName ||
    user.name ||
    user.Name ||
    user.username ||
    user.Username ||
    "Trainer"
  );
}

function unwrapTrainerPayload(payload = {}) {
  const data = payload.data || payload.Data || payload;
  return (
    data.trainer ||
    data.Trainer ||
    data.profile ||
    data.Profile ||
    data.trainer_profile ||
    data.TrainerProfile ||
    data
  );
}

function renderUserGreeting(user, trainer = {}) {
  const name = getTrainerDisplayName(user, trainer);
  setText("greetingLabel", getGreeting());
  setText("welcomeName", `Welcome, ${name}`);
  setText("userGreeting", name);
}

function renderTrainerProfile(trainer) {
  const profile = {
    specialization:
      trainer.specialty ||
      trainer.Specialty ||
      trainer.specialization ||
      trainer.Specialization ||
      DEFAULT_TRAINER_PROFILE.specialization,
    experience:
      trainer.experience ||
      trainer.Experience ||
      DEFAULT_TRAINER_PROFILE.experience,
    bio: trainer.bio || trainer.Bio || DEFAULT_TRAINER_PROFILE.bio,
  };

  setText("trainerSpec", profile.specialization);
  setText("trainerExp", profile.experience);
  setText("trainerBio", profile.bio);
  setText("statSpec", profile.specialization);
  setText("statRating", trainer.rating || trainer.Rating || "0.0");

  const avatar = document.getElementById("trainerAvatar");
  if (avatar) {
    avatar.src = resolveImageURL(
      trainer.photo ||
        trainer.Photo ||
        trainer.profile_image ||
        trainer.ProfileImage,
    );
    avatar.onerror = () => {
      avatar.onerror = null;
      avatar.src = "../../Img/defaultavatar.png";
    };
  }
}

function renderStats(stats = {}) {
  setText("statRevenue", formatRupiah(stats.total_revenue));
  setText("statClients", Number(stats.total_clients || 0));
}

function renderRecentClients(clients = []) {
  const list = document.getElementById("clientList");
  if (!list) return;

  if (!clients.length) {
    list.innerHTML = `<p class="empty-text">Belum ada klien yang membayar sesi.</p>`;
    return;
  }

  list.innerHTML = clients
    .map(
      (client) => `
        <div class="client-item">
          <div class="client-avatar">${getInitials(client.name)}</div>
          <div class="client-main">
            <div class="client-name">${client.name}</div>
            <div class="client-status">
              ${client.total_sessions} sesi - ${formatRupiah(client.total_paid)}
            </div>
          </div>
          <div class="client-status">${formatDate(client.last_session_at)}</div>
        </div>
      `,
    )
    .join("");
}

function bindProfileNavigation() {
  const editProfileButton = document.getElementById("editProfileBtn");
  const editModal = document.getElementById("editModal");

  editModal?.remove();

  if (!editProfileButton) return;

  editProfileButton.setAttribute("type", "button");
  editProfileButton.addEventListener("click", () => {
    window.location.href = "trainer-profile.html";
  });
}

async function fetchTrainerProfile(user, token) {
  if (!user?.id || !token) return null;

  try {
    const response = await fetch(`${API_BASE}/trainer-chat/dashboard/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        result.message || result.error || "failed to load trainer profile",
      );
    }

    return unwrapTrainerPayload(result);
  } catch (error) {
    console.error("trainer profile error:", error);
    return null;
  }
}

async function fetchCurrentUser(user, token) {
  if (!user?.id || !token) return user;

  try {
    const response = await fetch(`${API_BASE}/users/${user.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || "failed to load user");
    }

    const data = result.data || result;
    const latestUser = {
      id: data.id || data.ID || user.id,
      name:
        data.name ||
        data.Name ||
        data.username ||
        data.Username ||
        user.name ||
        "Trainer",
      email: data.email || data.Email || user.email || "",
      role: data.role || data.Role || user.role || "TRAINER",
    };

    return latestUser;
  } catch (error) {
    console.error("trainer dashboard user error:", error);
    return user;
  }
}

function redirectIfNotTrainer(user) {
  const role = String(user?.role || user?.Role || "").toLowerCase();
  if (role && role !== "trainer") {
    window.location.href = "../dashboard.html";
    return true;
  }

  return false;
}

async function loadTrainerDashboard() {
  let user = getAuthIdentity();
  const token = getToken();

  if (!token) {
    window.location.href = "../../index.html#login";
    return;
  }

  if (!user.id) {
    setText("greetingLabel", "Login error");
    setText("welcomeName", "User trainer tidak terbaca");
    renderStats({});
    renderRecentClients([]);
    return;
  }

  user = await fetchCurrentUser(user, token);

  if (redirectIfNotTrainer(user)) {
    return;
  }

  renderUserGreeting(user);

  // Ambil profile trainer
  const trainerProfile = await fetchTrainerProfile(user, token);

  if (trainerProfile) {
    renderUserGreeting(user, trainerProfile);
    renderTrainerProfile(trainerProfile);
  } else {
    renderTrainerProfile({});
  }

  // Ambil data dashboard
  try {
    const response = await fetch(`${API_BASE}/trainer-chat/dashboard/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result.message || result.error || "failed to load trainer dashboard"
      );
    }

    const data = result.data || result;

    renderStats(data.stats || {});
    renderRecentClients(data.recent_clients || []);
  } catch (error) {
    console.error("trainer dashboard error:", error);

    renderStats({});
    renderRecentClients([]);
  }
}

bindProfileNavigation();
loadTrainerDashboard();

const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch (error) {
    return "";
  }
})();

const DEFAULT_AVATAR_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="120" fill="#0b1822"/>
  <circle cx="120" cy="94" r="42" fill="#253745"/>
  <path d="M48 210c11-45 40-70 72-70s61 25 72 70" fill="#253745"/>
  <text x="120" y="224" text-anchor="middle" fill="#9ba8ab" font-family="Arial, sans-serif" font-size="18" font-weight="700">STABLE</text>
</svg>
`)}`;

const profileState = {
  user: null,
  currentField: null,
};

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
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

function writeSessionUser(user) {
  const storage = localStorage.getItem("token") ? localStorage : sessionStorage;
  storage.setItem("stableUser", JSON.stringify(user));
}

function writeProfileCache(user) {
  localStorage.setItem("stableProfileCache", JSON.stringify(user));
}

function parseJwt(token) {
  try {
    const base64 = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), "=");
    return JSON.parse(atob(padded));
  } catch (error) {
    return null;
  }
}

function pick(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "");
}

function getCurrentUserID() {
  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const storedUser = readJSON("stableUser");

  return pick(
    payload?.id,
    payload?.ID,
    payload?.user_id,
    payload?.sub,
    storedUser?.id,
    storedUser?.ID,
    storedUser?.user_id,
  );
}

function getHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function redirectToLogin() {
  window.location.href = "../index.html#login";
}

function genderToLabel(value) {
  if (value === true || value === 1 || value === "true" || value === "Male" || value === "male") {
    return "Male";
  }
  if (value === false || value === 0 || value === "false" || value === "Female" || value === "female") {
    return "Female";
  }
  return "";
}

function genderToPayload(value) {
  if (value === "Male") return true;
  if (value === "Female") return false;
  return null;
}

function refreshIcons() {
  if (window.feather) {
    window.feather.replace();
  }
}

function getStreakValue(source) {
  const data = source?.data || source || {};
  const streak =
    data.streak ||
    data.Streak ||
    data.user_streak ||
    data.userStreak ||
    data.UserStreak ||
    {};

  const value = pick(
    streak.current,
    streak.Current,
    streak.current_streak,
    streak.currentStreak,
    streak.CurrentStreak,
    data.current,
    data.Current,
    data.current_streak,
    data.currentStreak,
    data.CurrentStreak,
  );

  return value !== undefined && value !== null && value !== ""
    ? Number(value)
    : null;
}

function resolveImageURL(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("../") ||
    trimmed.startsWith("./")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("/uploads") && API_ORIGIN) {
    return `${API_ORIGIN}${trimmed}`;
  }

  return trimmed;
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function canChangeUsername(user = profileState.user) {
  if (!user?.canChangeUsernameAt) return true;
  return Date.now() >= new Date(user.canChangeUsernameAt).getTime();
}

function normalizeUser(raw = {}) {
  const data = raw.data || raw;
  const profile = data.profile || data.Profile || data.profile_user || data.ProfileUser || {};
  const streak = data.streak || data.UserStreak || data.userStreak || {};

  const workoutDays = pick(
    profile.workout_days,
    profile.workoutDays,
    profile.WorkoutDays,
    data.workout_days,
    data.workoutDays,
  );

  return {
    id: pick(data.id, data.ID, data.user_id),
    username: pick(data.username, data.Username, data.name, data.Name, "Guest"),
    email: pick(data.email, data.Email, ""),
    role: pick(data.role, data.Role, "USER"),
    usernameChangedAt: pick(
      data.username_changed_at,
      data.usernameChangedAt,
      data.UsernameChangedAt,
    ),
    canChangeUsernameAt: pick(
      data.can_change_username_at,
      data.canChangeUsernameAt,
      data.CanChangeUsernameAt,
    ),
    profileImage: pick(
      profile.profile_image,
      profile.profileImage,
      profile.ProfileImage,
      data.profile_image,
      data.profileImage,
      data.avatar,
      "",
    ),
    gender: genderToLabel(
      pick(
        profile.gender,
        profile.Gender,
        data.gender,
        data.Gender,
        data.jenis_kelamin,
        data.jenisKelamin,
        data.JenisKelamin,
      ),
    ),
    weight: pick(profile.weight, profile.Weight, data.weight),
    height: pick(profile.height, profile.Height, data.height),
    fitnessLevel: pick(
      profile.fitness_level,
      profile.fitnessLevel,
      profile.FitnessLevel,
      data.fitness_level,
      data.fitnessLevel,
    ),
    mainGoal: pick(
      profile.main_goal,
      profile.mainGoal,
      profile.MainGoal,
      data.main_goal,
      data.mainGoal,
    ),
    workoutDays,
    currentStreak: getStreakValue({ ...data, streak }) ?? 0,
  };
}

function getRank(streak) {
  if (streak >= 90) {
    return { label: "Platinum", className: "rank-platinum" };
  }
  if (streak >= 30) {
    return { label: "Gold", className: "rank-gold" };
  }
  if (streak >= 7) {
    return { label: "Silver", className: "rank-silver" };
  }
  return { label: "Newbie", className: "rank-newbie" };
}

function setText(id, value, fallback = "-") {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent =
    value !== null && value !== undefined && value !== "" ? value : fallback;
}

function setDetail(id, value, suffix = "") {
  const element = document.getElementById(id);
  if (!element) return;

  if (value !== null && value !== undefined && value !== "") {
    element.textContent = `${value}${suffix}`;
    element.classList.remove("empty");
  } else {
    element.textContent = "Tap to fill";
    element.classList.add("empty");
  }
}

function setStatus(message, type = "success") {
  const element = document.getElementById("profileStatus");
  if (!element) return;

  element.textContent = message;
  element.classList.toggle("error", type === "error");

  if (message) {
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => {
      element.textContent = "";
      element.classList.remove("error");
    }, 2600);
  }
}

function renderProfile(rawUser) {
  const user = normalizeUser(rawUser);
  profileState.user = user;

  setText("profileName", user.username);
  setText("profileEmail", user.email);

  const image = document.getElementById("profileImage");
  if (image) {
    const imageURL = resolveImageURL(user.profileImage) || DEFAULT_AVATAR_URL;
    image.dataset.previewSrc = imageURL;
    image.onerror = () => {
      image.onerror = null;
      image.src = DEFAULT_AVATAR_URL;
      image.dataset.previewSrc = DEFAULT_AVATAR_URL;
    };
    image.src = imageURL;
  }

  const streak = Number(user.currentStreak || 0);
  const rank = getRank(streak);

  setText("streakValue", streak);
  setText("rankValue", rank.label);
  setText("workoutDaysStat", user.workoutDays || "-");

  const rankBadge = document.getElementById("rankBadge");
  if (rankBadge) {
    rankBadge.className = `rank-badge ${rank.className}`;
    rankBadge.textContent = rank.label.toUpperCase();
  }

  setDetail("genderValue", user.gender);
  setDetail("weightValue", user.weight, user.weight ? " kg" : "");
  setDetail("heightValue", user.height, user.height ? " cm" : "");
  setDetail("fitnessValue", user.fitnessLevel);
  setDetail("goalValue", user.mainGoal);
  setDetail(
    "workoutDaysValue",
    user.workoutDays,
    user.workoutDays ? ` day${Number(user.workoutDays) > 1 ? "s" : ""} / week` : "",
  );

  refreshIcons();
}

function mergeProfilePatch(patch) {
  profileState.user = {
    ...profileState.user,
    ...patch,
  };

  writeSessionUser({
    id: profileState.user.id,
    name: profileState.user.username,
    username: profileState.user.username,
    email: profileState.user.email,
    role: profileState.user.role,
  });
  writeProfileCache(profileState.user);

  renderProfile(profileState.user);
}

async function fetchProfile() {
  const userID = getCurrentUserID();
  const storedUser = readJSON("stableProfileCache") || readJSON("stableUser");

  if (!userID && !storedUser) {
    redirectToLogin();
    return;
  }

  if (storedUser) {
    renderProfile(storedUser);
  }

  if (!userID) return;

  try {
    let response = await fetch(`${API_BASE}/profile/${userID}`, {
      headers: getHeaders(),
    });

    if (response.status === 404) {
      response = await fetch(`${API_BASE}/users/${userID}`, {
        headers: getHeaders(),
      });
    }

    if (!response.ok) {
      throw new Error("failed to load profile");
    }

    const result = await response.json();
    const user = normalizeUser(result.data || result);
    writeSessionUser({
      id: user.id,
      name: user.username,
      username: user.username,
      email: user.email,
      role: user.role,
    });
    writeProfileCache(user);
    renderProfile(user);
  } catch (error) {
    console.warn("fetchProfile fallback to localStorage:", error);
    if (!storedUser) redirectToLogin();
  }

  loadStreak();
}

async function loadStreak() {
  const userID = getCurrentUserID();
  if (!userID) return;

  try {
    const response = await fetch(
      `${API_BASE}/daily-challenge/today?user_id=${encodeURIComponent(userID)}`,
      { headers: getHeaders() },
    );
    if (!response.ok) return;

    const result = await response.json();
    const currentStreak = getStreakValue(result);

    if (currentStreak !== null) {
      mergeProfilePatch({ currentStreak: Number(currentStreak) || 0 });
    }
  } catch (error) {
    console.warn("loadStreak skipped:", error);
  }
}

const fieldConfig = {
  name: {
    label: "Name",
    key: "username",
    render: (value, user) => {
      const blocked = !canChangeUsername(user);
      const cooldownText = user?.canChangeUsernameAt
        ? `Nama bisa diganti lagi pada ${formatDateTime(user.canChangeUsernameAt)}.`
        : "Nama hanya bisa diganti satu kali setiap 2 minggu.";

      return `
      <div class="modal-field">
        <label for="modalInput">Name</label>
        <input
          id="modalInput"
          type="text"
          maxlength="80"
          value="${escapeAttr(value)}"
          ${blocked ? "disabled" : ""}
        />
        <small class="modal-help ${blocked ? "blocked" : ""}">
          ${cooldownText}
        </small>
      </div>
    `;
    },
  },
  avatar: {
    label: "Profile Image URL",
    key: "profileImage",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Image URL</label>
        <input id="modalInput" type="url" placeholder="../Img/defaultavatar.png" value="${escapeAttr(value)}" />
      </div>
    `,
  },
  gender: {
    label: "Gender",
    key: "gender",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Gender</label>
        <select id="modalInput">
          <option value="">Select gender</option>
          <option value="Male" ${value === "Male" ? "selected" : ""}>Male</option>
          <option value="Female" ${value === "Female" ? "selected" : ""}>Female</option>
        </select>
      </div>
    `,
  },
  weight: {
    label: "Weight",
    key: "weight",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Weight (kg)</label>
        <input id="modalInput" type="number" min="30" max="300" value="${escapeAttr(value)}" />
      </div>
    `,
  },
  height: {
    label: "Height",
    key: "height",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Height (cm)</label>
        <input id="modalInput" type="number" min="100" max="250" value="${escapeAttr(value)}" />
      </div>
    `,
  },
  fitnessLevel: {
    label: "Fitness Level",
    key: "fitnessLevel",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Fitness Level</label>
        <select id="modalInput">
          <option value="">Select level</option>
          <option value="Beginner" ${value === "Beginner" ? "selected" : ""}>Beginner</option>
          <option value="Intermediate" ${value === "Intermediate" ? "selected" : ""}>Intermediate</option>
          <option value="Advanced" ${value === "Advanced" ? "selected" : ""}>Advanced</option>
        </select>
      </div>
    `,
  },
  mainGoal: {
    label: "Main Goal",
    key: "mainGoal",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Main Goal</label>
        <select id="modalInput">
          <option value="">Select goal</option>
          <option value="Build Muscle" ${value === "Build Muscle" ? "selected" : ""}>Build Muscle</option>
          <option value="Lose Weight" ${value === "Lose Weight" ? "selected" : ""}>Lose Weight</option>
          <option value="Stay Fit" ${value === "Stay Fit" ? "selected" : ""}>Stay Fit</option>
          <option value="Improve Endurance" ${value === "Improve Endurance" ? "selected" : ""}>Improve Endurance</option>
        </select>
      </div>
    `,
  },
  workoutDays: {
    label: "Workout Days",
    key: "workoutDays",
    render: (value) => `
      <div class="modal-field">
        <label for="modalInput">Days / Week</label>
        <select id="modalInput">
          <option value="">Select days</option>
          ${[1, 2, 3, 4, 5, 6, 7]
            .map(
              (day) =>
                `<option value="${day}" ${Number(value) === day ? "selected" : ""}>${day} day${day > 1 ? "s" : ""} / week</option>`,
            )
            .join("")}
        </select>
      </div>
    `,
  },
};

function escapeAttr(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function openModal(field) {
  const config = fieldConfig[field];
  const modal = document.getElementById("editModal");
  const title = document.getElementById("modalTitle");
  const content = document.getElementById("modalContent");
  if (!config || !modal || !title || !content) return;

  profileState.currentField = field;
  title.textContent = `Edit ${config.label}`;
  content.innerHTML = config.render(profileState.user?.[config.key] || "", profileState.user);
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  refreshIcons();
  window.setTimeout(() => document.getElementById("modalInput")?.focus(), 80);
}

function closeModal() {
  const modal = document.getElementById("editModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  profileState.currentField = null;
}

function buildPayload(field, value) {
  const config = fieldConfig[field];
  if (!config) return {};

  const payload = {};

  if (field === "name") {
    payload.username = value.trim();
    return payload;
  }

  if (field === "avatar") {
    payload.profile_image = value.trim();
    return payload;
  }

  if (field === "gender") {
    payload.gender = genderToPayload(value);
    return payload;
  }

  if (field === "weight" || field === "height" || field === "workoutDays") {
    payload[toSnakeCase(config.key)] = value === "" ? null : Number(value);
    return payload;
  }

  payload[toSnakeCase(config.key)] = value;
  return payload;
}

function toSnakeCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function payloadToLocalPatch(field, value) {
  if (field === "name") return { username: value.trim() };
  if (field === "avatar") return { profileImage: value.trim() };
  if (field === "gender") return { gender: value };
  if (field === "weight") return { weight: value ? Number(value) : "" };
  if (field === "height") return { height: value ? Number(value) : "" };
  if (field === "workoutDays") return { workoutDays: value ? Number(value) : "" };

  const config = fieldConfig[field];
  return config ? { [config.key]: value } : {};
}

async function saveCurrentField() {
  const input = document.getElementById("modalInput");
  const saveButton = document.getElementById("saveModalBtn");
  const field = profileState.currentField;
  if (!input || !field) return;

  const value = input.value;
  const userID = getCurrentUserID();
  const localPatch = payloadToLocalPatch(field, value);

  if (field === "name" && !canChangeUsername()) {
    setStatus(
      `Nama bisa diganti lagi pada ${formatDateTime(profileState.user.canChangeUsernameAt)}.`,
      "error",
    );
    return;
  }

  if (!userID) {
    mergeProfilePatch(localPatch);
    closeModal();
    setStatus("Profile tersimpan lokal.", "success");
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  try {
    const response = await fetch(`${API_BASE}/profile/${userID}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(buildPayload(field, value)),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        result.message ||
        result.error ||
        `failed to update profile (${response.status})`;
      throw new Error(message);
    }

    const nextUser = result.data || result;
    const normalizedUser = normalizeUser(nextUser);
    writeSessionUser({
      id: normalizedUser.id,
      name: normalizedUser.username,
      username: normalizedUser.username,
      email: normalizedUser.email,
      role: normalizedUser.role,
    });
    writeProfileCache(normalizedUser);
    renderProfile(normalizedUser);
    closeModal();
    setStatus("Profile berhasil disimpan.", "success");
  } catch (error) {
    console.error("save profile failed:", error);
    mergeProfilePatch(localPatch);
    closeModal();
    setStatus(`Database gagal: ${error.message}`, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save";
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadAvatarFile(file) {
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setStatus("Avatar harus JPG, PNG, atau WEBP.", "error");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setStatus("Ukuran avatar maksimal 2MB.", "error");
    return;
  }

  const userID = getCurrentUserID();
  if (!userID) {
    const dataURL = await readFileAsDataURL(file);
    mergeProfilePatch({ profileImage: dataURL });
    setStatus("Avatar tersimpan lokal.", "success");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);
  setStatus("Mengupload avatar...", "success");

  try {
    const uploadURL = `${API_BASE}/profile/${userID}/avatar`;
    console.log("Uploading avatar to:", uploadURL);

    const response = await fetch(uploadURL, {
      method: "POST",
      mode: "cors",
      headers: getAuthHeaders(),
      body: formData,
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || `upload failed (${response.status})`);
    }

    const nextUser = result.data || {
      ...profileState.user,
      profile_image: result.avatar_url,
    };
    const normalizedUser = normalizeUser(nextUser);
    if (!normalizedUser.profileImage && result.avatar_url) {
      normalizedUser.profileImage = result.avatar_url;
    }
    writeProfileCache(normalizedUser);
    renderProfile(normalizedUser);
    setStatus("Avatar berhasil diupload.", "success");
  } catch (error) {
    console.error("avatar upload failed:", error);

    const message =
      error instanceof TypeError && error.message === "Failed to fetch"
        ? `Tidak bisa konek ke API upload: ${API_BASE}`
        : `Upload database gagal: ${error.message}`;

    setStatus(message, "error");
  }
}

function openImageViewer() {
  const viewer = document.getElementById("imageViewer");
  const preview = document.getElementById("profileImagePreview");
  const image = document.getElementById("profileImage");
  if (!viewer || !preview || !image) return;

  preview.src = image.dataset.previewSrc || image.src || DEFAULT_AVATAR_URL;
  viewer.classList.add("active");
  viewer.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeImageViewer() {
  const viewer = document.getElementById("imageViewer");
  if (!viewer) return;

  viewer.classList.remove("active");
  viewer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function bindEvents() {
  document.getElementById("editNameBtn")?.addEventListener("click", () => {
    openModal("name");
  });

  document.getElementById("profileAvatar")?.addEventListener("click", (event) => {
    if (event.target.closest("#editAvatarBtn")) return;
    openImageViewer();
  });

  document.getElementById("profileAvatar")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openImageViewer();
  });

  document.getElementById("editAvatarBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
    document.getElementById("avatarInput")?.click();
  });

  document.getElementById("avatarInput")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    uploadAvatarFile(file);
    event.target.value = "";
  });

  document.getElementById("closeImageViewerBtn")?.addEventListener("click", () => {
    closeImageViewer();
  });

  document.getElementById("imageViewer")?.addEventListener("click", (event) => {
    if (event.target.id === "imageViewer") closeImageViewer();
  });

  document.querySelectorAll(".detail-card").forEach((card) => {
    card.addEventListener("click", () => {
      openModal(card.dataset.field);
    });
  });

  document.getElementById("closeModalBtn")?.addEventListener("click", closeModal);
  document.getElementById("cancelModalBtn")?.addEventListener("click", closeModal);
  document.getElementById("saveModalBtn")?.addEventListener("click", saveCurrentField);

  document.getElementById("editModal")?.addEventListener("click", (event) => {
    if (event.target.id === "editModal") closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeImageViewer();
    }
    if (event.key === "Enter" && profileState.currentField) saveCurrentField();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("stableUser");
    localStorage.removeItem("stableProfileCache");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("stableUser");
    window.location.href = "../index.html";
  });
}

bindEvents();
fetchProfile();
refreshIcons();

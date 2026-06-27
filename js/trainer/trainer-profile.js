const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";
const API_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin;
  } catch (error) {
    return "";
  }
})();

const state = {
  token: "",
  userId: null,
  userProfile: null,
  trainerProfile: null,
};

const elements = {
  avatar: document.getElementById("trainerAvatar"),
  trainerName: document.getElementById("trainerName"),
  trainerEmail: document.getElementById("trainerEmail"),
  onlineStatus: document.getElementById("onlineStatus"),
  ratingValue: document.getElementById("ratingValue"),
  clientsValue: document.getElementById("clientsValue"),
  priceValue: document.getElementById("priceValue"),
  form: document.getElementById("trainerProfileForm"),
  formMessage: document.getElementById("formMessage"),
  saveButton: document.querySelector(".btn-save"),
  nameInput: document.getElementById("nameInput"),
  specialtyInput: document.getElementById("specialtyInput"),
  experienceInput: document.getElementById("experienceInput"),
  priceInput: document.getElementById("priceInput"),
  categoriesInput: document.getElementById("categoriesInput"),
  tagsInput: document.getElementById("tagsInput"),
  bioInput: document.getElementById("bioInput"),
  onlineInput: document.getElementById("onlineInput"),
  editAvatarBtn: document.getElementById("editAvatarBtn"),
  avatarInput: document.getElementById("avatarInput"),
};

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function parseJwt(token) {
  try {
    const payload = token
      .split(".")[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    return JSON.parse(atob(payload));
  } catch (error) {
    return null;
  }
}

function readJSON(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

function getIdentity() {
  const token = getToken();
  const payload = parseJwt(token);
  const storedUser = readJSON("stableUser", {});
  const userId =
    payload?.id ||
    payload?.user_id ||
    payload?.sub ||
    payload?.ID ||
    storedUser?.id ||
    storedUser?.ID;

  return {
    token,
    userId: userId ? Number(userId) : null,
  };
}

function getRole(user) {
  return String(user?.role || user?.Role || "").toUpperCase();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatRupiah(value) {
  const number = Number(value || 0);
  return `Rp ${number.toLocaleString("id-ID")}`;
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

  if (trimmed.startsWith("/") && API_ORIGIN) {
    return `${API_ORIGIN}${trimmed}`;
  }

  return trimmed;
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch (error) {
    return { raw: text };
  }
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.token}`,
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) return null;

  const data = await readResponse(response);

  if (!response.ok) {
    const rawMessage =
      typeof data?.raw === "string" && data.raw.trim()
        ? data.raw.slice(0, 160)
        : "request failed";
    const error = new Error(data?.message || data?.error || rawMessage);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function normalizeUserProfile(rawProfile) {
  const profile = rawProfile?.data || rawProfile || {};
  return {
    id: profile.id || profile.ID || state.userId,
    username:
      profile.username || profile.Username || profile.name || profile.Name || "Trainer",
    email: profile.email || profile.Email || "-",
    role: getRole(profile),
    profileImage:
      profile.profile_image ||
      profile.ProfileImage ||
      profile.avatar_url ||
      profile.AvatarURL ||
      "",
    currentStreak: profile.current_streak || profile.CurrentStreak || 0,
  };
}

function normalizeTrainerProfile(rawProfile) {
  const trainer = rawProfile?.data || rawProfile || {};
  const user = state.userProfile || {};
  const name =
    trainer.name ||
    trainer.Name ||
    trainer.username ||
    trainer.Username ||
    user.username ||
    "Trainer";
  const specialty =
    trainer.specialty ||
    trainer.Specialty ||
    trainer.specialization ||
    trainer.Specialization ||
    "";

  return {
    id: trainer.id || trainer.ID || null,
    userId: trainer.user_id || trainer.UserID || state.userId,
    name,
    email: trainer.email || trainer.Email || user.email || "-",
    specialty,
    experience: trainer.experience || trainer.Experience || "",
    categories: trainer.categories || trainer.Categories || "",
    tags: trainer.tags || trainer.Tags || "",
    bio: trainer.bio || trainer.Bio || "",
    photo:
      trainer.photo ||
      trainer.Photo ||
      trainer.profile_image ||
      trainer.ProfileImage ||
      user.profileImage ||
      "../../Img/defaultavatar.png",
    price: Number(trainer.price || trainer.Price || 29000),
    rating: trainer.rating || trainer.Rating || "0.0",
    totalClients:
      trainer.total_clients ||
      trainer.TotalClients ||
      trainer.client_count ||
      trainer.ClientCount ||
      0,
    isOnline: Boolean(
      trainer.is_online ?? trainer.IsOnline ?? trainer.online ?? false,
    ),
  };
}

function setMessage(message, type = "") {
  if (!elements.formMessage) return;
  elements.formMessage.textContent = message;
  elements.formMessage.classList.remove("is-error", "is-success");
  if (type) elements.formMessage.classList.add(`is-${type}`);
}

async function fetchUserProfile() {
  const data = await apiFetch(`/profile/${state.userId}`);
  state.userProfile = normalizeUserProfile(data);

  if (getRole(state.userProfile) !== "TRAINER") {
    window.location.href = "../dashboard.html";
    return null;
  }

  return state.userProfile;
}

async function fetchTrainerProfile() {
  const endpoints = [
    "/trainers/me",
    `/trainers/detail/${state.userId}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const data = await apiFetch(endpoint);
      state.trainerProfile = normalizeTrainerProfile(data);
      return state.trainerProfile;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }

  state.trainerProfile = normalizeTrainerProfile({
    name: state.userProfile?.username,
    email: state.userProfile?.email,
    photo: state.userProfile?.profileImage,
  });

  return state.trainerProfile;
}

function renderProfile(profile) {
  if (elements.avatar) {
    elements.avatar.src =
      resolveImageURL(profile.photo) || "../../Img/defaultavatar.png";
    elements.avatar.onerror = () => {
      elements.avatar.src = "../../Img/defaultavatar.png";
    };
  }

  if (elements.trainerName) elements.trainerName.textContent = profile.name;
  if (elements.trainerEmail) elements.trainerEmail.textContent = profile.email;
  if (elements.ratingValue) elements.ratingValue.textContent = String(profile.rating);
  if (elements.clientsValue)
    elements.clientsValue.textContent = String(profile.totalClients);
  if (elements.priceValue)
    elements.priceValue.textContent = formatRupiah(profile.price);

  if (elements.onlineStatus) {
    elements.onlineStatus.textContent = profile.isOnline ? "Online" : "Offline";
    elements.onlineStatus.classList.toggle("is-online", profile.isOnline);
  }

  if (elements.nameInput) elements.nameInput.value = profile.name || "";
  if (elements.specialtyInput)
    elements.specialtyInput.value = profile.specialty || "";
  if (elements.experienceInput)
    elements.experienceInput.value = profile.experience || "";
  if (elements.priceInput) elements.priceInput.value = profile.price || 29000;
  if (elements.categoriesInput)
    elements.categoriesInput.value = profile.categories || "";
  if (elements.tagsInput) elements.tagsInput.value = profile.tags || "";
  if (elements.bioInput) elements.bioInput.value = profile.bio || "";
  if (elements.onlineInput) elements.onlineInput.checked = profile.isOnline;

  if (window.feather) feather.replace();
}

function collectTrainerPayload() {
  const name =
    elements.nameInput?.value.trim() || state.userProfile?.username || "Trainer";
  const specialty = elements.specialtyInput?.value.trim() || "";

  return {
    name,
    specialty,
    specialization: specialty,
    experience: elements.experienceInput?.value.trim() || "",
    categories: elements.categoriesInput?.value.trim() || "",
    tags: elements.tagsInput?.value.trim() || "",
    price: Number(elements.priceInput?.value || 0),
    bio: elements.bioInput?.value.trim() || "",
    is_online: Boolean(elements.onlineInput?.checked),
    is_active: true,
  };
}

async function saveTrainerProfile(event) {
  event.preventDefault();

  const payload = collectTrainerPayload();
  if (!payload.name || !payload.specialty) {
    setMessage("Nama trainer dan spesialisasi wajib diisi.", "error");
    return;
  }

  elements.saveButton.disabled = true;
  setMessage("Menyimpan data trainer...");

  const endpoints = state.trainerProfile?.id
    ? [{ method: "PUT", path: "/trainers/profile" }]
    : [
        { method: "POST", path: "/trainers/profile" },
        { method: "PUT", path: "/trainers/profile" },
      ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const data = await apiFetch(endpoint.path, {
        method: endpoint.method,
        body: JSON.stringify(payload),
      });

      state.trainerProfile = normalizeTrainerProfile({
        ...state.trainerProfile,
        ...payload,
        ...(data?.data || data || {}),
      });
      renderProfile(state.trainerProfile);
      setMessage("Data trainer berhasil disimpan.", "success");
      elements.saveButton.disabled = false;
      return;
    } catch (error) {
      lastError = error;
      if (error.status !== 404 && error.status !== 405) break;
    }
  }

  elements.saveButton.disabled = false;
  console.error("save trainer profile error:", lastError);
  setMessage(
    "Backend trainer profile belum tersedia. Route /profile hanya bisa menyimpan data user dasar dan avatar.",
    "error",
  );
}

async function uploadTrainerAvatar(file) {
  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    setMessage("Avatar harus JPG, PNG, atau WEBP.", "error");
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setMessage("Ukuran avatar maksimal 2MB.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("avatar", file);
  setMessage("Mengupload foto profil...");

  try {
    const response = await fetch(`${API_BASE}/profile/${state.userId}/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
      body: formData,
    });
    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(data?.message || data?.error || "Gagal upload avatar.");
    }

    const result = data?.data || data || {};
    const avatarURL =
      data?.avatar_url ||
      result.profile_image ||
      result.ProfileImage ||
      result.avatar_url ||
      "";

    if (avatarURL) {
      state.userProfile.profileImage = avatarURL;
      state.trainerProfile.photo = avatarURL;
      elements.avatar.src = resolveImageURL(avatarURL);
    }

    setMessage("Foto profil berhasil diupload.", "success");
  } catch (error) {
    console.error("upload trainer avatar error:", error);
    setMessage(error.message || "Gagal upload foto profil.", "error");
  }
}

function bindEvents() {
  elements.form?.addEventListener("submit", saveTrainerProfile);
  elements.onlineInput?.addEventListener("change", () => {
    const isOnline = Boolean(elements.onlineInput.checked);
    if (elements.onlineStatus) {
      elements.onlineStatus.textContent = isOnline ? "Online" : "Offline";
      elements.onlineStatus.classList.toggle("is-online", isOnline);
    }
    setMessage("Klik Save Profile supaya status online tersimpan.", "");
  });
  elements.editAvatarBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    elements.avatarInput?.click();
  });
  elements.avatarInput?.addEventListener("change", (event) => {
    uploadTrainerAvatar(event.target.files?.[0]);
    event.target.value = "";
  });
}

async function initializeTrainerProfile() {
  const identity = getIdentity();
  state.token = identity.token;
  state.userId = identity.userId;

  if (!state.token || !state.userId) {
    window.location.href = "../../index.html#login";
    return;
  }

  try {
    await fetchUserProfile();
    await fetchTrainerProfile();
    renderProfile(state.trainerProfile);
    setMessage(
      "Avatar dan data user memakai /profile. Data trainer membutuhkan backend /trainers agar bisa tersimpan.",
    );
  } catch (error) {
    console.error("load trainer profile error:", error);
    setMessage(error.message || "Gagal memuat profile trainer.", "error");
    if (elements.trainerName) elements.trainerName.textContent = "Gagal memuat data";
  }
}

bindEvents();
initializeTrainerProfile();

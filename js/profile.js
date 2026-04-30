const API_BASE = "http://localhost:8080/api/v1";

// ── RANK LOGIC ──
function getRank(streak) {
  if (streak >= 90)
    return { label: "PLATINUM", cls: "rank-platinum", icon: "💎" };
  if (streak >= 30) return { label: "GOLD", cls: "rank-gold", icon: "🥇" };
  if (streak >= 7) return { label: "SILVER", cls: "rank-silver", icon: "🥈" };
  return { label: "Newbie", cls: "rank-newbie", icon: "🥉" };
}

// ── GET TOKEN & USER ID ──
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

// ── FORMAT HELPERS ──
function val(v, fallback = "—") {
  return v !== null && v !== undefined && v !== "" ? v : fallback;
}

function genderLabel(v) {
  if (v === true || v === 1) return "Male";
  if (v === false || v === 0) return "Female";
  return null;
}

// ── RENDER PROFILE ──
function renderProfile(user) {
  // Navbar greeting
  const greeting = document.getElementById("userGreeting");
  if (greeting) greeting.textContent = val(user.username, "Guest");

  // Avatar
  const img = document.getElementById("profileImage");
  if (img && user.profileImage) img.src = user.profileImage;

  // Name
  const nameEl = document.getElementById("profileName");
  if (nameEl) nameEl.textContent = val(user.username);

  // Email
  const emailEl = document.getElementById("profileEmail");
  if (emailEl) emailEl.textContent = val(user.email);

  // Streak
  const streak =
    user.UserStreak?.currentStreak ?? user.userStreak?.currentStreak ?? 0;
  const streakEl = document.getElementById("streakValue");
  if (streakEl) streakEl.textContent = streak;

  // Rank
  const rank = getRank(streak);
  const rankEl = document.getElementById("rankValue");
  if (rankEl) rankEl.textContent = rank.label;

  const rankBadge = document.getElementById("rankBadge");
  if (rankBadge) {
    rankBadge.className = `rank-badge ${rank.cls}`;
    rankBadge.textContent = `${rank.icon} ${rank.label}`;
  }

  // Profile detail fields
  setDetail("genderValue", genderLabel(user.jenisKelamin));
  setDetail("weightValue", user.Profile?.weight ?? user.profile?.weight);
  setDetail("heightValue", user.Profile?.height ?? user.profile?.height);
  setDetail(
    "fitnessValue",
    user.Profile?.fitnessLevel ?? user.profile?.fitnessLevel,
  );
  setDetail("goalValue", user.Profile?.mainGoal ?? user.profile?.mainGoal);
  setDetail(
    "workoutDaysValue",
    user.Profile?.workoutDays ?? user.profile?.workoutDays,
  );
}

function setDetail(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value !== null && value !== undefined && value !== "") {
    el.textContent = value;
    el.classList.remove("empty");
  } else {
    el.textContent = "Tap to fill";
    el.classList.add("empty");
  }
}

// ── FETCH USER ──
async function fetchUser() {
  const token = getToken();
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const payload = parseJwt(token);
  const userId = payload?.id || payload?.user_id || payload?.sub;
  if (!userId) {
    window.location.href = "../index.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error("Failed to fetch user");

    const data = await res.json();
    const user = data.data || data;
    renderProfile(user);
  } catch (err) {
    console.error("Fetch user error:", err);
  }
}

// ── EDIT MODAL ──
const modal = document.getElementById("editModal");
const modalTitle = document.getElementById("modalTitle");
const modalContent = document.getElementById("modalContent");
let currentField = null;

const fieldConfig = {
  gender: {
    label: "Gender",
    render: (current) => `
      <select id="modalInput">
        <option value="true"  ${current === "Male" ? "selected" : ""}>Male</option>
        <option value="false" ${current === "Female" ? "selected" : ""}>Female</option>
      </select>`,
  },
  weight: {
    label: "Weight (kg)",
    render: (current) =>
      `<input id="modalInput" type="number" min="30" max="300" placeholder="e.g. 70" value="${current !== "Tap to fill" ? current : ""}">`,
  },
  height: {
    label: "Height (cm)",
    render: (current) =>
      `<input id="modalInput" type="number" min="100" max="250" placeholder="e.g. 170" value="${current !== "Tap to fill" ? current : ""}">`,
  },
  fitnessLevel: {
    label: "Fitness Level",
    render: (current) => `
      <select id="modalInput">
        <option value="Beginner"     ${current === "Beginner" ? "selected" : ""}>Beginner</option>
        <option value="Intermediate" ${current === "Intermediate" ? "selected" : ""}>Intermediate</option>
        <option value="Advanced"     ${current === "Advanced" ? "selected" : ""}>Advanced</option>
      </select>`,
  },
  mainGoal: {
    label: "Main Goal",
    render: (current) => `
      <select id="modalInput">
        <option value="Build Muscle"  ${current === "Build Muscle" ? "selected" : ""}>Build Muscle</option>
        <option value="Lose Weight"   ${current === "Lose Weight" ? "selected" : ""}>Lose Weight</option>
        <option value="Stay Fit"      ${current === "Stay Fit" ? "selected" : ""}>Stay Fit</option>
        <option value="Improve Endurance" ${current === "Improve Endurance" ? "selected" : ""}>Improve Endurance</option>
      </select>`,
  },
  workoutDays: {
    label: "Workout Days / Week",
    render: (current) => `
      <select id="modalInput">
        ${[1, 2, 3, 4, 5, 6, 7].map((d) => `<option value="${d}" ${current?.includes(d) ? "selected" : ""}>${d} Day${d > 1 ? "s" : ""} / Week</option>`).join("")}
      </select>`,
  },
};

function openModal(field, currentValue) {
  const config = fieldConfig[field];
  if (!config) return;
  currentField = field;
  modalTitle.textContent = `Edit ${config.label}`;
  modalContent.innerHTML = config.render(currentValue);
  modal.classList.add("active");
}

function closeModal() {
  modal.classList.remove("active");
  currentField = null;
}

document.getElementById("closeModalBtn")?.addEventListener("click", closeModal);
document
  .getElementById("cancelModalBtn")
  ?.addEventListener("click", closeModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

// ── SAVE ──
document.getElementById("saveModalBtn")?.addEventListener("click", () => {
  const input = document.getElementById("modalInput");
  if (!input || !currentField) return;

  const value = input.value;

  // Update UI immediately
  const valueMap = {
    gender: () => {
      setDetail("genderValue", value === "true" ? "Male" : "Female");
    },
    weight: () => setDetail("weightValue", value + " kg"),
    height: () => setDetail("heightValue", value + " cm"),
    fitnessLevel: () => setDetail("fitnessValue", value),
    mainGoal: () => setDetail("goalValue", value),
    workoutDays: () => setDetail("workoutDaysValue", value + " Days / Week"),
  };

  valueMap[currentField]?.();
  closeModal();

  // TODO: kirim ke API update profile jika endpoint tersedia
  // await fetch(`${API_BASE}/users/profile`, { method: "PUT", ... })
});

// ── DETAIL CARD CLICK ──
document.querySelectorAll(".detail-card").forEach((card) => {
  card.addEventListener("click", () => {
    const field = card.dataset.field;
    const currentValue = card.querySelector(".detail-value")?.textContent;
    openModal(field, currentValue);
  });
});

// ── LOGOUT ──
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  window.location.href = "../index.html";
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

async function fetchUser() {
  const token = getToken();
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const payload = parseJwt(token);
  console.log("payload:", payload); // ← cek key ID

  const userId = payload?.id || payload?.user_id || payload?.sub || payload?.ID;
  console.log("userId:", userId); // ← cek apakah dapat ID

  if (!userId) {
    console.warn("userId tidak ditemukan");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    console.log("user data:", data);

    const user = data.data || data;
    console.log("user object:", user);
    renderProfile(user);
  } catch (err) {
    console.error("Fetch user error:", err);
  }
}

// ── INIT ──
fetchUser();

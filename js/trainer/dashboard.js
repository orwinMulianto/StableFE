const API_BASE = "http://localhost:8080/api/v1";

// ── TOKEN & JWT ──
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

// ── GREETING ──
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return "Good Morning ☀️";
  if (h >= 12 && h < 15) return "Good Afternoon 🌤️";
  if (h >= 15 && h < 19) return "Good Evening 🌅";
  return "Good Night 🌙";
}
document.getElementById("greetingLabel").textContent = getGreeting();

// ── FORMAT RUPIAH ──
function formatRupiah(amount) {
  if (!amount) return "—";
  return "Rp " + Number(amount).toLocaleString("id-ID");
}

// ── RENDER PROFILE ──
function renderProfile(profile) {
  const firstName = (profile.username || "Coach").split(" ")[0];

  document.getElementById("userGreeting").textContent  = profile.username || "Coach";
  document.getElementById("welcomeName").textContent   = `Welcome, ${firstName}`;
  document.getElementById("totalClients").textContent  = profile.totalClients ?? 0;
  document.getElementById("trainerRating").textContent = profile.rating?.toFixed(1) ?? "0.0";

  if (profile.profileImage) {
    document.getElementById("trainerAvatar").src = profile.profileImage;
  }

  // Profile detail items
  setText("trainerSpec",       profile.specialization  || "—");
  setText("trainerExp",        profile.experience      || "—");
  setText("trainerCert",       profile.certification   || "—");
  setText("trainerChatPrice",  formatRupiah(profile.chatPrice));
  setText("trainerVideoPrice", formatRupiah(profile.videoCallPrice));

  // Stats row
  setText("statChatPrice",  formatRupiah(profile.chatPrice));
  setText("statVideoPrice", formatRupiah(profile.videoCallPrice));
  setText("statSpec",       profile.specialization || "—");
  setText("statExp",        profile.experience     || "—");

  // Pre-fill modal inputs
  setVal("inputSpec",       profile.specialization  || "");
  setVal("inputExp",        profile.experience      || "");
  setVal("inputCert",       profile.certification   || "");
  setVal("inputChatPrice",  profile.chatPrice       || "");
  setVal("inputVideoPrice", profile.videoCallPrice  || "");
  setVal("inputBio",        profile.bio             || "");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

// ── FETCH TRAINER PROFILE ──
async function fetchTrainerProfile() {
  const token = getToken();
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const payload = parseJwt(token);
  const role = payload?.role || payload?.Role || "";

  // Redirect jika bukan trainer
  if (role !== "TRAINER") {
    window.location.href = "../page/dashboard.html";
    return;
  }

  const userId = payload?.id || payload?.user_id || payload?.sub;
  if (!userId) {
    window.location.href = "../index.html";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/trainers/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      // Profile belum dibuat, tampilkan empty state
      console.warn("Trainer profile belum ada");
      document.getElementById("userGreeting").textContent = "Coach";
      return;
    }

    const data = await res.json();
    const profile = data.data || data;
    renderProfile(profile);
  } catch (err) {
    console.error("fetchTrainerProfile error:", err);
  }
}

// ── EDIT MODAL ──
const modal         = document.getElementById("editModal");
const editProfileBtn = document.getElementById("editProfileBtn");
const closeModalBtn  = document.getElementById("closeModalBtn");
const cancelModalBtn = document.getElementById("cancelModalBtn");
const saveModalBtn   = document.getElementById("saveModalBtn");

editProfileBtn?.addEventListener("click", () => modal.classList.add("active"));
closeModalBtn?.addEventListener("click",  () => modal.classList.remove("active"));
cancelModalBtn?.addEventListener("click", () => modal.classList.remove("active"));
modal?.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("active"); });

// ── SAVE PROFILE ──
saveModalBtn?.addEventListener("click", async () => {
  const token = getToken();
  if (!token) return;

  const body = {
    specialization:  document.getElementById("inputSpec").value.trim(),
    experience:      document.getElementById("inputExp").value.trim(),
    certification:   document.getElementById("inputCert").value.trim(),
    chatPrice:       parseInt(document.getElementById("inputChatPrice").value) || 0,
    videoCallPrice:  parseInt(document.getElementById("inputVideoPrice").value) || 0,
    bio:             document.getElementById("inputBio").value.trim(),
  };

  saveModalBtn.disabled = true;
  saveModalBtn.textContent = "Saving...";

  try {
    // Coba PUT dulu (update), kalau gagal POST (create)
    let res = await fetch(`${API_BASE}/trainers/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (res.status === 404) {
      res = await fetch(`${API_BASE}/trainers/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Gagal menyimpan profile.");
      return;
    }

    modal.classList.remove("active");
    renderProfile(data.data || data);
  } catch (err) {
    console.error("Save profile error:", err);
    alert("Server error.");
  } finally {
    saveModalBtn.disabled = false;
    saveModalBtn.textContent = "Save";
  }
});

// ── PREVENT ZOOM ──
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "-" || e.key === "=")) {
    e.preventDefault();
  }
});
document.addEventListener("wheel", (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

// ── INIT ──
fetchTrainerProfile();
const SESSION_DURATION_SECONDS = 10 * 60;
const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";
const ACTIVE_CHAT_KEY = "stableActiveTrainerChat";
const WS_BASE = (() => {
  try {
    const url = new URL(API_BASE);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}`;
  } catch (error) {
    return "ws://localhost:8080";
  }
})();

class TrainerChatSocket {
  constructor({ sessionId, role, onMessage, onStatusChange }) {
    this.sessionId = sessionId;
    this.role = role;
    this.onMessage = onMessage || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.socket = null;
    this.reconnectAttempts = 0;
    this.shouldReconnect = true;
  }

  connect() {
    const apiPath = new URL(API_BASE).pathname.replace(/\/$/, "");
    const url = `${WS_BASE}${apiPath}/trainer-chat/sessions/${this.sessionId}/ws?role=${this.role}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChange("connected");
    };

    this.socket.onmessage = (event) => {
      console.log("[debug] onmessage fired:", event.data); // ← tambahkan
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (data.type === "message") this.onMessage(data);
    };

    this.socket.onclose = () => {
      this.onStatusChange("disconnected");
      if (this.shouldReconnect) this.scheduleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error("trainer chat ws error:", error);
    };
  }

  scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000);
    this.reconnectAttempts += 1;
    setTimeout(() => {
      if (this.shouldReconnect) this.connect();
    }, delay);
  }

  send(text) {
    if (!text?.trim()) return false;
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify({ type: "message", content: text.trim() })); // ← ganti message ke content
    return true;
  }

  close() {
    this.shouldReconnect = false;
    this.socket?.close();
    this.socket = null;
  }
}

let currentChatSocket = null;
let trainers = [];
let activeFilter = "all";
let selectedTrainer = null;
let chatInterval = null;
let remainingSeconds = SESSION_DURATION_SECONDS;
let activeSessionID = null;

// ─── WEBSOCKET ────────────────────────────────────────────────────
let ws = null;

// Derive ws:// or wss:// from API_BASE (http→ws, https→wss)
function getWSBase() {
  return API_BASE.replace(/^http/, "ws");
}

// ─── UTILS ───────────────────────────────────────────────────────
function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTimer(seconds) {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function readJSON(key) {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const value = storage.getItem(key);
      if (value) return JSON.parse(value);
    } catch (error) {
      storage.removeItem(key);
    }
  }
  return null;
}

function getClientsList() {
  return document.getElementById("clientsFullList");
}

function getCurrentUser() {
  const user = readJSON("stableUser") || {};
  return {
    id: user.id || user.ID || user.user_id || user.UserID,
    name: user.name || user.username || user.Username || "Guest",
    email: user.email || user.Email || "",
  };
}

function refreshIcons() {
  if (window.feather) {
    window.feather.replace();
  }
}

// ─── SESSION HISTORY (localStorage) ──────────────────────────────
function readSessionHistory() {
  try {
    return JSON.parse(localStorage.getItem("stableTrainerSessions") || "[]");
  } catch (error) {
    localStorage.removeItem("stableTrainerSessions");
    return [];
  }
}

function writeSessionHistory(sessions) {
  localStorage.setItem(
    "stableTrainerSessions",
    JSON.stringify(sessions.slice(0, 20)),
  );
}

function clearActiveChat() {
  localStorage.removeItem(ACTIVE_CHAT_KEY);
}

function readActiveChat() {
  try {
    const session = JSON.parse(localStorage.getItem(ACTIVE_CHAT_KEY) || "null");
    if (!session?.expires_at) return null;

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      clearActiveChat();
      return null;
    }

    return session;
  } catch (error) {
    clearActiveChat();
    return null;
  }
}

function writeActiveChat(session) {
  localStorage.setItem(ACTIVE_CHAT_KEY, JSON.stringify(session));
}

function activeChatForTrainer(trainerID) {
  const session = readActiveChat();
  if (!session) return null;
  return String(session.trainer_id) === String(trainerID) ? session : null;
}

function secondsUntil(expiresAt) {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
}

function formatHistoryDate(value) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function avatarContent(trainer) {
  return `
    <img src="${trainer.photo}" alt="${trainer.name}" loading="lazy" onerror="this.remove()" />
    <span>${trainer.initials}</span>
  `;
}

function getInitials(name = "Trainer") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function resolveTrainerPhoto(path) {
  if (!path) return "";
  if (
    path.startsWith("http") ||
    path.startsWith("data:") ||
    path.startsWith("../")
  ) {
    return path;
  }
  if (path.startsWith("/Img/")) return `..${path}`;
  return path;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

// ─── TRAINER DATA ─────────────────────────────────────────────────
function normalizeTrainer(raw) {
  const name =
    raw.name || raw.Name || raw.username || raw.Username || "Trainer";
  const trainerID = raw.id || raw.ID;
  const onlineValue =
    raw.is_online ?? raw.isOnline ?? raw.online ?? raw.Online ?? false;
  const online =
    onlineValue === true || String(onlineValue).toLowerCase() === "true";

  return {
    id: Number(trainerID),
    initials: raw.initials || getInitials(name),
    name,
    photo: resolveTrainerPhoto(
      raw.photo || raw.Photo || raw.profile_image || raw.ProfileImage,
    ),
    specialty:
      raw.specialty ||
      raw.Specialty ||
      raw.specialization ||
      raw.Specialization ||
      "Personal Trainer",
    categories: toArray(raw.categories || raw.Categories),
    tags: toArray(raw.tags || raw.Tags),
    description:
      raw.description ||
      raw.bio ||
      raw.Bio ||
      "Trainer STABLE siap membantu konsultasi latihan sesuai goal kamu.",
    online,
    rating: String(raw.rating || raw.Rating || "0.0"),
    experience: raw.experience || raw.Experience || "-",
    responseTime: online
      ? raw.response_time || raw.responseTime || "< 5 menit"
      : "Offline",
    price: Number(raw.price || raw.Price || 29000),
  };
}

async function loadTrainerCatalog() {
  try {
    const response = await fetch(`${API_BASE}/trainer-chat/trainers`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        result.message || result.error || "failed to load trainers",
      );
    }

    const data = result.data || result;
    trainers =
      Array.isArray(data) && data.length > 0 ? data.map(normalizeTrainer) : [];
  } catch (error) {
    console.error("failed to load trainer catalog:", error);
    trainers = [];
  }
}

// ─── RENDER TRAINERS ──────────────────────────────────────────────
function trainerMatchesSearch(trainer, keyword) {
  if (!keyword) return true;
  const haystack = [
    trainer.name,
    trainer.specialty,
    trainer.description,
    ...trainer.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(keyword.toLowerCase());
}

function trainerMatchesFilter(trainer) {
  return activeFilter === "all" || trainer.categories.includes(activeFilter);
}

function renderTrainers() {
  const grid = document.getElementById("trainerGrid");
  const search = document.getElementById("trainerSearch")?.value.trim() || "";
  if (!grid) return;

  if (trainers.length === 0) {
    grid.innerHTML = `
      <article class="trainer-offline-notice">
        <span class="status-dot offline"></span>
        <div>
          <h3>Belum ada trainer online</h3>
          <p>Data trainer belum tersedia atau semua trainer sedang offline. Coba lagi beberapa saat lagi.</p>
        </div>
      </article>
    `;
    return;
  }

  const visibleTrainers = trainers.filter(
    (trainer) =>
      trainerMatchesFilter(trainer) && trainerMatchesSearch(trainer, search),
  );
  const hasOnlineTrainer = trainers.some((trainer) => trainer.online);

  if (visibleTrainers.length === 0) {
    if (!hasOnlineTrainer) {
      grid.innerHTML = `
        <article class="trainer-offline-notice">
          <span class="status-dot offline"></span>
          <div>
            <h3>Belum ada trainer online</h3>
            <p>Semua trainer sedang offline. Kamu bisa melihat profil trainer setelah filter pencarian dihapus.</p>
          </div>
        </article>
      `;
      return;
    }

    grid.innerHTML = `
      <article class="trainer-card">
        <h3>Trainer tidak ditemukan</h3>
        <p>Coba gunakan kata kunci atau kategori lain.</p>
      </article>
    `;
    return;
  }

  const offlineNotice = !hasOnlineTrainer
    ? `
      <article class="trainer-offline-notice">
        <span class="status-dot offline"></span>
        <div>
          <h3>Semua trainer sedang offline</h3>
          <p>Kamu tetap bisa melihat profil trainer. Sesi chat dapat dimulai saat trainer online kembali.</p>
        </div>
      </article>
    `
    : "";

  grid.innerHTML =
    offlineNotice +
    visibleTrainers
      .map((trainer) => {
        const activeChat = activeChatForTrainer(trainer.id);
        const canOpenChat = trainer.online || activeChat;
        const buttonText = activeChat
          ? "Lanjut Chat"
          : trainer.online
            ? "Chat"
            : "Offline";

        return `
          <article class="trainer-card">
            <div class="trainer-top">
              <div class="trainer-avatar">${avatarContent(trainer)}</div>
              <div>
                <h3>${trainer.name}</h3>
                <div class="trainer-status${trainer.online ? "" : " is-offline"}">
                  <span class="live-dot"></span>
                  <span>${trainer.responseTime}</span>
                </div>
              </div>
            </div>

            <p>${trainer.description}</p>

            <div class="trainer-meta">
              <span>Rating ${trainer.rating}</span>
              <span>${trainer.experience}</span>
            </div>

            <div class="trainer-tags">
              ${trainer.tags.map((tag) => `<span class="trainer-tag">${tag}</span>`).join("")}
            </div>

            <div class="trainer-footer-line">
              <div class="trainer-price">
                <span>Chat 10 menit</span>
                <strong>${formatRupiah(trainer.price)}</strong>
              </div>
              <button
                class="btn-primary"
                data-trainer-id="${trainer.id}"
                type="button"
                ${canOpenChat ? "" : "disabled"}
              >
                ${buttonText}
              </button>
            </div>
          </article>
        `;
      })
      .join("");

  grid.querySelectorAll("[data-trainer-id]").forEach((button) => {
    button.addEventListener("click", () => {
      openPayment(button.dataset.trainerId);
    });
  });
}

function setActiveFilter(filter) {
  activeFilter = filter;
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === filter);
  });
  renderTrainers();
}

// ─── PAYMENT MODAL ────────────────────────────────────────────────
function openPayment(trainerID) {
  selectedTrainer = trainers.find(
    (trainer) => String(trainer.id) === String(trainerID),
  );
  if (!selectedTrainer) return;

  const activeChat = activeChatForTrainer(selectedTrainer.id);
  if (activeChat) {
    openChat(activeChat);
    return;
  }

  document.getElementById("paymentTrainerName").textContent =
    selectedTrainer.name;
  document.getElementById("paymentAvatar").innerHTML =
    avatarContent(selectedTrainer);
  document.getElementById("paymentSpecialty").textContent =
    selectedTrainer.specialty;
  document.getElementById("paymentStatus").textContent =
    `Online, respons ${selectedTrainer.responseTime}`;
  document.getElementById("paymentPrice").textContent = formatRupiah(
    selectedTrainer.price,
  );

  document.getElementById("paymentModal").classList.add("active");
  document.getElementById("paymentModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  refreshIcons();
}

function closePayment() {
  const modal = document.getElementById("paymentModal");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// ─── CHECKOUT ────────────────────────────────────────────────────
function resolveSessionFromResponse(raw) {
  const data = raw?.data || raw || {};

  const id = data.session_id ?? data.id ?? data.ID ?? data.Id;
  const startedAt = data.started_at ?? data.StartedAt ?? null;
  const expiresAt = data.expires_at ?? data.ExpiresAt ?? null;
  const status = data.status ?? data.Status ?? "pending";
  const messages = data.messages ?? data.Messages ?? [];

  if (id === undefined || id === null) {
    console.warn(
      "[trainer-chat] tidak menemukan session id di response. Response asli:",
      raw,
    );
  }

  return { id, startedAt, expiresAt, status, messages, raw: data };
}

async function fetchSessionDetail(sessionId) {
  try {
    const response = await fetch(
      `${API_BASE}/trainer-chat/sessions/${sessionId}`,
    );
    if (!response.ok) return null;
    const result = await response.json();
    return resolveSessionFromResponse(result);
  } catch (error) {
    console.error("[trainer-chat] gagal ambil detail session:", error);
    return null;
  }
}

async function checkoutWithMidtrans() {
  if (!selectedTrainer) return;
  const user = getCurrentUser();
  if (!user.id) {
    alert("Silakan login dulu sebelum membeli sesi chat trainer.");
    return;
  }

  if (!window.snap) {
    alert(
      "Midtrans Snap belum aktif. Pastikan script snap.js sandbox sudah dipasang di trainer.html.",
    );
    return;
  }

  const button = document.getElementById("payAndChatBtn");
  button.disabled = true;
  button.textContent = "MEMBUAT PEMBAYARAN...";

  try {
    const response = await fetch(`${API_BASE}/trainer-chat/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: Number(user.id),
        trainer_id: Number(selectedTrainer.id),
        customer_name: user.name,
        customer_email: user.email,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = result.error ? `: ${result.error}` : "";
      throw new Error(
        `${result.message || "Gagal membuat pembayaran"}${detail}`,
      );
    }

    console.log("[trainer-chat] checkout response:", result); // sementara, untuk debug field

    const checkoutSession = resolveSessionFromResponse(result);
    const snapToken = result.data?.snap_token ?? result.snap_token;
    if (!snapToken) throw new Error("Snap token kosong dari backend.");

    window.snap.pay(snapToken, {
      onSuccess: async () => {
        const checkoutSession = resolveSessionFromResponse(result);

        // Konfirmasi pembayaran ke backend
        await fetch(
          `${API_BASE}/trainer-chat/sessions/${checkoutSession.id}/confirm`,
          {
            method: "POST",
          },
        );

        // Ambil session yang sudah updated
        let finalSession = await waitForSessionReady(checkoutSession.id);

        if (!finalSession?.expiresAt) {
          const now = new Date();
          finalSession = {
            id: checkoutSession.id,
            expiresAt: new Date(
              now.getTime() + SESSION_DURATION_SECONDS * 1000,
            ).toISOString(),
            startedAt: now.toISOString(),
          };
        }

        const session = {
          session_id: finalSession.id,
          trainer_id: selectedTrainer.id,
          trainer_name: selectedTrainer.name,
          specialty: selectedTrainer.specialty,
          price: selectedTrainer.price,
          started_at: finalSession.startedAt,
          expires_at: finalSession.expiresAt,
          greeting_sent: false,
        };

        writeActiveChat(session);
        openChat(session);
      },
      onPending: () =>
        alert(
          "Pembayaran masih pending. Chat dibuka setelah pembayaran sukses.",
        ),
      onError: () => alert("Pembayaran gagal. Silakan coba lagi."),
      onClose: () => {},
    });
  } catch (error) {
    console.error("midtrans checkout failed:", error);
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Bayar & Mulai Chat";
  }
}

async function waitForSessionReady(sessionId, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const detail = await fetchSessionDetail(sessionId);
    if (detail?.expiresAt) return detail;
  }
  return null;
}

// ─── MESSAGES ────────────────────────────────────────────
function addMessage(type, text, options = {}) {
  const chatBody = document.getElementById("chatBody");
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  chatBody.appendChild(message);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function sendUserMessage(text) {
  if (!text.trim()) return;
  addMessage("user", text.trim(), { skipSend: true });

  const sent = currentChatSocket?.send(text.trim());
  if (!sent) {
    console.warn("[trainer-chat] pesan gagal terkirim lewat WebSocket");
  }
}

function renderMessagesFromAPI(messages) {
  const chatBody = document.getElementById("chatBody");
  chatBody.innerHTML = "";

  messages.forEach((msg) => {
    const type = (msg.sender || msg.Sender) === "trainer" ? "trainer" : "user";
    const text = msg.message || msg.Message || "";

    const el = document.createElement("div");
    el.className = `message ${type}`;
    el.textContent = text;
    chatBody.appendChild(el);
  });

  chatBody.scrollTop = chatBody.scrollHeight;
}

function appendMessageToHistory(sessionID, message) {
  const sessions = readSessionHistory();
  const target = sessions.find(
    (session) => String(session.id) === String(sessionID),
  );
  if (!target) return;

  target.messages = [...(target.messages || []), message];
  target.updated_at = message.created_at;
  writeSessionHistory(sessions);
  renderHistory();
}

// ─── CHAT MODAL ───────────────────────────────────────────────────
function openChat(activeChat = null) {
  if (!selectedTrainer) return;

  closePayment();

  let session = activeChat;
  if (!session || String(session.trainer_id) !== String(selectedTrainer.id)) {
    const historySession = createSessionHistory();
    const expiresAt = new Date(
      new Date(historySession.started_at).getTime() +
        SESSION_DURATION_SECONDS * 1000,
    ).toISOString();

    session = {
      session_id: historySession.id,
      trainer_id: selectedTrainer.id,
      trainer_name: selectedTrainer.name,
      specialty: selectedTrainer.specialty,
      price: selectedTrainer.price,
      started_at: historySession.started_at,
      expires_at: expiresAt,
      greeting_sent: false,
    };
    writeActiveChat(session);
  }

  activeSessionID = session.session_id;

  const chatModal = document.getElementById("chatModal");
  const chatWindow = chatModal.querySelector(".chat-window");

  chatWindow.classList.remove("chat-ended");
  remainingSeconds = secondsUntil(session.expires_at);

  if (remainingSeconds <= 0) {
    endChatSession();
    return;
  }

  // tampilkan placeholder loading dulu, sambil fetch riwayat asli
  document.getElementById("chatBody").innerHTML =
    '<p class="empty-text">Memuat percakapan...</p>';

  document.getElementById("chatAvatar").innerHTML =
    avatarContent(selectedTrainer);
  document.getElementById("chatTrainerName").textContent = selectedTrainer.name;
  document.getElementById("chatTrainerSpecialty").textContent =
    selectedTrainer.specialty;
  document.getElementById("chatTimer").textContent =
    formatTimer(remainingSeconds);

  chatModal.classList.add("active");
  chatModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  // --- fetch riwayat pesan ASLI dari backend (bukan localStorage lagi) ---
  fetchSessionDetail(activeSessionID).then((detail) => {
    renderMessagesFromAPI(detail?.messages || []);
  });

  if (!session.greeting_sent) {
    // catatan: ini cuma kosmetik lokal, tidak tersimpan ke DB
    addMessage(
      "trainer",
      `[Pesan otomatis] Halo, saya ${selectedTrainer.name}. Ceritakan goal kamu dan kendala latihan yang paling ingin dibahas hari ini.`,
    );
    session.greeting_sent = true;
    writeActiveChat(session);
  }

  currentChatSocket?.close();
  currentChatSocket = new TrainerChatSocket({
    sessionId: activeSessionID,
    role: "user",
    onMessage: (data) => {
      // ini cuma untuk pesan dari LAWAN (trainer), karena broadcast tidak echo ke diri sendiri
      if (data.sender === "trainer") {
        addMessage("trainer", data.content || data.message, { skipSend: true });
      }
    },
    onStatusChange: (status) =>
      console.log("[trainer-chat] ws status:", status),
  });
  currentChatSocket.connect();

  window.clearInterval(chatInterval);
  chatInterval = window.setInterval(() => {
    remainingSeconds = secondsUntil(session.expires_at);
    document.getElementById("chatTimer").textContent = formatTimer(
      Math.max(remainingSeconds, 0),
    );
    if (remainingSeconds <= 0) endChatSession();
  }, 1000);

  refreshIcons();
}

function closeChat() {
  const modal = document.getElementById("chatModal");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  window.clearInterval(chatInterval);
  currentChatSocket?.close();
  currentChatSocket = null;
  renderTrainers();
}

function endChatSession() {
  window.clearInterval(chatInterval);
  currentChatSocket?.close();
  currentChatSocket = null;
  clearActiveChat();
  document.getElementById("chatTimer").textContent = "00:00";
  document.querySelector(".chat-window").classList.add("chat-ended");
  addMessage(
    "trainer",
    "Sesi 10 menit sudah selesai. Kamu bisa mulai sesi baru kapan saja.",
    { skipSend: true },
  );
  activeSessionID = null;
  renderTrainers();
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────
function sendUserMessage(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // render dulu di UI sendiri (karena broadcast backend tidak echo ke pengirim)
  addMessage("user", trimmed, { skipSend: true });

  const sent = currentChatSocket?.send(trimmed);
  if (!sent) {
    console.warn(
      "[trainer-chat] pesan tampil di UI tapi GAGAL terkirim lewat WebSocket",
    );
  }
}

// ─── HISTORY ──────────────────────────────────────────────────────
function getHistoryTrainerKey(session) {
  return String(
    session.trainer_id ||
      session.trainer_key ||
      session.trainer_name ||
      "trainer",
  )
    .trim()
    .toLowerCase();
}

function groupHistoryByTrainer(sessions) {
  const groups = new Map();

  sessions.forEach((session) => {
    const key = getHistoryTrainerKey(session);
    const existing = groups.get(key);
    const latestTime = new Date(
      session.updated_at || session.started_at || 0,
    ).getTime();

    if (!existing) {
      groups.set(key, {
        key,
        trainerName: session.trainer_name || "Trainer",
        specialty: session.specialty || "Personal Trainer",
        price: session.price || 0,
        latestAt: session.updated_at || session.started_at,
        latestTime,
        sessions: [session],
      });
      return;
    }

    existing.sessions.push(session);
    if (latestTime > existing.latestTime) {
      existing.latestAt = session.updated_at || session.started_at;
      existing.latestTime = latestTime;
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      sessions: group.sessions.sort(
        (a, b) =>
          new Date(b.updated_at || b.started_at || 0).getTime() -
          new Date(a.updated_at || a.started_at || 0).getTime(),
      ),
    }))
    .sort((a, b) => b.latestTime - a.latestTime);
}

async function renderHistory() {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  historyList.innerHTML = `<p class="empty-history">Memuat riwayat...</p>`;

  const sessions = await loadHistoryFromAPI();

  if (sessions.length === 0) {
    historyList.innerHTML = `<p class="empty-history">Belum ada riwayat chat.</p>`;
    return;
  }

  // Group by trainer_id (bukan trainer_key lagi)
  const groups = new Map();
  sessions.forEach((session) => {
    const key = String(session.trainer_id || session.TrainerID);
    const existing = groups.get(key);
    const latestTime = new Date(
      session.updated_at || session.created_at || 0,
    ).getTime();

    if (!existing) {
      groups.set(key, {
        key,
        trainerName: session.trainer_name || session.TrainerName || "Trainer",
        specialty:
          session.trainer_specialty ||
          session.TrainerSpecialty ||
          "Personal Trainer",
        latestAt: session.updated_at || session.created_at,
        latestTime,
        sessions: [session],
      });
      return;
    }
    existing.sessions.push(session);
    if (latestTime > existing.latestTime) {
      existing.latestAt = session.updated_at || session.created_at;
      existing.latestTime = latestTime;
    }
  });

  const sorted = Array.from(groups.values()).sort(
    (a, b) => b.latestTime - a.latestTime,
  );

  historyList.innerHTML = sorted
    .map((group) => {
      const sessionText =
        group.sessions.length === 1
          ? "1 sesi konsultasi"
          : `${group.sessions.length} sesi konsultasi`;

      return `
      <article class="history-card">
        <div>
          <h3>${escapeHTML(group.trainerName)}</h3>
          <span>${escapeHTML(group.specialty)} - ${sessionText} - ${formatHistoryDate(group.latestAt)}</span>
        </div>
        <button type="button" data-history-trainer="${escapeHTML(group.key)}">Lihat Chat</button>
      </article>
    `;
    })
    .join("");

  historyList.querySelectorAll("[data-history-trainer]").forEach((button) => {
    button.addEventListener("click", () =>
      openHistory(button.dataset.historyTrainer, sorted),
    );
  });
}

function renderHistorySessionDetail(session, sessionNumber) {
  const detail = document.getElementById("historySessionDetail");
  if (!detail || !session) return;

  const messages = session.messages || session.Messages || [];
  const sessionMessages =
    messages.length > 0
      ? messages
          .map(
            (msg) =>
              `<div class="message ${msg.sender === "user" ? "user" : "trainer"}">
          ${escapeHTML(msg.message || msg.Message || "")}
        </div>`,
          )
          .join("")
      : `<div class="message trainer">Belum ada pesan tersimpan untuk sesi ini.</div>`;

  detail.innerHTML = `
    <div class="history-session-head">
      <strong>Sesi ${sessionNumber}</strong>
      <span>${formatHistoryDate(session.created_at)}</span>
    </div>
    <div class="history-session-chat">${sessionMessages}</div>
  `;
}

function openHistory(trainerKey, groups) {
  const group = groups.find((item) => item.key === trainerKey);
  if (!group) return;

  document.getElementById("historyTrainerName").textContent = group.trainerName;
  document.getElementById("historyMeta").textContent =
    `${group.specialty} - ${group.sessions.length} sesi`;

  document.getElementById("historyMessages").innerHTML = `
    <div class="history-session-list">
      ${group.sessions
        .map((session, index) => {
          const sessionNumber = group.sessions.length - index;
          return `
          <button class="history-session-button" type="button"
            data-history-session="${escapeHTML(String(session.id || session.ID))}">
            <span>
              <strong>Sesi ${sessionNumber}</strong>
              <small>${formatHistoryDate(session.created_at)}</small>
            </span>
            <em>${escapeHTML(session.status || "")}</em>
          </button>
        `;
        })
        .join("")}
    </div>
    <section class="history-session-detail" id="historySessionDetail"></section>
  `;

  document.querySelectorAll("[data-history-session]").forEach((button) => {
    button.addEventListener("click", () => {
      const session = group.sessions.find(
        (s) => String(s.id || s.ID) === button.dataset.historySession,
      );
      renderHistorySessionDetail(
        session,
        group.sessions.length - group.sessions.indexOf(session),
      );
    });
  });

  // Tampilkan sesi pertama otomatis
  if (group.sessions[0]) {
    renderHistorySessionDetail(group.sessions[0], group.sessions.length);
  }

  document.getElementById("historyModal").classList.add("active");
  document.getElementById("historyModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeHistory() {
  const modal = document.getElementById("historyModal");
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// ─── EVENTS ───────────────────────────────────────────────────────
function bindEvents() {
  document
    .getElementById("trainerSearch")
    ?.addEventListener("input", renderTrainers);

  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => setActiveFilter(chip.dataset.filter));
  });

  document
    .getElementById("closePaymentBtn")
    ?.addEventListener("click", closePayment);
  document
    .getElementById("payAndChatBtn")
    ?.addEventListener("click", checkoutWithMidtrans);
  document.getElementById("closeChatBtn")?.addEventListener("click", closeChat);
  document
    .getElementById("closeHistoryBtn")
    ?.addEventListener("click", closeHistory);

  document
    .getElementById("paymentModal")
    ?.addEventListener("click", (event) => {
      if (event.target.id === "paymentModal") closePayment();
    });

  document.getElementById("chatModal")?.addEventListener("click", (event) => {
    if (event.target.id === "chatModal") closeChat();
  });

  document
    .getElementById("historyModal")
    ?.addEventListener("click", (event) => {
      if (event.target.id === "historyModal") closeHistory();
    });

  document.getElementById("chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("chatInput");
    sendUserMessage(input.value);
    input.value = "";
  });

  document.querySelectorAll("#quickReplies button").forEach((button) => {
    button.addEventListener("click", () => {
      sendUserMessage(button.textContent);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closePayment();
    closeChat();
    closeHistory();
  });
}

function getToken() {
  return (
    readJSON("stableUser")?.token ||
    readJSON("stableUser")?.Token ||
    readJSON("stableUser")?.access_token ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

async function loadHistoryFromAPI() {
  const token = getToken();
  if (!token) {
    console.warn("[trainer-chat] tidak ada token, riwayat tidak bisa diambil");
    return [];
  }

  try {
    const response = await fetch(`${API_BASE}/trainer-chat/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      console.warn("[trainer-chat] gagal load history, status:", response.status);
      return [];
    }
    const result = await response.json();
    return result.data || [];
  } catch (err) {
    console.error("failed to load history:", err);
    return [];
  }
}

// ─── INIT ─────────────────────────────────────────────────────────
async function init() {
  bindEvents();
  await loadTrainerCatalog();
  renderTrainers();
  await renderHistory();
  refreshIcons();
}

init();

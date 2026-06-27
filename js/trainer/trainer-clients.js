const API_BASE = window.STABLE_API_BASE || "http://localhost:8080/api/v1";
const WS_BASE = (() => {
  try {
    const url = new URL(API_BASE);
    const protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${url.host}`;
  } catch (error) {
    return "ws://localhost:8080";
  }
})();

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

function readJSON(key, fallback = null) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (error) {
    return fallback;
  }
}

const clientsList = document.getElementById("clientsFullList");
const searchInput = document.getElementById("searchInput");
const totalClients = document.getElementById("totalClientsHero");
const chatModal = document.getElementById("chatModal");
const closeChatButton = document.getElementById("closeChatBtn");
const chatTitle = document.getElementById("chatModalTitle");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const sendChatButton = document.getElementById("sendChatBtn");
const greeting = document.getElementById("userGreeting");

// --- single source of truth untuk semua session (GANTI dari array `sessions`) ---
const sessionsMap = new Map(); // key: String(id), value: session object
let activeSessionId = null;
let currentChatSocket = null;

function getSession(id) {
  return sessionsMap.get(String(id));
}

function upsertSession(normalized, { mergeMessages = true } = {}) {
  const key = String(normalized.id);
  const existing = sessionsMap.get(key);

  if (!existing) {
    sessionsMap.set(key, normalized);
    return sessionsMap.get(key);
  }

  existing.name = normalized.name;
  existing.goal = normalized.goal;

  if (mergeMessages) {
    normalized.messages.forEach((incoming) => {
      const alreadyExists = existing.messages.some(
        (m) => m.sender === incoming.sender && m.text === incoming.text && m.time === incoming.time,
      );
      if (!alreadyExists) existing.messages.push(incoming);
    });
  }

  return existing;
}

function getAllSessions() {
  return Array.from(sessionsMap.values());
}

// --- WebSocket client ---
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
    const wsUrl = `${WS_BASE}${apiPath}/trainer-chat/sessions/${this.sessionId}/ws?role=${this.role}`;
    this.socket = new WebSocket(wsUrl);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.onStatusChange("connected");
    };

    this.socket.onmessage = (event) => {
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
      console.error("[trainer-chat] ws error:", error);
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
    this.socket.send(JSON.stringify({ type: "message", content: text.trim() }));
    return true;
  }

  close() {
    this.shouldReconnect = false;
    this.socket?.close();
    this.socket = null;
  }
}

// --- normalisasi 1 session dari backend jadi bentuk yang dipakai UI ---
function normalizeSession(raw) {
  return {
    id: raw.id || raw.ID,
    name: raw.user_name || raw.customer_name || `User #${raw.user_id || raw.UserID}`,
    goal: raw.trainer_specialty || raw.TrainerSpecialty || "Konsultasi",
    online: false,
    unread: 0,
    messages: (raw.messages || []).map((msg) => ({
      sender: msg.sender === "user" ? "client" : "trainer",
      text: msg.message || msg.text || msg.Message || "",
      time: msg.created_at
        ? new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
            new Date(msg.created_at),
          )
        : "",
    })),
  };
}

// --- ambil daftar session milik trainer ini (endpoint kamu sendiri, dipertahankan) ---
async function loadSessions() {
  const token = getToken();
  try {
    const response = await fetch(`${API_BASE}/trainer-chat/trainer-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      console.warn("[trainer-chat] gagal load sessions, status:", response.status);
      return;
    }

    const result = await response.json();
    const list = result.data || [];
    list.forEach((raw) => upsertSession(normalizeSession(raw)));
  } catch (error) {
    console.error("[trainer-chat] load sessions error:", error);
  }
}

async function refreshSessions() {
  await loadSessions();
  renderClients(searchInput?.value || "");
}

function startPolling() {
  refreshSessions();
  setInterval(refreshSessions, 5000);
}

function getInitials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function getLastMessage(session) {
  if (!session.messages.length) return "Belum ada percakapan.";
  return session.messages[session.messages.length - 1].text;
}

function getLastTime(session) {
  if (!session.messages.length) return "";
  return session.messages[session.messages.length - 1].time;
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function renderClients(query = "") {
  const sessions = getAllSessions();
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = sessions.filter((s) => s.name.toLowerCase().includes(normalizedQuery));

  totalClients.textContent = sessions.length;

  if (!filtered.length) {
    clientsList.innerHTML = '<p class="empty-text">Belum ada chat aktif.</p>';
    return;
  }

  clientsList.innerHTML = filtered
    .map(
      (session) => `
        <button
          class="client-row${String(session.id) === String(activeSessionId) ? " is-active" : ""}"
          type="button"
          data-session-id="${session.id}"
          aria-label="Buka chat dengan ${escapeHTML(session.name)}"
        >
          <span class="client-avatar${session.online ? " is-online" : ""}">
            ${getInitials(session.name)}
          </span>
          <span class="client-info">
            <span class="client-name-line">
              <span class="client-name">${escapeHTML(session.name)}</span>
              <span class="client-goal">${escapeHTML(session.goal)}</span>
            </span>
            <span class="client-preview">${escapeHTML(getLastMessage(session))}</span>
          </span>
          <span class="client-meta">
            <span class="client-time">${escapeHTML(getLastTime(session))}</span>
            ${session.unread > 0 ? `<span class="unread-badge">${session.unread}</span>` : ""}
          </span>
        </button>
      `,
    )
    .join("");
}

function renderMessages(session) {
  if (!session.messages.length) {
    chatBody.innerHTML = '<p class="empty-text">Belum ada pesan. Mulai percakapan sekarang.</p>';
    return;
  }

  chatBody.innerHTML = `
    <span class="chat-date">Percakapan terbaru</span>
    ${session.messages
      .map(
        (message) => `
          <div class="message message--${message.sender}">
            <p class="message-text">${escapeHTML(message.text)}</p>
            <span class="message-time">${escapeHTML(message.time)}</span>
          </div>
        `,
      )
      .join("")}
  `;

  requestAnimationFrame(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  });
}

function getCurrentTime() {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(),
  );
}

function openChat(sessionId) {
  const session = getSession(sessionId);
  if (!session) return;

  activeSessionId = session.id;
  session.unread = 0;

  chatTitle.innerHTML = `
    <span class="chat-person">
      <span class="client-avatar${session.online ? " is-online" : ""}">
        ${getInitials(session.name)}
      </span>
      <span class="chat-person-copy">
        <span>${escapeHTML(session.name)}</span>
        <span class="chat-status">${session.online ? "Online" : "Offline"}</span>
      </span>
    </span>
  `;

  renderMessages(session);
  renderClients(searchInput.value);

  chatModal.classList.add("is-open");
  chatModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  window.setTimeout(() => chatInput.focus(), 120);

  currentChatSocket?.close();
  currentChatSocket = new TrainerChatSocket({
    sessionId: session.id,
    role: "trainer",
    onMessage: (data) => {
      if (data.sender !== "user") return;

      const target = getSession(session.id);
      if (!target) return;

      target.messages.push({
        sender: "client",
        text: data.content || data.message,
        time: getCurrentTime(),
      });

      if (String(activeSessionId) === String(target.id)) {
        renderMessages(target);
      } else {
        target.unread += 1;
      }
      renderClients(searchInput?.value || "");
    },
    onStatusChange: (status) => console.log("[trainer-chat] ws status:", status),
  });
  currentChatSocket.connect();
}

function closeChat() {
  chatModal.classList.remove("is-open");
  chatModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  currentChatSocket?.close();
  currentChatSocket = null;
  activeSessionId = null;
  renderClients(searchInput.value);
}

function sendMessage() {
  const messageText = chatInput.value.trim();
  const session = getSession(activeSessionId);
  if (!messageText || !session) return;

  const time = getCurrentTime();
  const sent = currentChatSocket?.send(messageText);

  session.messages.push({ sender: "trainer", text: messageText, time });
  if (!sent) {
    console.warn("[trainer-chat] pesan tampil di UI tapi GAGAL terkirim lewat WebSocket");
  }

  chatInput.value = "";
  renderMessages(session);
  renderClients(searchInput.value);
  updateSendButton();
}

function updateSendButton() {
  sendChatButton.disabled = chatInput.value.trim().length === 0;
}

function loadTrainerName() {
  if (!greeting) return;
  const user = readJSON("stableUser");
  if (user?.name || user?.username) {
    greeting.textContent = user.name || user.username;
  }
}

clientsList.addEventListener("click", (event) => {
  const row = event.target.closest(".client-row");
  if (!row) return;
  openChat(row.dataset.sessionId);
});

searchInput.addEventListener("input", () => renderClients(searchInput.value));
closeChatButton.addEventListener("click", closeChat);

chatModal.addEventListener("click", (event) => {
  if (event.target === chatModal) closeChat();
});

chatInput.addEventListener("input", updateSendButton);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
sendChatButton.addEventListener("click", sendMessage);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && chatModal.classList.contains("is-open")) closeChat();
});

async function init() {
  chatModal.setAttribute("aria-hidden", "true");
  loadTrainerName();
  startPolling();
  updateSendButton();
  if (window.feather) feather.replace();
}

init();
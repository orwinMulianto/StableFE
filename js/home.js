// ── GREETING ──
function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good Morning ☀️";
  if (h >= 12 && h < 15) return "Good Afternoon 🌤️";
  if (h >= 15 && h < 19) return "Good Evening 🌅";
  return "Good Night 🌙";
}
document.getElementById("greetingLabel").textContent = getGreeting();

// ── EXERCISE DATA ──
const exerciseData = {
  Perut: [
    { name: "Crunches", reps: "3x20" },
    { name: "Plank", reps: "3x45 det" },
    { name: "Leg Raise", reps: "3x15" },
    { name: "Russian Twist", reps: "3x20" },
  ],
  Lengan: [
    { name: "Bicep Curl", reps: "3x12" },
    { name: "Tricep Dip", reps: "3x15" },
    { name: "Hammer Curl", reps: "3x12" },
    { name: "Push Up", reps: "3x15" },
  ],
  Dada: [
    { name: "Push Up", reps: "4x15" },
    { name: "Wide Push Up", reps: "3x12" },
    { name: "Chest Squeeze", reps: "3x15" },
    { name: "Incline Push Up", reps: "3x12" },
  ],
  Kaki: [
    { name: "Squat", reps: "4x15" },
    { name: "Lunges", reps: "3x12" },
    { name: "Calf Raise", reps: "3x20" },
    { name: "Wall Sit", reps: "3x45 det" },
  ],
  Bahu: [
    { name: "Shoulder Press", reps: "3x12" },
    { name: "Lateral Raise", reps: "3x15" },
    { name: "Front Raise", reps: "3x12" },
    { name: "Superman Hold", reps: "3x15" },
  ],
};

// ── STATE ──
let selectedMuscle = "Perut";
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);

function storageKey(date, muscle) {
  return `stable_${date.toISOString().split("T")[0]}_${muscle}`;
}
function getChecked(date, muscle) {
  const r = localStorage.getItem(storageKey(date, muscle));
  return r ? JSON.parse(r) : [];
}
function saveChecked(date, muscle, c) {
  localStorage.setItem(storageKey(date, muscle), JSON.stringify(c));
}
function hasActivity(date) {
  return Object.keys(exerciseData).some((m) => getChecked(date, m).length > 0);
}

// ── EXERCISES ──
function renderExercises() {
  const list = document.getElementById("exerciseList");
  const exs = exerciseData[selectedMuscle] || [];
  const checked = getChecked(selectedDate, selectedMuscle);
  list.innerHTML = "";

  if (!exs.length) {
    list.innerHTML = '<p class="empty-exercise">Tidak ada latihan.</p>';
    updateProgress(0, 0);
    return;
  }

  exs.forEach((ex, i) => {
    const done = checked.includes(i);
    const el = document.createElement("div");
    el.className = `exercise-item${done ? " done" : ""}`;
    el.innerHTML = `
      <div class="exercise-check">
        ${done ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ""}
      </div>
      <span class="exercise-name">${ex.name}</span>
      <span class="exercise-reps">${ex.reps}</span>
    `;
    el.addEventListener("click", () => {
      const c = getChecked(selectedDate, selectedMuscle);
      const idx = c.indexOf(i);
      if (idx === -1) c.push(i);
      else c.splice(idx, 1);
      saveChecked(selectedDate, selectedMuscle, c);
      renderExercises();
      renderCalendar();
    });
    list.appendChild(el);
  });

  updateProgress(checked.length, exs.length);
}

function updateProgress(done, total) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById("progressText").textContent =
    `${done} / ${total} selesai`;
  document.getElementById("progressPct").textContent = `${pct}%`;
  document.getElementById("progressFill").style.width = `${pct}%`;
}

document.querySelectorAll(".activity-filter .filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".activity-filter .filter-chip")
      .forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    selectedMuscle = chip.dataset.muscle;
    renderExercises();
  });
});

// ── CALENDAR ──
const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function renderCalendar() {
  const container = document.getElementById("calendarDates");
  container.innerHTML = "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 30);
  const end = new Date(today);
  end.setDate(today.getDate() + 14);
  let scrollTarget = null;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const cur = new Date(d);
    const isToday = cur.toDateString() === today.toDateString();
    const isSelected = cur.toDateString() === selectedDate.toDateString();
    const isFuture = cur > today;
    const hasAct = !isFuture && hasActivity(cur);

    const el = document.createElement("div");
    el.className = [
      "cal-day",
      isToday ? "today" : "",
      isSelected ? "selected" : "",
      isFuture ? "future" : "",
      hasAct ? "has-activity" : "",
    ]
      .filter(Boolean)
      .join(" ");
    el.innerHTML = `<span class="cal-day-name">${DAYS[cur.getDay()]}</span><span class="cal-day-num">${cur.getDate()}</span>`;
    el.addEventListener("click", () => {
      selectedDate = new Date(cur);
      updateDateLabel();
      renderCalendar();
      renderExercises();
    });
    container.appendChild(el);
    if (isToday) scrollTarget = el;
  }

  if (scrollTarget && !container.dataset.scrolled) {
    container.dataset.scrolled = "1";
    setTimeout(
      () =>
        scrollTarget.scrollIntoView({
          behavior: "smooth",
          inline: "center",
          block: "nearest",
        }),
      100,
    );
  }
}

function updateDateLabel() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = selectedDate.toDateString() === today.toDateString();
  document.getElementById("selectedDateLabel").textContent = isToday
    ? "Hari ini"
    : `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
}

document.getElementById("calPrev").addEventListener("click", () => {
  document
    .getElementById("calendarDates")
    .scrollBy({ left: -220, behavior: "smooth" });
});
document.getElementById("calNext").addEventListener("click", () => {
  document
    .getElementById("calendarDates")
    .scrollBy({ left: 220, behavior: "smooth" });
});

// ── TIMER ──
const PRESETS = {
  workout: [
    { label: "1 min", s: 60 },
    { label: "3 min", s: 180 },
    { label: "5 min", s: 300 },
    { label: "10 min", s: 600 },
  ],
  rest: [
    { label: "30 det", s: 30 },
    { label: "1 min", s: 60 },
    { label: "90 det", s: 90 },
    { label: "2 min", s: 120 },
  ],
};

let timerMode = "workout";
let timerSet = 0;
let timerSeconds = 0;
let timerRunning = false;
let timerInterval = null;

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function renderPresets() {
  const wrap = document.getElementById("timerPresets");
  wrap.innerHTML = "";
  PRESETS[timerMode].forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "preset-btn";
    btn.textContent = p.label;
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".preset-btn")
        .forEach((b) => b.classList.remove("active-preset"));
      btn.classList.add("active-preset");
      setTimer(p.s);
    });
    wrap.appendChild(btn);
  });
}

function setTimer(seconds) {
  stopTimer();
  timerSet = seconds;
  timerSeconds = seconds;
  document.getElementById("timerDisplay").textContent = formatTime(seconds);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById("startTimerBtn").textContent = "▶ START";
}

document.getElementById("modeWorkout").addEventListener("click", () => {
  timerMode = "workout";
  document.getElementById("modeWorkout").classList.add("active");
  document.getElementById("modeRest").classList.remove("active");
  document.getElementById("timerModeLabel").textContent = "WORKOUT TIMER";
  document.getElementById("timerDisplay").style.color = "#ffffff";
  renderPresets();
  setTimer(0);
});

document.getElementById("modeRest").addEventListener("click", () => {
  timerMode = "rest";
  document.getElementById("modeRest").classList.add("active");
  document.getElementById("modeWorkout").classList.remove("active");
  document.getElementById("timerModeLabel").textContent = "REST TIMER";
  document.getElementById("timerDisplay").style.color = "#50c878";
  renderPresets();
  setTimer(0);
});

document.getElementById("startTimerBtn").addEventListener("click", () => {
  if (timerSeconds === 0 && !timerRunning) return;
  if (timerRunning) {
    stopTimer();
  } else {
    timerRunning = true;
    document.getElementById("startTimerBtn").textContent = "⏸ PAUSE";
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        document.getElementById("timerDisplay").textContent =
          formatTime(timerSeconds);
      } else {
        stopTimer();
        document.getElementById("timerDisplay").textContent = "00:00";
      }
    }, 1000);
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

const API_BASE = "http://localhost:8080/api/v1";

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

async function fetchUser() {
  const token = getToken();
  if (!token) return;

  const payload = parseJwt(token);
  const userId = payload?.id || payload?.user_id || payload?.sub || payload?.ID;
  if (!userId) return;

  try {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return;

    const data = await res.json();
    const user = data.data || data;

    // Ganti yang sebelumnya pakai firstName
    const fullName = user.username || user.Username || "Guest";

    const greetingEl = document.getElementById("userGreeting");
    if (greetingEl) greetingEl.textContent = fullName;

    const welcomeEl = document.getElementById("welcomeName");
    if (welcomeEl) welcomeEl.textContent = `Hello, ${firstName}`;
  } catch (err) {
    console.error("fetchUser error:", err);
  }
}

// ── INIT ──
updateDateLabel();
renderCalendar();
renderExercises();
renderPresets();
fetchUser();

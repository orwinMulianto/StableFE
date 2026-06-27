const API_BASE = "http://localhost:8080/api/v1";
const WORKOUTS_KEY = "stableWorkoutByDate";
const WEEKLY_SCHEDULE_KEY = "stableWeeklyWorkoutSchedule";
const WORKOUT_OVERRIDES_KEY = "stableWorkoutOverridesByDate";

// Default exercises are used only when a date has no custom workout plan.
const defaultExerciseData = {
  Perut: [
    { id: "crunches", name: "Crunches", sets: 3, reps: 20 },
    { id: "plank", name: "Plank", sets: 3, reps: 45, unit: "det" },
    { id: "leg-raise", name: "Leg Raise", sets: 3, reps: 15 },
    { id: "russian-twist", name: "Russian Twist", sets: 3, reps: 20 },
  ],
  Lengan: [
    { id: "bicep-curl", name: "Bicep Curl", sets: 3, reps: 12 },
    { id: "tricep-dip", name: "Tricep Dip", sets: 3, reps: 15 },
    { id: "hammer-curl", name: "Hammer Curl", sets: 3, reps: 12 },
    { id: "push-up-arm", name: "Push Up", sets: 3, reps: 15 },
  ],
  Dada: [
    { id: "push-up", name: "Push Up", sets: 4, reps: 15 },
    { id: "wide-push-up", name: "Wide Push Up", sets: 3, reps: 12 },
    { id: "chest-squeeze", name: "Chest Squeeze", sets: 3, reps: 15 },
    { id: "incline-push-up", name: "Incline Push Up", sets: 3, reps: 12 },
  ],
  Kaki: [
    { id: "squat", name: "Squat", sets: 4, reps: 15 },
    { id: "lunges", name: "Lunges", sets: 3, reps: 12 },
    { id: "calf-raise", name: "Calf Raise", sets: 3, reps: 20 },
    { id: "wall-sit", name: "Wall Sit", sets: 3, reps: 45, unit: "det" },
  ],
  "Bahu & Punggung": [
    { id: "shoulder-press", name: "Shoulder Press", sets: 3, reps: 12 },
    { id: "lateral-raise", name: "Lateral Raise", sets: 3, reps: 15 },
    { id: "front-raise", name: "Front Raise", sets: 3, reps: 12 },
    { id: "superman-hold", name: "Superman Hold", sets: 3, reps: 15 },
  ],
};

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

let selectedMuscle = "Perut";
let selectedDate = startOfDay(new Date());

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 15) return "Good Afternoon";
  if (hour >= 15 && hour < 19) return "Good Evening";
  return "Good Night";
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeMuscle(muscle) {
  if (muscle === "Bahu") return "Bahu & Punggung";
  return muscle;
}

function readJSON(key, fallback) {
  try {
    const result = JSON.parse(localStorage.getItem(key));
    return result ?? fallback;
  } catch (error) {
    localStorage.removeItem(key);
    return fallback;
  }
}

function getWorkoutPlans() {
  return readJSON(WORKOUTS_KEY, {});
}

function getWeeklySchedule() {
  return readJSON(WEEKLY_SCHEDULE_KEY, {});
}

function getWorkoutOverrides() {
  return readJSON(WORKOUT_OVERRIDES_KEY, {});
}

function normalizeExerciseItem(exercise) {
  return {
    ...exercise,
    id: exercise.id || exercise.name.toLowerCase().replaceAll(" ", "-"),
    muscle: normalizeMuscle(exercise.muscle),
    sets: Number(exercise.sets) || 3,
    reps: Number(exercise.reps) || 10,
  };
}

function normalizeExerciseList(exercises) {
  return Array.isArray(exercises) ? exercises.map(normalizeExerciseItem) : [];
}

function normalizeDayPlan(plan) {
  if (!plan) return null;

  if (Array.isArray(plan)) {
    return {
      type: "workout",
      title: "Custom Workout",
      muscle: "",
      exercises: normalizeExerciseList(plan),
    };
  }

  const type = plan.type === "rest" ? "rest" : "workout";
  return {
    type,
    title: plan.title || (type === "rest" ? "Rest Day" : "Workout Day"),
    muscle: normalizeMuscle(plan.muscle),
    exercises: type === "rest" ? [] : normalizeExerciseList(plan.exercises),
  };
}

function getScheduledPlan(date) {
  const dateKey = formatDateKey(date);
  const override = normalizeDayPlan(getWorkoutOverrides()[dateKey]);
  if (override) return override;

  const weeklyPlan = getWeeklySchedule()[String(date.getDay())];
  return normalizeDayPlan(weeklyPlan);
}

function getCustomWorkout(date) {
  const scheduledPlan = getScheduledPlan(date);
  if (scheduledPlan) {
    return scheduledPlan.type === "rest" ? [] : scheduledPlan.exercises;
  }

  const plans = getWorkoutPlans();
  const workout = plans[formatDateKey(date)];
  return normalizeExerciseList(workout);
}

function getExercises(date, muscle) {
  const normalizedMuscle = normalizeMuscle(muscle);
  const scheduledPlan = getScheduledPlan(date);

  if (scheduledPlan) {
    return scheduledPlan.type === "rest" ? [] : scheduledPlan.exercises;
  }

  const customWorkout = getCustomWorkout(date);

  if (customWorkout.length > 0) {
    return customWorkout
      .filter((exercise) => normalizeMuscle(exercise.muscle) === normalizedMuscle)
      .map((exercise) => ({
        ...exercise,
        id: exercise.id || exercise.name.toLowerCase().replaceAll(" ", "-"),
      }));
  }

  return defaultExerciseData[normalizedMuscle] || [];
}

function completionScope(date, muscle) {
  const scheduledPlan = getScheduledPlan(date);
  if (scheduledPlan && scheduledPlan.type === "workout") {
    return "scheduled-workout";
  }

  return normalizeMuscle(muscle);
}

function completionStorageKey(date, muscle) {
  return `stable_completed_${formatDateKey(date)}_${completionScope(date, muscle)}`;
}

function getCompletedIDs(date, muscle) {
  return readJSON(completionStorageKey(date, muscle), []);
}

function saveCompletedIDs(date, muscle, completedIDs) {
  localStorage.setItem(
    completionStorageKey(date, muscle),
    JSON.stringify(completedIDs),
  );
  saveCompletedIDsToAPI(date, muscle, completedIDs);
}

function hasActivity(date) {
  const scheduledPlan = getScheduledPlan(date);
  if (scheduledPlan && scheduledPlan.type === "workout") return true;

  return Object.keys(defaultExerciseData).some(
    (muscle) => getCompletedIDs(date, muscle).length > 0,
  );
}

function formatExerciseTarget(exercise) {
  const unit = exercise.unit ? ` ${exercise.unit}` : "";
  return `${exercise.sets}x${exercise.reps}${unit}`;
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function renderExercises() {
  const list = document.getElementById("exerciseList");
  const scheduledPlan = getScheduledPlan(selectedDate);
  const exercises = getExercises(selectedDate, selectedMuscle);
  const completedIDs = getCompletedIDs(selectedDate, selectedMuscle);

  list.innerHTML = "";

  if (scheduledPlan?.type === "rest") {
    list.innerHTML = `
      <div class="empty-exercise rest-day">
        <strong>${escapeHTML(scheduledPlan.title || "Rest Day")}</strong>
        <span>Hari ini dijadwalkan untuk recovery. Tidak ada exercise yang perlu dicentang.</span>
      </div>
    `;
    updateProgress(0, 0);
    return;
  }

  if (!exercises.length) {
    list.innerHTML = `
      <p class="empty-exercise">
        ${
          scheduledPlan
            ? `Belum ada exercise pada ${escapeHTML(scheduledPlan.title)}.`
            : `Belum ada latihan ${escapeHTML(normalizeMuscle(selectedMuscle))}
        pada workout tanggal ini.`
        }
      </p>
    `;
    updateProgress(0, 0);
    return;
  }

  exercises.forEach((exercise) => {
    const isDone = completedIDs.includes(exercise.id);
    const item = document.createElement("button");
    item.type = "button";
    item.className = `exercise-item${isDone ? " done" : ""}`;
    item.innerHTML = `
      <span class="exercise-check">
        ${
          isDone
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
            : ""
        }
      </span>
      <span class="exercise-name">${escapeHTML(exercise.name)}</span>
      <span class="exercise-reps">${escapeHTML(formatExerciseTarget(exercise))}</span>
    `;

    item.addEventListener("click", () => {
      const nextCompletedIDs = getCompletedIDs(selectedDate, selectedMuscle);
      const completedIndex = nextCompletedIDs.indexOf(exercise.id);

      if (completedIndex === -1) {
        nextCompletedIDs.push(exercise.id);
      } else {
        nextCompletedIDs.splice(completedIndex, 1);
      }

      saveCompletedIDs(selectedDate, selectedMuscle, nextCompletedIDs);
      renderExercises();
      renderCalendar();
    });

    list.appendChild(item);
  });

  updateProgress(completedIDs.length, exercises.length);
}

function updateProgress(done, total) {
  const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById("progressText").textContent =
    `${done} / ${total} selesai`;
  document.getElementById("progressPct").textContent = `${percentage}%`;
  document.getElementById("progressFill").style.width = `${percentage}%`;
}

document.querySelectorAll(".activity-filter .filter-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document
      .querySelectorAll(".activity-filter .filter-chip")
      .forEach((item) => item.classList.remove("active"));

    chip.classList.add("active");
    selectedMuscle = normalizeMuscle(chip.dataset.muscle);
    renderExercises();
    loadCompletedIDsFromAPI(selectedDate, selectedMuscle);
  });
});

function renderCalendar() {
  const container = document.getElementById("calendarDates");
  container.innerHTML = "";

  const today = startOfDay(new Date());
  const start = new Date(today);
  const end = new Date(today);
  start.setDate(today.getDate() - 30);
  end.setDate(today.getDate() + 14);

  let scrollTarget = null;

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const currentDate = new Date(date);
    const isToday = currentDate.toDateString() === today.toDateString();
    const isSelected = currentDate.toDateString() === selectedDate.toDateString();
    const isFuture = currentDate > today;
    const hasCompletedActivity = !isFuture && hasActivity(currentDate);

    const item = document.createElement("button");
    item.type = "button";
    item.className = [
      "cal-day",
      isToday ? "today" : "",
      isSelected ? "selected" : "",
      isFuture ? "future" : "",
      hasCompletedActivity ? "has-activity" : "",
    ]
      .filter(Boolean)
      .join(" ");
    item.innerHTML = `
      <span class="cal-day-name">${DAYS[currentDate.getDay()]}</span>
      <span class="cal-day-num">${currentDate.getDate()}</span>
    `;

    item.addEventListener("click", () => {
      selectedDate = startOfDay(currentDate);
      updateDateLabel();
      renderCalendar();
      renderExercises();
      loadCompletedIDsFromAPI(selectedDate, selectedMuscle);
    });

    container.appendChild(item);
    if (isToday) scrollTarget = item;
  }

  if (scrollTarget && !container.dataset.scrolled) {
    container.dataset.scrolled = "1";
    window.setTimeout(() => {
      scrollTarget.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }, 100);
  }
}

function updateDateLabel() {
  const today = startOfDay(new Date());
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

const PRESETS = {
  workout: [
    { label: "1 min", seconds: 60 },
    { label: "3 min", seconds: 180 },
    { label: "5 min", seconds: 300 },
    { label: "10 min", seconds: 600 },
  ],
  rest: [
    { label: "30 det", seconds: 30 },
    { label: "1 min", seconds: 60 },
    { label: "90 det", seconds: 90 },
    { label: "2 min", seconds: 120 },
  ],
};

let timerMode = "workout";
let timerSeconds = 0;
let timerRunning = false;
let timerInterval = null;

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60,
  ).padStart(2, "0")}`;
}

function renderPresets() {
  const container = document.getElementById("timerPresets");
  container.innerHTML = "";

  PRESETS[timerMode].forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-btn";
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".preset-btn")
        .forEach((item) => item.classList.remove("active-preset"));
      button.classList.add("active-preset");
      setTimer(preset.seconds);
    });
    container.appendChild(button);
  });
}

function setTimer(seconds) {
  stopTimer();
  timerSeconds = seconds;
  document.getElementById("timerDisplay").textContent = formatTime(seconds);
}

function stopTimer() {
  window.clearInterval(timerInterval);
  timerRunning = false;
  document.getElementById("startTimerBtn").textContent = "START";
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  document.getElementById("timerDisplay").textContent = "00:00";
  document
    .querySelectorAll(".preset-btn")
    .forEach((item) => item.classList.remove("active-preset"));
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
    return;
  }

  timerRunning = true;
  document.getElementById("startTimerBtn").textContent = "PAUSE";
  timerInterval = window.setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds -= 1;
      document.getElementById("timerDisplay").textContent =
        formatTime(timerSeconds);
      return;
    }

    stopTimer();
    document.getElementById("timerDisplay").textContent = "00:00";
  }, 1000);
});

document.getElementById("resetTimerBtn")?.addEventListener("click", resetTimer);

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

function displayUser(user) {
  if (!user) return;

  const fullName =
    user.username || user.Username || user.name || user.Name || "Guest";
  const greetingElement = document.getElementById("userGreeting");
  const welcomeElement = document.getElementById("welcomeName");

  if (greetingElement) greetingElement.textContent = fullName;
  if (welcomeElement) welcomeElement.textContent = `Hello, ${fullName}`;
}

function loadLocalUser() {
  const user = readJSON("stableUser", null);
  displayUser(user);
}

async function fetchUser() {
  const token = getToken();
  if (!token) return;

  const payload = parseJwt(token);
  const userID = payload?.id || payload?.user_id || payload?.sub || payload?.ID;
  if (!userID) return;

  try {
    const response = await fetch(`${API_BASE}/users/${userID}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;

    const result = await response.json();
    const user = result.data || result;
    const normalizedUser = {
      id: user.id || user.ID || userID,
      name: user.username || user.Username || user.name || user.Name || "Guest",
      email: user.email || user.Email || "",
    };

    localStorage.setItem("stableUser", JSON.stringify(normalizedUser));
    displayUser(normalizedUser);
  } catch (error) {
    console.error("fetchUser error:", error);
  }
}

function getCurrentUserID() {
  const token = getToken();
  const payload = token ? parseJwt(token) : null;
  const storedUser = readJSON("stableUser", null);

  return (
    payload?.id ||
    payload?.user_id ||
    payload?.sub ||
    payload?.ID ||
    storedUser?.id ||
    storedUser?.ID ||
    storedUser?.user_id ||
    null
  );
}

function getAPIHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeAPISchedule(schedule) {
  const result = {};
  Object.entries(schedule || {}).forEach(([dayKey, plan]) => {
    const dayIndex = Number(plan.day_index ?? plan.dayIndex ?? dayKey);
    if (Number.isNaN(dayIndex)) return;

    result[String(dayIndex)] = {
      type: plan.type === "rest" ? "rest" : "workout",
      title: plan.title || (plan.type === "rest" ? "Rest Day" : "Workout Day"),
      muscle: normalizeMuscle(plan.muscle),
      autoRest: Boolean(plan.auto_rest ?? plan.autoRest),
      sourceDay: plan.source_day ?? plan.sourceDay ?? null,
      exercises: normalizeExerciseList(plan.exercises),
    };
  });

  return result;
}

async function loadWorkoutScheduleFromAPI() {
  const userID = getCurrentUserID();
  if (!userID) return;

  try {
    const response = await fetch(
      `${API_BASE}/workout-schedule/week?user_id=${encodeURIComponent(userID)}`,
      { headers: getAPIHeaders() },
    );
    if (!response.ok) return;

    const result = await response.json();
    const schedule = result.data?.schedule || result.schedule || {};
    localStorage.setItem(
      WEEKLY_SCHEDULE_KEY,
      JSON.stringify(normalizeAPISchedule(schedule)),
    );

    renderCalendar();
    renderExercises();
    loadCompletedIDsFromAPI(selectedDate, selectedMuscle);
  } catch (error) {
    console.warn("loadWorkoutScheduleFromAPI fallback to localStorage:", error);
  }
}

async function loadCompletedIDsFromAPI(date, muscle) {
  const userID = getCurrentUserID();
  if (!userID) return;

  const dateKey = formatDateKey(date);
  const scope = completionScope(date, muscle);

  try {
    const response = await fetch(
      `${API_BASE}/workout-progress?user_id=${encodeURIComponent(userID)}&date=${encodeURIComponent(dateKey)}&scope=${encodeURIComponent(scope)}`,
      { headers: getAPIHeaders() },
    );
    if (!response.ok) return;

    const result = await response.json();
    const completedIDs =
      result.data?.completed_ids ||
      result.completed_ids ||
      result.data?.completedIDs ||
      [];

    localStorage.setItem(
      completionStorageKey(date, muscle),
      JSON.stringify(completedIDs),
    );
    renderExercises();
  } catch (error) {
    console.warn("loadCompletedIDsFromAPI fallback to localStorage:", error);
  }
}

async function saveCompletedIDsToAPI(date, muscle, completedIDs) {
  const userID = getCurrentUserID();
  if (!userID) return;

  try {
    const response = await fetch(`${API_BASE}/workout-progress`, {
      method: "PUT",
      headers: getAPIHeaders(),
      body: JSON.stringify({
        user_id: Number(userID),
        date: formatDateKey(date),
        scope: completionScope(date, muscle),
        completed_ids: completedIDs,
      }),
    });

    if (!response.ok) {
      throw new Error("failed to save workout progress");
    }
  } catch (error) {
    console.warn("saveCompletedIDsToAPI fallback to localStorage:", error);
  }
}

function getDailyChallengeContainer() {
  return (
    document.getElementById("dailyChallengeBody") ||
    document.getElementById("dailyChallenge") ||
    document.querySelector(".daily-challenge-body") ||
    document.querySelector(".card--challenge .card-body") ||
    document.querySelector(".daily-challenge-content")
  );
}

function renderDailyChallengeLoading() {
  const container = getDailyChallengeContainer();
  if (!container) return;

  container.innerHTML = `
    <p class="daily-challenge-empty">Memuat tantangan harian...</p>
  `;
}

function renderDailyChallengeError(message) {
  const container = getDailyChallengeContainer();
  if (!container) return;

  container.innerHTML = `
    <p class="daily-challenge-empty">${escapeHTML(message)}</p>
  `;
}

function getStreakCurrentValue(source) {
  const streak =
    source?.streak ||
    source?.Streak ||
    source?.user_streak ||
    source?.userStreak ||
    {};

  const value =
    streak.current ??
    streak.Current ??
    streak.current_streak ??
    streak.currentStreak ??
    source?.current_streak ??
    source?.currentStreak;

  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function updateStreakDisplay(source) {
  const streakValue = getStreakCurrentValue(source);
  if (streakValue === null) return;

  const streakElement =
    document.getElementById("streakValue") ||
    document.getElementById("currentStreak") ||
    document.querySelector("[data-streak-value]");

  if (streakElement) {
    streakElement.textContent = streakValue;
  }
}

function renderDailyChallenge(challenge) {
  const container = getDailyChallengeContainer();
  if (!container) return;

  updateStreakDisplay(challenge);

  const isCompleted = Boolean(challenge.completed || challenge.is_completed);
  const item = challenge.challenge || challenge.daily_challenge || challenge;

  const exerciseName =
    item.exercise ||
    item.Exercise ||
    item.exercise_name ||
    item.exerciseName ||
    item.name ||
    item.Name ||
    "Daily Challenge";
  const targetReps =
    item.target_reps ||
    item.TargetReps ||
    item.target_repetitions ||
    item.targetRepetitions ||
    item.repetitions ||
    item.Repetitions ||
    10;
  const description =
    item.instruction ||
    item.Instruction ||
    item.description ||
    item.Description ||
    `Selesaikan ${targetReps} repetisi hari ini.`;

  container.innerHTML = `
    <div class="daily-challenge-card ${isCompleted ? "completed" : ""}">
      <div class="daily-challenge-main">
        <span class="daily-challenge-label">TODAY</span>
        <h3>${escapeHTML(exerciseName)}</h3>
        <p>${escapeHTML(description)}</p>
      </div>

      <div class="daily-challenge-meta">
        <span>${escapeHTML(targetReps)} reps</span>
      </div>

      <button
        type="button"
        class="daily-challenge-btn"
        id="completeDailyChallengeBtn"
        ${isCompleted ? "disabled" : ""}
      >
        ${isCompleted ? "Sudah selesai hari ini" : "Selesaikan Challenge"}
      </button>
    </div>
  `;

  document
    .getElementById("completeDailyChallengeBtn")
    ?.addEventListener("click", () => completeDailyChallenge(targetReps));
}

async function loadDailyChallenge() {
  const userID = getCurrentUserID();
  if (!userID) {
    renderDailyChallengeError("Login diperlukan untuk melihat tantangan harian.");
    return;
  }

  renderDailyChallengeLoading();

  try {
    const response = await fetch(
      `${API_BASE}/daily-challenge/today?user_id=${encodeURIComponent(userID)}`,
      {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      },
    );

    if (!response.ok) {
      throw new Error("Tantangan harian belum tersedia.");
    }

    const result = await response.json();
    renderDailyChallenge(result.data || result);
  } catch (error) {
    console.error("loadDailyChallenge error:", error);
    renderDailyChallengeError("Belum ada tantangan hari ini.");
  }
}

async function completeDailyChallenge(repetitions) {
  const userID = getCurrentUserID();
  if (!userID) return;

  const button = document.getElementById("completeDailyChallengeBtn");
  if (button) {
    button.disabled = true;
    button.textContent = "Menyimpan...";
  }

  try {
    const response = await fetch(`${API_BASE}/daily-challenge/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      },
      body: JSON.stringify({
        user_id: Number(userID),
        repetitions: Number(repetitions) || 0,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || result.error || "Challenge gagal disimpan.");
    }

    const data = result.data || result;
    updateStreakDisplay(data);

    await loadDailyChallenge();
  } catch (error) {
    console.error("completeDailyChallenge error:", error);
    renderDailyChallengeError(error.message || "Challenge gagal disimpan.");
  }
}

document.addEventListener("keydown", (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    (event.key === "+" || event.key === "-" || event.key === "=")
  ) {
    event.preventDefault();
  }
});

document.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) event.preventDefault();
  },
  { passive: false },
);

document.getElementById("greetingLabel").textContent = getGreeting();
loadLocalUser();
updateDateLabel();
renderCalendar();
renderExercises();
renderPresets();
fetchUser();
loadDailyChallenge();
loadWorkoutScheduleFromAPI();
loadCompletedIDsFromAPI(selectedDate, selectedMuscle);

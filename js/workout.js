const FAVORITES_KEY = "stableFavoriteExercises";
const WORKOUTS_KEY = "stableWorkoutByDate";
const WEEKLY_SCHEDULE_KEY = "stableWeeklyWorkoutSchedule";

const DAY_OPTIONS = [
  { index: 1, short: "SEN", label: "Senin" },
  { index: 2, short: "SEL", label: "Selasa" },
  { index: 3, short: "RAB", label: "Rabu" },
  { index: 4, short: "KAM", label: "Kamis" },
  { index: 5, short: "JUM", label: "Jumat" },
  { index: 6, short: "SAB", label: "Sabtu" },
  { index: 0, short: "MIN", label: "Minggu" },
];

const exercises = [
  {
    id: "crunches",
    name: "Crunches",
    muscle: "Perut",
    equipment: "Bodyweight",
    difficulty: "Beginner",
    description: "Latihan dasar untuk mengaktifkan otot perut bagian atas.",
    sets: 3,
    reps: 20,
  },
  {
    id: "plank",
    name: "Plank",
    muscle: "Perut",
    equipment: "Bodyweight",
    difficulty: "Beginner",
    description: "Melatih stabilitas core dan menjaga kontrol tubuh.",
    sets: 3,
    reps: 45,
    unit: "detik",
  },
  {
    id: "leg-raise",
    name: "Leg Raise",
    muscle: "Perut",
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    description: "Fokus pada lower abs dengan gerakan kaki terkontrol.",
    sets: 3,
    reps: 15,
  },
  {
    id: "bicep-curl",
    name: "Bicep Curl",
    muscle: "Lengan",
    equipment: "Dumbbell",
    difficulty: "Beginner",
    description: "Gerakan isolasi untuk membangun kekuatan dan massa biceps.",
    sets: 3,
    reps: 12,
  },
  {
    id: "tricep-extension",
    name: "Tricep Extension",
    muscle: "Lengan",
    equipment: "Dumbbell",
    difficulty: "Beginner",
    description: "Melatih triceps dengan rentang gerak yang stabil.",
    sets: 3,
    reps: 12,
  },
  {
    id: "push-up",
    name: "Push Up",
    muscle: "Dada",
    equipment: "Bodyweight",
    difficulty: "Beginner",
    description: "Gerakan compound untuk dada, triceps, dan stabilitas core.",
    sets: 3,
    reps: 10,
  },
  {
    id: "bench-press",
    name: "Bench Press",
    muscle: "Dada",
    equipment: "Barbell",
    difficulty: "Intermediate",
    description: "Latihan utama untuk kekuatan dan perkembangan otot dada.",
    sets: 4,
    reps: 10,
  },
  {
    id: "bodyweight-squat",
    name: "Bodyweight Squat",
    muscle: "Kaki",
    equipment: "Bodyweight",
    difficulty: "Beginner",
    description: "Melatih pola squat, quadriceps, glutes, dan keseimbangan.",
    sets: 3,
    reps: 15,
  },
  {
    id: "reverse-lunge",
    name: "Reverse Lunge",
    muscle: "Kaki",
    equipment: "Bodyweight",
    difficulty: "Beginner",
    description: "Latihan unilateral untuk kaki, glutes, dan stabilitas pinggul.",
    sets: 3,
    reps: 12,
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    muscle: "Kaki",
    equipment: "Barbell",
    difficulty: "Intermediate",
    description: "Menguatkan hamstring, glutes, dan pola hip hinge.",
    sets: 4,
    reps: 10,
  },
  {
    id: "shoulder-press",
    name: "Shoulder Press",
    muscle: "Bahu & Punggung",
    equipment: "Dumbbell",
    difficulty: "Intermediate",
    description: "Gerakan press vertikal untuk bahu dan triceps.",
    sets: 3,
    reps: 12,
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscle: "Bahu & Punggung",
    equipment: "Cable",
    difficulty: "Beginner",
    description: "Melatih latissimus dan membangun kekuatan tarikan tubuh atas.",
    sets: 3,
    reps: 12,
  },
];

const exerciseSearch = document.getElementById("exerciseSearch");
const favoriteFilter = document.getElementById("favoriteFilter");
const muscleFilters = document.getElementById("muscleFilters");
const exerciseGrid = document.getElementById("exerciseGrid");
const selectedList = document.getElementById("selectedList");
const resultCount = document.getElementById("resultCount");
const favoriteCount = document.getElementById("favoriteCount");
const todayCount = document.getElementById("todayCount");
const summaryCount = document.getElementById("summaryCount");
const emptyState = document.getElementById("emptyState");
const saveWorkoutButton = document.getElementById("saveWorkoutBtn");
const clearScheduleButton = document.getElementById("clearScheduleBtn");
const saveStatus = document.getElementById("saveStatus");
const workoutDate = document.getElementById("workoutDate");
const toast = document.getElementById("toast");
const scheduleDays = document.getElementById("scheduleDays");
const scheduleWorkoutMode = document.getElementById("scheduleWorkoutMode");
const scheduleRestMode = document.getElementById("scheduleRestMode");
const scheduleTitle = document.getElementById("scheduleTitle");
const scheduleMuscle = document.getElementById("scheduleMuscle");

let selectedMuscle = "all";
let favoritesOnly = false;
let favorites = new Set(readJSON(FAVORITES_KEY, []));
let weeklySchedule = readJSON(WEEKLY_SCHEDULE_KEY, {});
let legacyWorkoutsByDate = readJSON(WORKOUTS_KEY, {});
let activeDay = new Date().getDay();
let activePlan = getPlan(activeDay);
let currentDateKey = getJakartaDateKey();
let toastTimer;

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch (error) {
    localStorage.removeItem(key);
    return fallback;
  }
}

function getJakartaDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getDayOption(dayIndex) {
  return DAY_OPTIONS.find((day) => day.index === Number(dayIndex)) || DAY_OPTIONS[0];
}

function getTodayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getScheduleDate(dayIndex) {
  const today = getTodayStart();
  const currentDay = today.getDay();
  const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const target = new Date(monday);
  const dayOffset = Number(dayIndex) === 0 ? 6 : Number(dayIndex) - 1;
  target.setDate(monday.getDate() + dayOffset);
  return target;
}

function isSameDate(firstDate, secondDate) {
  return firstDate.toDateString() === secondDate.toDateString();
}

function formatScheduleShortDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function formatScheduleFullDate(date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function normalizeMuscle(muscle) {
  if (muscle === "Bahu") return "Bahu & Punggung";
  return muscle || "Perut";
}

function normalizeExercise(exercise) {
  return {
    ...exercise,
    id: exercise.id || exercise.name.toLowerCase().replaceAll(" ", "-"),
    muscle: normalizeMuscle(exercise.muscle),
    sets: Number(exercise.sets) || 3,
    reps: Number(exercise.reps) || 10,
  };
}

function normalizePlan(plan) {
  const type = plan?.type === "rest" ? "rest" : "workout";
  const exercisesForPlan =
    type === "workout" && Array.isArray(plan?.exercises)
      ? plan.exercises.map(normalizeExercise)
      : [];

  return {
    type,
    title: plan?.title || (type === "rest" ? "Rest Day" : "Workout Day"),
    muscle: normalizeMuscle(plan?.muscle),
    exercises: exercisesForPlan,
    autoRest: Boolean(plan?.autoRest),
    sourceDay: plan?.sourceDay ?? null,
    updatedAt: plan?.updatedAt || null,
  };
}

function getPlan(dayIndex) {
  return normalizePlan(weeklySchedule[String(dayIndex)]);
}

function setPlan(dayIndex, plan) {
  weeklySchedule[String(dayIndex)] = normalizePlan(plan);
}

function escapeHTML(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

function refreshIcons() {
  if (window.feather) {
    feather.replace();
  }
}

function getVisibleExercises() {
  const query = exerciseSearch.value.trim().toLowerCase();

  return exercises.filter((exercise) => {
    const matchesQuery =
      exercise.name.toLowerCase().includes(query) ||
      exercise.muscle.toLowerCase().includes(query) ||
      exercise.equipment.toLowerCase().includes(query);
    const matchesMuscle =
      selectedMuscle === "all" || exercise.muscle === selectedMuscle;
    const matchesFavorite = !favoritesOnly || favorites.has(exercise.id);

    return matchesQuery && matchesMuscle && matchesFavorite;
  });
}

function syncTodayLegacyWorkout() {
  const today = new Date();
  if (Number(activeDay) !== today.getDay()) return;

  legacyWorkoutsByDate[getJakartaDateKey()] =
    activePlan.type === "workout" ? activePlan.exercises : [];
  localStorage.setItem(WORKOUTS_KEY, JSON.stringify(legacyWorkoutsByDate));
}

function persistSchedule() {
  setPlan(activeDay, activePlan);
  localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(weeklySchedule));
  syncTodayLegacyWorkout();
}

function getTodayScheduleCount() {
  const todayPlan = getPlan(new Date().getDay());
  if (todayPlan.type === "rest") return "Rest";
  return todayPlan.exercises.length;
}

function formatExerciseTarget(exercise) {
  const unit = exercise.unit ? ` ${exercise.unit}` : " reps";
  return `${exercise.sets} x ${exercise.reps}${unit}`;
}

function renderDayTabs() {
  scheduleDays.innerHTML = DAY_OPTIONS.map((day) => {
    const plan = getPlan(day.index);
    const isActive = Number(activeDay) === day.index;
    const scheduleDate = getScheduleDate(day.index);
    const isToday = isSameDate(scheduleDate, getTodayStart());
    const status =
      plan.type === "rest"
        ? "REST"
        : plan.exercises.length > 0
          ? `${plan.exercises.length} EX`
          : "-";

    return `
      <button
        class="schedule-day ${isActive ? "active" : ""} ${isToday ? "today" : ""} ${plan.type === "rest" ? "rest" : ""}"
        type="button"
        data-day="${day.index}"
      >
        <strong>${day.short}</strong>
        <span class="schedule-date">${escapeHTML(formatScheduleShortDate(scheduleDate))}</span>
        <span class="schedule-status">${status}</span>
      </button>
    `;
  }).join("");
}

function renderPlanControls() {
  const day = getDayOption(activeDay);
  const date = getScheduleDate(activeDay);
  workoutDate.textContent = isSameDate(date, getTodayStart())
    ? `Hari ini, ${formatScheduleFullDate(date)}`
    : formatScheduleFullDate(date);
  scheduleWorkoutMode.classList.toggle("active", activePlan.type === "workout");
  scheduleRestMode.classList.toggle("active", activePlan.type === "rest");
  scheduleTitle.value = activePlan.title;
  scheduleMuscle.value = activePlan.muscle;
  scheduleMuscle.disabled = activePlan.type === "rest";
}

function renderExercises() {
  const visibleExercises = getVisibleExercises();
  const selectedIDs = new Set(activePlan.exercises.map((item) => item.id));
  const day = getDayOption(activeDay);

  resultCount.textContent = `${visibleExercises.length} gerakan`;
  emptyState.hidden = visibleExercises.length > 0;
  exerciseGrid.hidden = visibleExercises.length === 0;

  exerciseGrid.innerHTML = visibleExercises
    .map((exercise) => {
      const isFavorite = favorites.has(exercise.id);
      const isAdded = selectedIDs.has(exercise.id);

      return `
        <article class="exercise-card" data-exercise-id="${exercise.id}">
          <div class="exercise-card-top">
            <span class="exercise-muscle">${escapeHTML(exercise.muscle)}</span>
            <button
              class="favorite-button${isFavorite ? " active" : ""}"
              type="button"
              data-action="favorite"
              aria-label="${isFavorite ? "Hapus dari" : "Tambahkan ke"} favorite"
            >
              <i data-feather="heart"></i>
            </button>
          </div>
          <h3>${escapeHTML(exercise.name)}</h3>
          <div class="exercise-details">
            <span>${escapeHTML(exercise.equipment)}</span>
            <span>${escapeHTML(exercise.difficulty)}</span>
            <span>${escapeHTML(formatExerciseTarget(exercise))}</span>
          </div>
          <p class="exercise-description">${escapeHTML(exercise.description)}</p>
          <button
            class="add-exercise${isAdded ? " added" : ""}"
            type="button"
            data-action="add"
            ${isAdded ? "disabled" : ""}
          >
            <i data-feather="${isAdded ? "check" : "plus"}"></i>
            ${isAdded ? "Added" : `Add to ${day.label}`}
          </button>
        </article>
      `;
    })
    .join("");

  favoriteCount.textContent = favorites.size;
  todayCount.textContent = getTodayScheduleCount();
  refreshIcons();
}

function renderWorkout() {
  summaryCount.textContent = activePlan.exercises.length;
  saveWorkoutButton.disabled =
    activePlan.type === "workout" && activePlan.exercises.length === 0;

  if (activePlan.type === "rest") {
    selectedList.innerHTML = `
      <div class="empty-queue rest">
        <i data-feather="moon"></i>
        <p><strong>Rest Day</strong>Hari ini dipakai untuk recovery. Dashboard akan menampilkan jadwal istirahat.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  if (!activePlan.exercises.length) {
    selectedList.innerHTML = `
      <div class="empty-queue">
        <i data-feather="clipboard"></i>
        <p>Pilih gerakan dari exercise library untuk jadwal ${escapeHTML(getDayOption(activeDay).label)}.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  selectedList.innerHTML = activePlan.exercises
    .map(
      (exercise) => `
        <article class="selected-exercise" data-exercise-id="${exercise.id}">
          <div class="selected-exercise-header">
            <h3>${escapeHTML(exercise.name)}</h3>
            <button
              class="remove-exercise"
              type="button"
              data-action="remove"
              aria-label="Hapus ${escapeHTML(exercise.name)}"
            >
              <i data-feather="trash-2"></i>
            </button>
          </div>
          <div class="set-reps">
            <label>
              Sets
              <input
                type="number"
                min="1"
                max="20"
                value="${exercise.sets}"
                data-field="sets"
              />
            </label>
            <label>
              ${exercise.unit ? "Seconds" : "Reps"}
              <input
                type="number"
                min="1"
                max="999"
                value="${exercise.reps}"
                data-field="reps"
              />
            </label>
          </div>
        </article>
      `,
    )
    .join("");

  refreshIcons();
}

function renderAll() {
  renderDayTabs();
  renderPlanControls();
  renderExercises();
  renderWorkout();
}

function toggleFavorite(exerciseID) {
  if (favorites.has(exerciseID)) {
    favorites.delete(exerciseID);
    showToast("Gerakan dihapus dari favorite.");
  } else {
    favorites.add(exerciseID);
    showToast("Gerakan ditambahkan ke favorite.");
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  renderExercises();
}

function addExercise(exerciseID) {
  if (activePlan.exercises.some((item) => item.id === exerciseID)) return;

  const exercise = exercises.find((item) => item.id === exerciseID);
  if (!exercise) return;

  activePlan.type = "workout";
  activePlan.muscle = normalizeMuscle(exercise.muscle);
  if (!activePlan.title || activePlan.title === "Rest Day") {
    activePlan.title = `${activePlan.muscle} Day`;
  }

  activePlan.exercises.push(normalizeExercise(exercise));
  persistSchedule();
  renderAll();
  showToast(`${exercise.name} ditambahkan ke ${getDayOption(activeDay).label}.`);
}

function removeExercise(exerciseID) {
  const exercise = activePlan.exercises.find((item) => item.id === exerciseID);
  activePlan.exercises = activePlan.exercises.filter(
    (item) => item.id !== exerciseID,
  );
  persistSchedule();
  renderAll();

  if (exercise) {
    showToast(`${exercise.name} dihapus dari jadwal.`);
  }
}

function updateExercise(exerciseID, field, value) {
  const exercise = activePlan.exercises.find((item) => item.id === exerciseID);
  const numericValue = Number(value);

  if (!exercise || !Number.isFinite(numericValue) || numericValue < 1) return;

  exercise[field] = numericValue;
  persistSchedule();
  saveStatus.textContent = "Changes saved automatically.";
}

function setScheduleMode(type) {
  activePlan.type = type;

  if (type === "rest") {
    activePlan.title = "Rest Day";
    activePlan.exercises = [];
  } else if (!activePlan.title || activePlan.title === "Rest Day") {
    activePlan.title = `${activePlan.muscle} Day`;
  }

  persistSchedule();
  renderAll();
}

function saveWeeklySchedule() {
  activePlan.title = scheduleTitle.value.trim() || activePlan.title;
  activePlan.muscle = normalizeMuscle(scheduleMuscle.value);
  activePlan.autoRest = false;
  activePlan.updatedAt = new Date().toISOString();
  setPlan(activeDay, activePlan);

  let message = `${getDayOption(activeDay).label} berhasil disimpan.`;

  if (activePlan.type === "workout") {
    const nextDay = (Number(activeDay) + 1) % 7;
    const nextPlan = weeklySchedule[String(nextDay)];

    if (!nextPlan || nextPlan.autoRest) {
      weeklySchedule[String(nextDay)] = {
        type: "rest",
        title: "Rest Day",
        muscle: "Perut",
        exercises: [],
        autoRest: true,
        sourceDay: Number(activeDay),
        updatedAt: new Date().toISOString(),
      };
      message += ` ${getDayOption(nextDay).label} otomatis menjadi Rest Day.`;
    }
  }

  localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(weeklySchedule));
  syncTodayLegacyWorkout();
  saveStatus.textContent = message;
  showToast(message);
  renderAll();
}

function clearSelectedDay() {
  activePlan = {
    type: "workout",
    title: "Workout Day",
    muscle: "Perut",
    exercises: [],
    autoRest: false,
    sourceDay: null,
    updatedAt: new Date().toISOString(),
  };
  setPlan(activeDay, activePlan);
  localStorage.setItem(WEEKLY_SCHEDULE_KEY, JSON.stringify(weeklySchedule));
  syncTodayLegacyWorkout();
  saveStatus.textContent = `${getDayOption(activeDay).label} dikosongkan.`;
  renderAll();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("show");

  toastTimer = window.setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

exerciseSearch.addEventListener("input", renderExercises);

favoriteFilter.addEventListener("click", () => {
  favoritesOnly = !favoritesOnly;
  favoriteFilter.classList.toggle("active", favoritesOnly);
  renderExercises();
});

muscleFilters.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-button");
  if (!button) return;

  selectedMuscle = button.dataset.muscle;
  muscleFilters
    .querySelectorAll(".filter-button")
    .forEach((item) => item.classList.toggle("active", item === button));
  renderExercises();
});

scheduleDays.addEventListener("click", (event) => {
  const button = event.target.closest(".schedule-day");
  if (!button) return;

  activeDay = Number(button.dataset.day);
  activePlan = getPlan(activeDay);
  saveStatus.textContent = "";
  renderAll();
});

scheduleWorkoutMode.addEventListener("click", () => setScheduleMode("workout"));
scheduleRestMode.addEventListener("click", () => setScheduleMode("rest"));

scheduleTitle.addEventListener("input", () => {
  activePlan.title = scheduleTitle.value.trim();
  persistSchedule();
});

scheduleMuscle.addEventListener("change", () => {
  activePlan.muscle = normalizeMuscle(scheduleMuscle.value);
  persistSchedule();
});

exerciseGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const card = event.target.closest(".exercise-card");
  if (!button || !card) return;

  if (button.dataset.action === "favorite") {
    toggleFavorite(card.dataset.exerciseId);
  }

  if (button.dataset.action === "add") {
    addExercise(card.dataset.exerciseId);
  }
});

selectedList.addEventListener("click", (event) => {
  const removeButton = event.target.closest('[data-action="remove"]');
  const card = event.target.closest(".selected-exercise");
  if (removeButton && card) {
    removeExercise(card.dataset.exerciseId);
  }
});

selectedList.addEventListener("change", (event) => {
  const input = event.target.closest("input[data-field]");
  const card = event.target.closest(".selected-exercise");
  if (input && card) {
    updateExercise(card.dataset.exerciseId, input.dataset.field, input.value);
  }
});

saveWorkoutButton.addEventListener("click", saveWeeklySchedule);
clearScheduleButton.addEventListener("click", clearSelectedDay);

window.setInterval(() => {
  const nextDateKey = getJakartaDateKey();
  if (nextDateKey === currentDateKey) return;

  currentDateKey = nextDateKey;
  activeDay = new Date().getDay();
  activePlan = getPlan(activeDay);
  renderAll();
}, 60 * 1000);

renderAll();
refreshIcons();

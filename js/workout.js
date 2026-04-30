// Data latihan database
const exerciseDatabase = {
    Back: [
        "Pull Up", "Chin Up", "Lat Pulldown", "Wide Grip Pulldown",
        "Seated Row", "Cable Row", "Bent Over Row", "T-Bar Row",
        "Deadlift", "Rack Pull", "Back Extension", "Superman Hold",
        "Single Arm Dumbbell Row", "Inverted Row"
    ],

    Bicep: [
        "Barbell Curl", "EZ Bar Curl", "Dumbbell Curl", "Alternating Curl",
        "Hammer Curl", "Incline Dumbbell Curl", "Preacher Curl",
        "Cable Curl", "Concentration Curl", "Spider Curl", "Zottman Curl"
    ],

    Tricep: [
        "Tricep Dip", "Bench Dip", "Tricep Pushdown", "Rope Pushdown",
        "Skull Crusher", "Overhead Extension", "Cable Overhead Extension",
        "Close Grip Bench Press", "Diamond Push Up", "Kickback"
    ],

    Chest: [
        "Bench Press", "Incline Bench Press", "Decline Bench Press",
        "Dumbbell Press", "Incline Dumbbell Press", "Chest Fly",
        "Cable Fly", "Push Up", "Wide Push Up", "Chest Dip",
        "Machine Chest Press", "Pec Deck"
    ],

    Shoulder: [
        "Military Press", "Overhead Press", "Arnold Press",
        "Lateral Raise", "Cable Lateral Raise", "Front Raise",
        "Rear Delt Fly", "Face Pull", "Upright Row",
        "Shrug", "Dumbbell Shoulder Press"
    ],

    Abs: [
        "Crunches", "Sit Up", "Leg Raise", "Hanging Leg Raise",
        "Plank", "Side Plank", "Russian Twist", "Mountain Climber",
        "V-Up", "Bicycle Crunch", "Toe Touch", "Flutter Kick"
    ],

    Leg: [
        "Squat", "Front Squat", "Hack Squat",
        "Leg Press", "Lunge", "Walking Lunge",
        "Bulgarian Split Squat", "Step Up",
        "Leg Curl", "Leg Extension",
        "Calf Raise", "Seated Calf Raise",
        "Romanian Deadlift", "Stiff Leg Deadlift",
        "Glute Bridge", "Hip Thrust",
        "Box Jump", "Jump Squat"
    ]
};

const bodyPartsList = ["Back", "Bicep", "Tricep", "Chest", "Shoulder", "Abs", "Leg"];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

let workoutPlans = JSON.parse(localStorage.getItem('workoutPlans')) || [];
let currentEditDay = null;
let currentSelectedParts = [];
let currentSelectedExercises = [];
let currentExerciseDetails = [];

// Inisialisasi hari ini
function initWorkoutPlans() {
    daysOfWeek.forEach(day => {
        if (!workoutPlans.find(p => p.day === day)) {
            workoutPlans.push({ day, bodyParts: [], exercises: [], sectionName: "" });
        }
    });
}
initWorkoutPlans();

// Simpan ke localStorage
function saveWorkoutPlans() {
    localStorage.setItem('workoutPlans', JSON.stringify(workoutPlans));
}

// Render grid hari
function renderDaysGrid() {
    const container = document.getElementById('daysGrid');
    container.innerHTML = daysOfWeek.map(day => {
        const plan = workoutPlans.find(p => p.day === day);
        const hasWorkout = plan && plan.exercises && plan.exercises.length > 0;
        
        let previewHtml = '';
        if (hasWorkout) {
            previewHtml = `<div class="workout-preview">
                ${plan.exercises.slice(0, 2).map(ex => `<div class="preview-exercise">• ${ex.name}</div>`).join('')}
                ${plan.exercises.length > 2 ? `<div class="preview-exercise">+${plan.exercises.length - 2} more</div>` : ''}
            </div>`;
        } else {
            previewHtml = `<div class="empty-workout">No exercises planned</div>`;
        }
        
        return `
            <div class="day-card ${hasWorkout ? 'has-workout' : ''}" data-day="${day}">
                <div class="day-name">${day}</div>
                <div class="day-status">${hasWorkout ? `${plan.exercises.length} exercises` : 'Empty'}</div>
                ${previewHtml}
                <div class="edit-icon">✎ Edit</div>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.day-card').forEach(card => {
        card.addEventListener('click', () => openEditModal(card.dataset.day));
    });
}

// Buka modal edit
function openEditModal(day) {
    currentEditDay = day;
    const plan = workoutPlans.find(p => p.day === day);
    
    currentSelectedParts = plan?.bodyParts ? [...plan.bodyParts] : [];
    currentSelectedExercises = plan?.exercises ? plan.exercises.map(e => e.name) : [];
    currentExerciseDetails = plan?.exercises ? [...plan.exercises] : [];
    
    document.getElementById('editDayName').value = day;
    renderBodyPartsGrid();
    renderExercisesList();
    renderSetRepsContainer();
    
    const modal = document.getElementById('editModal');
    modal.classList.add('active');
}

// Render body parts grid
function renderBodyPartsGrid() {
    const container = document.getElementById('bodyPartsGrid');
    container.innerHTML = bodyPartsList.map(part => `
        <div class="body-part-chip ${currentSelectedParts.includes(part) ? 'selected' : ''}" data-part="${part}">
            <span>${part}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.body-part-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const part = chip.dataset.part;
            if (currentSelectedParts.includes(part)) {
                currentSelectedParts = currentSelectedParts.filter(p => p !== part);
                chip.classList.remove('selected');
            } else {
                currentSelectedParts.push(part);
                chip.classList.add('selected');
            }
            renderExercisesList();
            renderSetRepsContainer();
        });
    });
}

// Render exercises list berdasarkan selected body parts
function renderExercisesList() {
    let allExercises = [];
    currentSelectedParts.forEach(part => {
        if (exerciseDatabase[part]) {
            allExercises = [...allExercises, ...exerciseDatabase[part]];
        }
    });
    allExercises = [...new Set(allExercises)]; // remove duplicates
    
    const searchValue = document.getElementById('exerciseSearch')?.value.toLowerCase() || '';
    const filtered = searchValue ? allExercises.filter(ex => ex.toLowerCase().includes(searchValue)) : allExercises;
    
    const container = document.getElementById('exercisesList');
    container.innerHTML = filtered.map(ex => `
        <div class="exercise-item ${currentSelectedExercises.includes(ex) ? 'selected' : ''}" data-exercise="${ex}">
            <input type="checkbox" ${currentSelectedExercises.includes(ex) ? 'checked' : ''}>
            <span class="exercise-name">${ex}</span>
        </div>
    `).join('');
    
    document.querySelectorAll('.exercise-item').forEach(item => {
        const checkbox = item.querySelector('input');
        const exerciseName = item.dataset.exercise;
        
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (!currentSelectedExercises.includes(exerciseName)) {
                    currentSelectedExercises.push(exerciseName);
                    currentExerciseDetails.push({ name: exerciseName, sets: 3, reps: 10 });
                }
                item.classList.add('selected');
            } else {
                currentSelectedExercises = currentSelectedExercises.filter(ex => ex !== exerciseName);
                currentExerciseDetails = currentExerciseDetails.filter(ex => ex.name !== exerciseName);
                item.classList.remove('selected');
            }
            renderSetRepsContainer();
        });
        
        item.addEventListener('click', (e) => {
            if (e.target.tagName !== 'INPUT') {
                checkbox.checked = !checkbox.checked;
                const event = new Event('change');
                checkbox.dispatchEvent(event);
            }
        });
    });
}

// Render set & reps container
function renderSetRepsContainer() {
    const container = document.getElementById('setRepsContainer');
    if (currentExerciseDetails.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#6a8a9a;">Select exercises to set sets and reps</div>';
        return;
    }
    
    container.innerHTML = currentExerciseDetails.map((ex, idx) => `
        <div class="exercise-detail-item" data-index="${idx}">
            <div class="exercise-detail-name">${ex.name}</div>
            <div class="exercise-detail-controls">
                <div class="set-control">
                    <button class="dec-set">-</button>
                    <span class="set-value">${ex.sets}</span>
                    <button class="inc-set">+</button>
                    <span style="margin-left:4px;">sets</span>
                </div>
                <div class="rep-control">
                    <button class="dec-rep">-</button>
                    <span class="rep-value">${ex.reps}</span>
                    <button class="inc-rep">+</button>
                    <span style="margin-left:4px;">reps</span>
                </div>
            </div>
        </div>
    `).join('');
    
    // Event listeners untuk set & reps
    container.querySelectorAll('.exercise-detail-item').forEach(item => {
        const idx = parseInt(item.dataset.index);
        item.querySelector('.dec-set')?.addEventListener('click', () => {
            if (currentExerciseDetails[idx].sets > 1) {
                currentExerciseDetails[idx].sets--;
                renderSetRepsContainer();
            }
        });
        item.querySelector('.inc-set')?.addEventListener('click', () => {
            currentExerciseDetails[idx].sets++;
            renderSetRepsContainer();
        });
        item.querySelector('.dec-rep')?.addEventListener('click', () => {
            if (currentExerciseDetails[idx].reps > 1) {
                currentExerciseDetails[idx].reps--;
                renderSetRepsContainer();
            }
        });
        item.querySelector('.inc-rep')?.addEventListener('click', () => {
            currentExerciseDetails[idx].reps++;
            renderSetRepsContainer();
        });
    });
}

// Save workout
function saveWorkout() {
    const index = workoutPlans.findIndex(p => p.day === currentEditDay);
    const sectionName = `${currentEditDay} Workout`;
    
    workoutPlans[index] = {
        day: currentEditDay,
        bodyParts: currentSelectedParts,
        exercises: currentExerciseDetails,
        sectionName: sectionName
    };
    
    saveWorkoutPlans();
    renderDaysGrid();
    closeModal();
}

// Close modal
function closeModal() {
    const modal = document.getElementById('editModal');
    modal.classList.remove('active');
    currentEditDay = null;
    currentSelectedParts = [];
    currentSelectedExercises = [];
    currentExerciseDetails = [];
    document.getElementById('exerciseSearch').value = '';
}

// Search event listener
document.getElementById('exerciseSearch')?.addEventListener('input', () => {
    renderExercisesList();
});

// Modal event listeners
document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
document.getElementById('cancelModalBtn')?.addEventListener('click', closeModal);
document.getElementById('saveWorkoutBtn')?.addEventListener('click', saveWorkout);

// Close modal on outside click
document.getElementById('editModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'editModal') closeModal();
});

// Update user greeting
function updateGreeting() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName') || 'Guest';
    const greetingSpan = document.getElementById('userGreeting');
    if (greetingSpan) {
        greetingSpan.innerText = isLoggedIn ? userName : 'Guest';
    }
}

// Inisialisasi
updateGreeting();
renderDaysGrid();
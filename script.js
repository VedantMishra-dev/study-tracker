// --- DOM Elements ---
const dateInput = document.getElementById('session-date');
const topicInput = document.getElementById('session-topic');
const typeInput = document.getElementById('session-type');
const goalInput = document.getElementById('session-goal');
const addBtn = document.getElementById('add-task-btn');
const queueList = document.getElementById('queue-list');
const timeDisplay = document.getElementById('current-time');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const saveBtn = document.getElementById('save-btn');
const logBody = document.getElementById('log-body');
const grandTotalDisplay = document.getElementById('total-time');
const editTimeBtn = document.getElementById('edit-time-btn');
const resetDayBtn = document.getElementById('reset-day-btn');
const analyticsBtn = document.getElementById('view-analytics-btn');

// --- State Variables ---
let tasks = [];
let activeTaskIndex = null;
let timerInterval = null;
let secondsElapsed = 0;
let completedSessions = [];
let charts = []; // Holds the graphs

dateInput.valueAsDate = new Date();

// --- INITIALIZATION ---
window.onload = () => {
    const savedQueue = localStorage.getItem('studyQueue');
    const savedHistory = localStorage.getItem('studyHistory');

    if (savedQueue) {
        tasks = JSON.parse(savedQueue);
        renderQueue();
    }

    if (savedHistory) {
        completedSessions = JSON.parse(savedHistory);
        updateGrandTotal();
        completedSessions.forEach(task => {
            addSessionToTable(task);
        });
        updateCharts(); // Auto-draw graphs when you open the website!
    }
};

// --- 1. Add Task to Queue ---
addBtn.addEventListener('click', () => {
    const topic = topicInput.value.trim();
    const type = typeInput.value;
    const goal = parseFloat(goalInput.value);

    if (!topic || isNaN(goal)) {
        alert("Please enter a subject and a valid goal in hours.");
        return;
    }

    const newTask = { date: dateInput.value, topic: topic, type: type, goal: goal, timeSpent: 0 };
    tasks.push(newTask);
    topicInput.value = '';

    if (tasks.length === 1) setActiveTask(0);
    else renderQueue();

    saveData();
});

// --- 2. Display the Queue ---
function renderQueue() {
    queueList.innerHTML = '';
    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = 'queue-item';
        if (index === activeTaskIndex) li.classList.add('active');

        li.innerHTML = `
            <span><strong>${task.topic}</strong> <small style="color:#94a3b8">(${task.type})</small> - ${task.goal} hrs</span>
            <div style="display:flex; align-items:center; gap:10px;">
                ${index === activeTaskIndex
                    ? `<span class="status-dot"></span>`
                    : `<button class="btn play-small" onclick="setActiveTask(${index})">▶ Focus</button>`
                }
                <button style="background:none; border:none; cursor:pointer; font-size:14px;" onclick="removeQueueItem(${index})" title="Remove">❌</button>
            </div>
        `;
        queueList.appendChild(li);
    });
}

window.removeQueueItem = function(index) {
    if (index === activeTaskIndex) {
        pauseTimer();
        activeTaskIndex = null;
        secondsElapsed = 0;
        updateTimeDisplay();
    } else if (activeTaskIndex !== null && index < activeTaskIndex) {
        activeTaskIndex--;
    }
    tasks.splice(index, 1);
    saveData();
    renderQueue();
};

// --- 3. Select Task ---
window.setActiveTask = function(index) {
    if (timerInterval) pauseTimer();
    activeTaskIndex = index;
    secondsElapsed = tasks[index].timeSpent;
    updateTimeDisplay();
    renderQueue();
};

// --- 4. Timer Logic ---
playBtn.addEventListener('click', () => {
    if (activeTaskIndex === null) {
        alert("Please add and select a subject from the queue first!");
        return;
    }
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        secondsElapsed++;
        tasks[activeTaskIndex].timeSpent = secondsElapsed;
        updateTimeDisplay();
        saveData();
    }, 1000);
});

pauseBtn.addEventListener('click', pauseTimer);

function pauseTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimeDisplay() {
    const hrs = Math.floor(secondsElapsed / 3600);
    const mins = Math.floor((secondsElapsed % 3600) / 60);
    const secs = secondsElapsed % 60;
    timeDisplay.textContent = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const progressBar = document.getElementById('current-progress');
    if (activeTaskIndex !== null) {
        const goalInSeconds = tasks[activeTaskIndex].goal * 3600;
        let percentage = (secondsElapsed / goalInSeconds) * 100;
        if (percentage > 100) percentage = 100;
        progressBar.style.width = `${percentage}%`;
    } else {
        progressBar.style.width = '0%';
    }
}

// --- 5. Complete and Log ---
saveBtn.addEventListener('click', () => {
    if (activeTaskIndex === null) {
        alert("No active session to save!");
        return;
    }
    pauseTimer();
    const task = tasks[activeTaskIndex];
    
    completedSessions.push({...task});
    addSessionToTable(task);
    
    tasks.splice(activeTaskIndex, 1);
    activeTaskIndex = null;
    secondsElapsed = 0;
    
    updateTimeDisplay();
    renderQueue();
    updateGrandTotal();
    saveData();
    
    // Auto-update charts!
    updateCharts();
});

function addSessionToTable(task) {
    const hrsStudied = task.timeSpent / 3600;
    let statusBadge = hrsStudied >= task.goal 
        ? '<span class="badge success">Goal Met</span>' 
        : '<span class="badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid #f59e0b">Partial</span>';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${task.date}</td><td>${task.topic} <br><small style="color:#94a3b8">${task.type}</small></td><td>${task.goal} hrs</td><td>${formatLogTime(task.timeSpent)}</td><td>${statusBadge}</td>`;
    logBody.appendChild(tr);
}

function formatLogTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
}

function updateGrandTotal() {
    let totalSecs = 0;
    completedSessions.forEach(session => totalSecs += session.timeSpent);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    grandTotalDisplay.textContent = `${hrs}h ${mins}m ${secs}s`;
}

function saveData() {
    localStorage.setItem('studyQueue', JSON.stringify(tasks));
    localStorage.setItem('studyHistory', JSON.stringify(completedSessions));
}

// --- 5.5 Edit & Reset ---
editTimeBtn.addEventListener('click', () => {
    if (activeTaskIndex === null) { alert("Please select a subject first!"); return; }
    const currentMins = Math.floor(secondsElapsed / 60);
    const userInput = prompt("Enter total time spent in MINUTES (e.g., 2.5 hours = 150):", currentMins);
    if (userInput !== null && !isNaN(userInput) && userInput >= 0) {
        secondsElapsed = Math.floor(userInput * 60);
        tasks[activeTaskIndex].timeSpent = secondsElapsed;
        updateTimeDisplay();
        saveData();
    }
});

resetDayBtn.addEventListener('click', () => {
    const targetDate = dateInput.value;
    if (confirm(`Delete all saved sessions for ${targetDate}?`)) {
        completedSessions = completedSessions.filter(session => session.date !== targetDate);
        saveData();
        updateGrandTotal();
        logBody.innerHTML = '';
        completedSessions.forEach(task => addSessionToTable(task));
        
        if (completedSessions.length === 0) {
            charts.forEach(chart => chart.destroy());
            charts = [];
        } else {
            updateCharts();
        }
    }
});

// --- 6. Data Analysis (Chart.js) ---
function updateCharts() {
    if (completedSessions.length === 0) return;

    const topicData = {};
    const typeData = {};
    const dailyData = {};

    completedSessions.forEach(session => {
        const hrs = session.timeSpent / 3600;
        topicData[session.topic] = (topicData[session.topic] || 0) + hrs;
        typeData[session.type] = (typeData[session.type] || 0) + hrs;
        dailyData[session.date] = (dailyData[session.date] || 0) + hrs;
    });

    charts.forEach(chart => chart.destroy());
    charts = [];

    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Poppins';

    // Chart 1
    const sortedDates = Object.keys(dailyData).sort();
    const dailyValues = sortedDates.map(date => dailyData[date]);
    const ctxDaily = document.getElementById('dailyChart').getContext('2d');
    charts.push(new Chart(ctxDaily, { type: 'bar', data: { labels: sortedDates, datasets: [{ label: 'Hours', data: dailyValues, backgroundColor: '#38bdf8', borderRadius: 4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } } }));

    // Chart 2
    const ctxSubject = document.getElementById('subjectChart').getContext('2d');
    charts.push(new Chart(ctxSubject, { type: 'doughnut', data: { labels: Object.keys(topicData), datasets: [{ data: Object.values(topicData), backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'], borderWidth: 0, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } }));

    // Chart 3
    const ctxType = document.getElementById('typeChart').getContext('2d');
    charts.push(new Chart(ctxType, { type: 'pie', data: { labels: Object.keys(typeData), datasets: [{ data: Object.values(typeData), backgroundColor: ['#ec4899', '#14b8a6', '#f43f5e'], borderWidth: 0, hoverOffset: 5 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } } }));
}

// Keep the button just in case you want to scroll down manually
analyticsBtn.addEventListener('click', () => {
    if (completedSessions.length === 0) { alert("Complete and log a session first!"); return; }
    updateCharts();
    document.getElementById('analytics-section').scrollIntoView({ behavior: 'smooth' });
});

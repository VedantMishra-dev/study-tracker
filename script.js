const editTimeBtn = document.getElementById('edit-time-btn');
const resetDayBtn = document.getElementById('reset-day-btn');
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
const grandTotalDisplay = document.getElementById('total-time'); // NEW: Total Time Header

// --- State Variables ---
let tasks = []; 
let activeTaskIndex = null; 
let timerInterval = null; 
let secondsElapsed = 0;
let completedSessions = [];

// Set today's date automatically in the input box
dateInput.valueAsDate = new Date();

// --- INITIALIZATION (Load Saved Data) ---
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
        
        // Rebuild the history table visually from memory
        completedSessions.forEach(task => {
            addSessionToTable(task);
        });
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

    const newTask = {
        date: dateInput.value,
        topic: topic,
        type: type,
        goal: goal,
        timeSpent: 0 
    };

    tasks.push(newTask);
    topicInput.value = ''; 
    
    if (tasks.length === 1) {
        setActiveTask(0); 
    } else {
        renderQueue();
    }
    
    saveData(); // Save to memory
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
            ${index === activeTaskIndex 
                ? `<span class="status-dot"></span>` 
                : `<button class="btn play-small" onclick="setActiveTask(${index})">▶ Focus</button>`
            }
        `;
        queueList.appendChild(li);
    });
}

// --- 3. Select a Task to Focus On ---
window.setActiveTask = function(index) {
    if (timerInterval) pauseTimer(); 
    
    activeTaskIndex = index;
    secondsElapsed = tasks[index].timeSpent; 
    updateTimeDisplay();
    renderQueue();
}

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
        saveData(); // Continuously save timer progress
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
    
    timeDisplay.textContent = 
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    // Update Progress Bar
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
    saveData(); // Save final state to memory
});

// Helper Function: Add a row to the visual table
function addSessionToTable(task) {
    const hrsStudied = task.timeSpent / 3600;
    let statusBadge = '';
    if (hrsStudied >= task.goal) {
        statusBadge = '<span class="badge success">Goal Met</span>';
    } else {
        statusBadge = '<span class="badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid #f59e0b">Partial</span>';
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${task.date}</td>
        <td>${task.topic} <br><small style="color:#94a3b8">${task.type}</small></td>
        <td>${task.goal} hrs</td>
        <td>${formatLogTime(task.timeSpent)}</td>
        <td>${statusBadge}</td>
    `;
    logBody.appendChild(tr);
}

// Helper Function: Format seconds into "1h 30m"
function formatLogTime(totalSeconds) {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
}

// Helper Function: Calculate Grand Total Time
function updateGrandTotal() {
    let totalSecs = 0;
    completedSessions.forEach(session => totalSecs += session.timeSpent);
    
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    
    grandTotalDisplay.textContent = `${hrs}h ${mins}m ${secs}s`;
}

// Helper Function: Save Everything to LocalStorage
function saveData() {
    localStorage.setItem('studyQueue', JSON.stringify(tasks));
    localStorage.setItem('studyHistory', JSON.stringify(completedSessions));
}

// --- 5.5 Manual Edit & Reset Logic ---

// Edit Time Button
editTimeBtn.addEventListener('click', () => {
    if (activeTaskIndex === null) {
        alert("Please add and select a subject from the queue first!");
        return;
    }
    
    // Ask the user for minutes (e.g., 2.5 hours = 150 minutes)
    const currentMins = Math.floor(secondsElapsed / 60);
    const userInput = prompt("Enter total time spent in MINUTES (e.g., for 2.5 hours enter 150):", currentMins);
    
    if (userInput !== null && !isNaN(userInput) && userInput >= 0) {
        secondsElapsed = Math.floor(userInput * 60);
        tasks[activeTaskIndex].timeSpent = secondsElapsed;
        updateTimeDisplay();
        saveData();
    }
});

// Clear Today's Data Button
resetDayBtn.addEventListener('click', () => {
    const targetDate = dateInput.value; // Gets the date currently selected in the top input
    
    if (confirm(`Are you sure you want to delete all saved sessions for ${targetDate}? This will remove them from your history and charts.`)) {
        
        // Filter out any sessions that match the chosen date
        completedSessions = completedSessions.filter(session => session.date !== targetDate);
        
        saveData(); // Update Local Storage
        updateGrandTotal(); // Fix the top header
        
        // Clear the visual table and redraw it
        logBody.innerHTML = '';
        completedSessions.forEach(task => addSessionToTable(task));
        
        // If the charts are currently open, click the analytics button silently to refresh them
        if (charts.length > 0) {
            analyticsBtn.click();
        }
        
        alert(`Data for ${targetDate} has been cleared.`);
    }
});

// --- 6. Data Analysis (Chart.js) ---
const analyticsBtn = document.getElementById('view-analytics-btn');
let charts = []; // Array to hold multiple charts so we can reset them

analyticsBtn.addEventListener('click', () => {
    if (completedSessions.length === 0) {
        alert("Complete and log at least one study session first!");
        return;
    }

    // --- DATA PROCESSING ---
    const topicData = {};
    const typeData = {};
    const dailyData = {};

    completedSessions.forEach(session => {
        const hrs = session.timeSpent / 3600; 
        
        // Group by Subject
        topicData[session.topic] = (topicData[session.topic] || 0) + hrs;
        
        // Group by Type (Class/Revision/Practice)
        typeData[session.type] = (typeData[session.type] || 0) + hrs;
        
        // Group by Date (for the Bar Chart)
        dailyData[session.date] = (dailyData[session.date] || 0) + hrs;
    });

    // Destroy old charts if they exist so they don't overlap
    charts.forEach(chart => chart.destroy());
    charts = []; 

    // Common text color for dark mode
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = 'Poppins';

    // --- CHART 1: Daily Progress (Bar Chart) ---
    // Sort dates chronologically so the graph flows left to right
    const sortedDates = Object.keys(dailyData).sort(); 
    const dailyValues = sortedDates.map(date => dailyData[date]);

    const ctxDaily = document.getElementById('dailyChart').getContext('2d');
    charts.push(new Chart(ctxDaily, {
        type: 'bar',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Hours Studied',
                data: dailyValues,
                backgroundColor: '#38bdf8',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    }));

    // --- CHART 2: Subject Breakdown (Doughnut Chart) ---
    const ctxSubject = document.getElementById('subjectChart').getContext('2d');
    charts.push(new Chart(ctxSubject, {
        type: 'doughnut',
        data: {
            labels: Object.keys(topicData),
            datasets: [{
                data: Object.values(topicData),
                backgroundColor: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    }));

    // --- CHART 3: Study Type Breakdown (Pie Chart) ---
    const ctxType = document.getElementById('typeChart').getContext('2d');
    charts.push(new Chart(ctxType, {
        type: 'pie',
        data: {
            labels: Object.keys(typeData),
            datasets: [{
                data: Object.values(typeData),
                backgroundColor: ['#ec4899', '#14b8a6', '#f43f5e'],
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    }));

    // Auto-scroll down
    document.getElementById('analytics-section').scrollIntoView({ behavior: 'smooth' });
});
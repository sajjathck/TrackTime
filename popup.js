const tabTimer = document.getElementById('tab-timer');
const tabStopwatch = document.getElementById('tab-stopwatch');
const tabTracker = document.getElementById('tab-tracker');
const viewTimer = document.getElementById('view-timer');
const viewStopwatch = document.getElementById('view-stopwatch');
const viewTracker = document.getElementById('view-tracker');
const trackerListContainer = document.getElementById('tracker-list-container');
const resetTrackerBtn = document.getElementById('reset-tracker-btn');


let currentActiveTab = 'timer';

tabTimer.addEventListener('click', () => switchTab('timer'));
tabStopwatch.addEventListener('click', () => switchTab('stopwatch'));
tabTracker.addEventListener('click', () => switchTab('tracker'));

function switchTab(newTab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view-section').forEach(view => view.classList.add('hidden'));

  let targetView;
  let targetTabBtn;

  switch (newTab) {
    case 'timer':
      targetView = viewTimer;
      targetTabBtn = tabTimer;
      break;
    case 'stopwatch':
      targetView = viewStopwatch;
      targetTabBtn = tabStopwatch;
      break;
    case 'tracker':
      targetView = viewTracker;
      targetTabBtn = tabTracker;
      renderTabTracker();
      break;
  }

  targetTabBtn.classList.add('active');
  targetView.classList.remove('hidden');
  
  currentActiveTab = newTab;
  chrome.storage.local.set({ activeTab: newTab });
}

const TRACKER_STORAGE_KEY = 'tabUsageTracker';


function formatSeconds(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  let output = '';
  if (hours > 0) output += `${hours}h `;
  if (minutes > 0) output += `${minutes}m `;
  output += `${seconds}s`;
  
  return output.trim();
}

function renderTabTracker() {
  chrome.storage.local.get([TRACKER_STORAGE_KEY], (data) => {
    const trackerData = data[TRACKER_STORAGE_KEY] || {};
    
    const sortedEntries = Object.entries(trackerData)
      .filter(([domain, time]) => time > 0)
      .sort((a, b) => b[1] - a[1]);

    trackerListContainer.innerHTML = '';

    if (sortedEntries.length === 0) {
      const statusText = "No usage data recorded yet. Start browsing!";
        
      trackerListContainer.innerHTML = `
        <p id="tracker-status" style="text-align: center; opacity: 0.8; margin-top: 20px; font-size: 14px;">
          ${statusText}
        </p>
      `;
      return;
    }

    const listHtml = sortedEntries.map(([domain, time]) => {
      const formattedTime = formatSeconds(time);
      return `
        <div class="tracker-item">
          <span class="domain-name" title="${domain}">${domain}</span>
          <span class="time-spent">${formattedTime}</span>
        </div>
      `;
    }).join('');

    trackerListContainer.innerHTML = listHtml;
  });
}

function clearAllTrackingData() {
  chrome.storage.local.remove(TRACKER_STORAGE_KEY, () => {
    renderTabTracker();
    trackerListContainer.innerHTML = `
        <p id="tracker-status" style="text-align: center; color: #34A853; font-weight: 600; margin-top: 20px; font-size: 14px;">
          Tracking data successfully cleared!
        </p>
    `;
    setTimeout(renderTabTracker, 2000);
  });
}


let tInterval;
let tRemaining = 25 * 60;
let tIsRunning = false;

const tDisplay = document.getElementById('timer-display');
const tStartBtn = document.getElementById('t-start-btn');
const tPauseBtn = document.getElementById('t-pause-btn');
const tResetBtn = document.getElementById('t-reset-btn');
const tPresetBtns = document.querySelectorAll('.preset-btn');

let swInterval;
let swStartTime = 0;
let swElapsedTime = 0;
let swIsRunning = false;

const swDisplay = document.getElementById('sw-display');
const swStartBtn = document.getElementById('sw-start-btn');
const swPauseBtn = document.getElementById('sw-pause-btn');
const swResetBtn = document.getElementById('sw-reset-btn');

document.addEventListener('DOMContentLoaded', () => {
  restoreState();

  tStartBtn.addEventListener('click', startTimer);
  tPauseBtn.addEventListener('click', pauseTimer);
  tResetBtn.addEventListener('click', resetTimer);
  tPresetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.getAttribute('data-time'));
      setTimer(minutes);
    });
  });

  swStartBtn.addEventListener('click', startStopwatch);
  swPauseBtn.addEventListener('click', pauseStopwatch);
  swResetBtn.addEventListener('click', resetStopwatch);
  
  resetTrackerBtn.addEventListener('click', clearAllTrackingData);
});

function updateTimerDisplay() {
  const minutes = Math.floor(tRemaining / 60);
  const seconds = tRemaining % 60;
  tDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startTimer() {
  if (tIsRunning) return;
  tIsRunning = true;
  toggleTimerButtons();
  
  const targetTime = Date.now() + (tRemaining * 1000);
  chrome.storage.local.set({ tIsRunning: true, tTargetTime: targetTime });
  runTimerInterval(targetTime);
}

function runTimerInterval(targetTime) {
  clearInterval(tInterval);
  tInterval = setInterval(() => {
    const now = Date.now();
    const diff = Math.ceil((targetTime - now) / 1000);

    if (diff <= 0) {
      clearInterval(tInterval);
      tRemaining = 0;
      tIsRunning = false;
      chrome.storage.local.set({ tIsRunning: false });
      toggleTimerButtons();
    } else {
      tRemaining = diff;
    }
    updateTimerDisplay();
  }, 1000);
}

function pauseTimer() {
  tIsRunning = false;
  clearInterval(tInterval);
  toggleTimerButtons();
  chrome.storage.local.set({ tIsRunning: false, tRemaining: tRemaining });
}

function resetTimer() {
  pauseTimer();
  tRemaining = 25 * 60;
  chrome.storage.local.remove(['tTargetTime', 'tIsRunning', 'tRemaining']);
  updateTimerDisplay();
}

function setTimer(minutes) {
  pauseTimer();
  tRemaining = minutes * 60;
  chrome.storage.local.remove(['tTargetTime', 'tIsRunning', 'tRemaining']);
  updateTimerDisplay();
}

function toggleTimerButtons() {
  if (tIsRunning) {
    tStartBtn.classList.add('hidden');
    tPauseBtn.classList.remove('hidden');
  } else {
    tStartBtn.classList.remove('hidden');
    tPauseBtn.classList.add('hidden');
  }
}

function updateStopwatchDisplay() {
  let time = swElapsedTime;
  if (swIsRunning) {
    time = Date.now() - swStartTime;
  }

  const totalSeconds = Math.floor(time / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((time % 1000) / 10);

  swDisplay.textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function startStopwatch() {
  if (swIsRunning) return;
  swIsRunning = true;
  swStartTime = Date.now() - swElapsedTime;
  
  toggleStopwatchButtons();
  chrome.storage.local.set({ swIsRunning: true, swStartTime: swStartTime });
  
  swInterval = setInterval(updateStopwatchDisplay, 30);
}

function pauseStopwatch() {
  if (!swIsRunning) return;
  swIsRunning = false;
  clearInterval(swInterval);
  
  swElapsedTime = Date.now() - swStartTime;
  
  toggleStopwatchButtons();
  chrome.storage.local.set({ swIsRunning: false, swElapsedTime: swElapsedTime });
  updateStopwatchDisplay();
}

function resetStopwatch() { 
  swIsRunning = false;
  clearInterval(swInterval);
  swElapsedTime = 0;
  swStartTime = 0;
  toggleStopwatchButtons();
  chrome.storage.local.remove(['swIsRunning', 'swStartTime', 'swElapsedTime']);
  updateStopwatchDisplay();
}

function toggleStopwatchButtons() {
  if (swIsRunning) {
    swStartBtn.classList.add('hidden');
    swPauseBtn.classList.remove('hidden');
  } else {
    swStartBtn.classList.remove('hidden');
    swPauseBtn.classList.add('hidden');
  }
}

function restoreState() {
  chrome.storage.local.get([
    'activeTab',
    'tIsRunning', 'tTargetTime', 'tRemaining',
    'swIsRunning', 'swStartTime', 'swElapsedTime'
  ], (result) => {
    
    if (result.activeTab) {
      switchTab(result.activeTab);
    } else {
        switchTab('timer');
    }

    if (result.tIsRunning && result.tTargetTime) {
      const now = Date.now();
      const diff = Math.ceil((result.tTargetTime - now) / 1000);
      if (diff > 0) {
        tIsRunning = true;
        tRemaining = diff;
        toggleTimerButtons();
        runTimerInterval(result.tTargetTime);
      } else {
        tRemaining = 0;
        tIsRunning = false;
        chrome.storage.local.set({ tIsRunning: false });
      }
    } else if (result.tRemaining) {
      tRemaining = result.tRemaining;
    }
    updateTimerDisplay();

    if (result.swIsRunning && result.swStartTime) {
      swIsRunning = true;
      swStartTime = result.swStartTime;
      toggleStopwatchButtons();
      swInterval = setInterval(updateStopwatchDisplay, 30);
    } else if (result.swElapsedTime) {
      swElapsedTime = result.swElapsedTime;
    }
    updateStopwatchDisplay();
    
    if (currentActiveTab === 'tracker') {
        renderTabTracker();
    }
  });
}
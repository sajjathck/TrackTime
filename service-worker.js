const TRACKER_STORAGE_KEY = 'tabUsageTracker';

let activeTabId = null;
let lastUpdateTime = Date.now();
const UPDATE_INTERVAL = 1000;

let isTracking = true;
let trackingInterval = null;


function initializeTracker() {
  chrome.storage.local.get([TRACKER_STORAGE_KEY], (data) => {
    if (!data[TRACKER_STORAGE_KEY]) {
      chrome.storage.local.set({ [TRACKER_STORAGE_KEY]: {} });
    }
    
    startTrackingInterval();
    getCurrentActiveTab();
  });
}

function startTrackingInterval() {
    if (!trackingInterval) {
        trackingInterval = setInterval(updateTrackingData, UPDATE_INTERVAL);
    }
}

function stopTrackingInterval() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
        activeTabId = null;
    }
}

function getCurrentActiveTab() {
  if (!isTracking) return;
    
  chrome.tabs.query({ active: true }, (tabs) => {
    if (tabs.length > 0) {
      handleTabActivation(tabs[0].id, tabs[0].url);
    }
  });
}

function updateTrackingData() {
  if (!isTracking) return;
    
  if (activeTabId !== null) {
    const now = Date.now();
    const duration = now - lastUpdateTime;
    lastUpdateTime = now;

    chrome.tabs.get(activeTabId, (tab) => {
      if (!isTracking || chrome.runtime.lastError || !tab) {
        activeTabId = null;
        return;
      }

      const domain = getDomainFromUrl(tab.url);
      if (domain) {
        chrome.storage.local.get(TRACKER_STORAGE_KEY, (data) => {
          const tracker = data[TRACKER_STORAGE_KEY] || {};
          
          if (tracker[domain] === undefined) {
            tracker[domain] = 0;
          }
          
          tracker[domain] += duration / 1000; 
          
          chrome.storage.local.set({ [TRACKER_STORAGE_KEY]: tracker });
        });
      }
    });
  }
}

function handleTabActivation(tabId, url) {
  if (!isTracking) return;
    
  if (activeTabId !== null) {
    updateTrackingData(); 
  }

  activeTabId = tabId;
  lastUpdateTime = Date.now();
}

function getDomainFromUrl(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:') {
      return null; 
    }
    return urlObj.hostname;
  } catch (e) {
    return null; 
  }
}

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!isTracking) return;
    
  chrome.tabs.get(activeInfo.tabId, (tab) => {
    if (tab && tab.url) {
      handleTabActivation(activeInfo.tabId, tab.url);
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!isTracking) return;
    
  if (tabId === activeTabId && changeInfo.url) {
    handleTabActivation(tabId, changeInfo.url);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    activeTabId = null;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === 'getTrackingStatus') {
        sendResponse({ isTracking: isTracking });
        return true;
    }
});


initializeTracker();
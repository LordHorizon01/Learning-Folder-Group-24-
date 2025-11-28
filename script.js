// Modal dialog system for user notifications and confirmations
const modalBackdrop = document.getElementById("modalBackdrop");
const modalMessage = document.getElementById("modalMessage");
const modalButtons = document.getElementById("modalButtons");

/**
 * Displays a simple OK message dialog
 * @param {string} message - Text to display
 * @returns {Promise<void>} Resolves when OK is clicked
 */
function showMessageBox(message) {
  return new Promise((resolve) => {
    modalMessage.textContent = message;
    modalButtons.innerHTML = '<button class="modal-btn btn-primary" id="modalOk">OK</button>';
    modalBackdrop.classList.add("show");

    document.getElementById("modalOk").onclick = () => {
      modalBackdrop.classList.remove("show");
      resolve();
    };
  });
}

/**
 * Displays confirmation dialog with custom buttons
 * @param {string} message - Confirmation text
 * @param {string} [confirmText="Confirm"] - Confirm button text
 * @param {string} [cancelText="Cancel"] - Cancel button text
 * @returns {Promise<boolean>} true if confirmed, false if cancelled
 */
function showConfirmBox(message, confirmText = "Confirm", cancelText = "Cancel") {
  return new Promise((resolve) => {
    modalMessage.textContent = message;
    modalButtons.innerHTML = `
      <button class="modal-btn btn-danger" id="modalConfirm">${confirmText}</button>
      <button class="modal-btn btn-secondary" id="modalCancel">${cancelText}</button>
    `;
    modalBackdrop.classList.add("show");

    document.getElementById("modalConfirm").onclick = () => {
      modalBackdrop.classList.remove("show");
      resolve(true);
    };
    document.getElementById("modalCancel").onclick = () => {
      modalBackdrop.classList.remove("show");
      resolve(false);
    };
  });
}

// IndexedDB database configuration and operations
const DB_NAME = "offline-player-db";
const STORE = "videos";
let db;

/**
 * Initializes IndexedDB database and creates video store
 * @returns {Promise<IDBDatabase>} Database connection
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore(STORE, { keyPath: "name" });
    };
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves video file/blob to IndexedDB
 * @param {File|Blob} file - Video file to store
 * @returns {Promise<void>}
 */
function putVideo(file) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.put({ name: file.name, blob: file, created: Date.now() });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Retrieves all stored videos from IndexedDB
 * @returns {Promise<Array>} Array of video records
 */
function getAllVideos() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Gets single video record by name
 * @param {string} name - Video name/key
 * @returns {Promise<Object|null>} Video record or null
 */
function getVideo(name) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const request = store.get(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes single video from IndexedDB
 * @param {string} name - Video name to delete
 * @returns {Promise<void>}
 */
function deleteVideo(name) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.delete(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clears all videos from IndexedDB
 * @returns {Promise<void>}
 */
function clearAll() {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// DOM element references for video player controls
const dragOverlay = document.getElementById("dragOverlay");
const playlistEl = document.getElementById("playlist");
const fileMain = document.getElementById("fileMain");
const fileMore = document.getElementById("fileMore");
const uploadMain = document.getElementById("uploadMain");
const uploadMore = document.getElementById("uploadMore");
const firstScreen = document.getElementById("firstScreen");
const playerWrap = document.getElementById("playerWrap");
const player = document.getElementById("player");
const controls = document.getElementById("controls");
const playBtn = document.getElementById("play");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const rewBtn = document.getElementById("rew");
const fwdBtn = document.getElementById("fwd");
const stopBtn = document.getElementById("stop");
const volEl = document.getElementById("vol");
const rateEl = document.getElementById("rate");
const progressEl = document.getElementById("progress");
const autoplayEl = document.getElementById("autoplay");
const loopEl = document.getElementById("loop");
const shuffleEl = document.getElementById("shuffle");
const clearAllBtn = document.getElementById("clearAll");
const pipBtn = document.getElementById("pip");
const fsBtn = document.getElementById("fs");
const volBtn = document.getElementById("volBtn");
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeLabel = document.getElementById("themeLabel");
const skipNotification = document.getElementById("skipNotification");
const playPauseOverlay = document.getElementById("playPauseOverlay");

/**
 * Updates play/pause overlay visibility and icon
 */
function updatePlayPauseOverlay() {
  if (player.paused) {
    playPauseOverlay.textContent = "▶";
    playPauseOverlay.classList.add("show");
  } else {
    playPauseOverlay.classList.remove("show");
  }
}

playPauseOverlay.addEventListener("click", () => {
  if (player.paused) {
    player.play();
    playBtn.textContent = "⏸";
  } else {
    player.pause();
    playBtn.textContent = "▶";
  }
  updatePlayPauseOverlay();
});

/**
 * Shows temporary skip notification (rewind/fast-forward feedback)
 * @param {string} text - Notification text
 * @param {number} [duration=800] - Display duration in ms
 */
function showSkipNotification(text, duration = 800) {
  skipNotification.textContent = text;
  skipNotification.classList.add("show");
  setTimeout(() => {
    skipNotification.classList.remove("show");
  }, duration);
}

// Application state management
let list = [];           // All stored videos
let order = [];          // Current playlist order
let current = -1;        // Index of currently playing video
let currentURL = null;   // Active blob URL for cleanup
let currentRate = Number(localStorage.getItem("rate")) || 1;

// Theme management with localStorage persistence
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "light") {
  document.body.classList.add("light");
  themeIcon.textContent = "☀️";
  themeLabel.textContent = "Light mode";
}

const savedLoop = localStorage.getItem("loop");
loopEl.checked = savedLoop === "true";

loopEl.onchange = () => {
  localStorage.setItem("loop", loopEl.checked);
};

/**
 * Toggles between light/dark theme and persists choice
 */
function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  if (isLight) {
    themeIcon.textContent = "☀️";
    themeLabel.textContent = "Light mode";
    localStorage.setItem("theme", "light");
  } else {
    themeIcon.textContent = "🌙";
    themeLabel.textContent = "Dark mode";
    localStorage.setItem("theme", "dark");
  }
}
themeToggle.addEventListener("click", toggleTheme);

// Application initialization
(async function init() {
  await openDB();
  await refreshList();

  // Restore user preferences
  const savedVol = localStorage.getItem("vol");
  volEl.value = savedVol !== null ? savedVol : 0.8;
  player.volume = Number(volEl.value);

  const savedRate = localStorage.getItem("rate");
  currentRate = savedRate ? Number(savedRate) : 1;
  player.playbackRate = currentRate;
  rateEl.value = String(currentRate);
})();

/**
 * Refreshes video playlist from IndexedDB and updates UI
 */
async function refreshList() {
  list = await getAllVideos();
  list.sort((a, b) => b.created - a.created);  // Newest first
  order = list.map((i) => i.name);
  renderPlaylist();
}

/**
 * Renders playlist items in sidebar with play/delete controls
 */
function renderPlaylist() {
  playlistEl.innerHTML = "";
  order.forEach((name) => {
    const row = document.createElement("div");
    row.className = "pl-item";
    if (name === order[current]) row.classList.add("playing");

    const span = document.createElement("div");
    span.className = "pl-name";
    span.textContent = name;

    const actions = document.createElement("div");
    actions.className = "pl-actions";

    // Play button
    const playBtnSmall = document.createElement("button");
    playBtnSmall.className = "icon-btn";
    playBtnSmall.title = "Play";
    playBtnSmall.textContent = "▶";
    playBtnSmall.onclick = (ev) => {
      ev.stopPropagation();
      playByName(name);
    };

    // Delete button
    const del = document.createElement("button");
    del.className = "icon-btn";
    del.title = "Delete";
    del.textContent = "🗑";
    del.onclick = async (ev) => {
      ev.stopPropagation();
      const confirmed = await showConfirmBox(`Are you sure you want to delete "${name}"?`);
      if (confirmed) {
        await deleteVideo(name);
        if (current >= 0 && order[current] === name) {
          stopAndClear();
        }
        await refreshList();
      }
    };

    actions.appendChild(playBtnSmall);
    actions.appendChild(del);
    row.appendChild(span);
    row.appendChild(actions);
    row.onclick = () => playByName(name);
    playlistEl.appendChild(row);
  });
}

/**
 * Plays video by name from playlist
 * @param {string} name - Video name to play
 */
async function playByName(name) {
  stopAndClear();

  firstScreen.style.display = "none";
  playerWrap.style.display = "flex";
  controls.style.display = "flex";

  current = order.indexOf(name);

  const rec = await getVideo(name);
  if (!rec) {
    await showMessageBox("Video not found in local storage.");
    return;
  }

  currentURL = URL.createObjectURL(rec.blob);
  player.classList.add("hide");
  player.src = currentURL;
  player.load();

  player.onloadedmetadata = () => {
    player.playbackRate = currentRate;
    rateEl.value = String(currentRate);

    // Restore saved playback position
    const saved = localStorage.getItem("pos_" + name);
    if (saved) player.currentTime = Number(saved);
    
    player.classList.remove("hide");
    player.play();
    playBtn.textContent = "⏸";
    updatePlayPauseOverlay();
    updatePlaylistHighlight();
  };

  player.onended = () => {
    if (loopEl.checked) {
      player.currentTime = 0;
      player.play();
    } else if (autoplayEl.checked) {
      playNext();
    }
  };

  const timeDisplay = document.getElementById("timeDisplay");

  player.ontimeupdate = () => {
    if (player.duration && !isNaN(player.duration)) {
      progressEl.max = player.duration;
      progressEl.value = player.currentTime;

      const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? "0" : ""}${s}`;
      };

      timeDisplay.textContent = `${formatTime(player.currentTime)} / ${formatTime(player.duration)}`;
    }
    if (current >= 0) {
      localStorage.setItem("pos_" + order[current], player.currentTime);
    }
  };
}

/**
 * Stops current video and cleans up blob URL
 */
function stopAndClear() {
  try {
    player.pause();
    player.removeAttribute("src");
    player.load();
    if (currentURL) {
      URL.revokeObjectURL(currentURL);
      currentURL = null;
    }
  } catch (e) {
    console.error("Error clearing video source:", e);
  }
}

/**
 * Plays next video in playlist (supports shuffle)
 */
function playNext() {
  if (order.length === 0) return;
  if (shuffleEl.checked) {
    let idx = current;
    if (order.length > 1) {
      while (idx === current) idx = Math.floor(Math.random() * order.length);
    } else idx = 0;
    current = idx;
  } else {
    current = (current + 1) % order.length;
  }
  playByName(order[current]);
}

/**
 * Plays previous video in playlist (supports shuffle)
 */
function playPrev() {
  if (order.length === 0) return;
  if (shuffleEl.checked) {
    let idx = current;
    if (order.length > 1) {
      while (idx === current) idx = Math.floor(Math.random() * order.length);
    } else idx = 0;
    current = idx;
  } else {
    current = (current - 1 + order.length) % order.length;
  }
  playByName(order[current]);
}

/**
 * Updates currently playing item highlight in playlist
 */
function updatePlaylistHighlight() {
  const items = Array.from(playlistEl.children);
  items.forEach((el, i) => {
    el.classList.toggle("playing", order[i] === order[current]);
  });
}

// Video player control event handlers
playBtn.onclick = () => {
  if (player.paused) {
    player.play();
    playBtn.textContent = "⏸";
  } else {
    player.pause();
    playBtn.textContent = "▶";
  }
  updatePlayPauseOverlay();
};

rewBtn.onclick = () => {
  const skipAmount = 10;
  player.currentTime = Math.max(0, player.currentTime - skipAmount);
  showSkipNotification(`- ${skipAmount}s`);
};

fwdBtn.onclick = () => {
  const skipAmount = 10;
  player.currentTime = Math.min(player.duration || Infinity, player.currentTime + skipAmount);
  showSkipNotification(`+ ${skipAmount}s`);
};

prevBtn.onclick = () => playPrev();
nextBtn.onclick = () => playNext();

stopBtn.onclick = () => {
  player.pause();
  player.currentTime = 0;
  playBtn.textContent = "▶";
};

progressEl.oninput = () => {
  player.currentTime = Number(progressEl.value);
};

volEl.oninput = () => {
  player.volume = Number(volEl.value);
  localStorage.setItem("vol", volEl.value);
};

// Click video to play/pause
player.addEventListener("click", () => {
  if (player.paused) {
    player.play();
    playBtn.textContent = "⏸";
  } else {
    player.pause();
    playBtn.textContent = "▶";
  }
  updatePlayPauseOverlay();
});

// Playback speed control
rateEl.oninput = () => {
  const newRate = Number(rateEl.value);
  currentRate = newRate;
  player.playbackRate = newRate;
  localStorage.setItem("rate", String(newRate));
};

volBtn.onclick = () => {
  player.muted = !player.muted;
  volBtn.textContent = player.muted ? "🔈" : "🔊";
};

pipBtn.onclick = async () => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else if (player.requestPictureInPicture) {
    await player.requestPictureInPicture().catch(() => {
      showMessageBox("Picture-in-Picture failed or is blocked.");
    });
  }
};

fsBtn.onclick = () => {
  if (!document.fullscreenElement) {
    player.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
};

// File upload handling
uploadMain.onclick = () => fileMain.click();
uploadMore.onclick = () => fileMore.click();
fileMain.onchange = handleFileEvent;
fileMore.onchange = handleFileEvent;

/**
 * Handles file input changes and drag-drop events
 * @param {Event} e - File input or drop event
 */
async function handleFileEvent(e) {
  const files = e.target ? e.target.files : e.files;
  if (!files || files.length === 0) return;

  for (const file of files) {
    if (file.type.startsWith("video/")) {
      await putVideo(file);
    }
  }

  await refreshList();
  if (files[0]) playByName(files[0].name);

  if (e.target) {
    e.target.value = ""; // Reset file input
  }
}

// Drag and drop file handling
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  dragOverlay.classList.add("active");
});

dragOverlay.addEventListener("dragleave", (e) => {
  dragOverlay.classList.remove("active");
});

dragOverlay.addEventListener("drop", (e) => {
  e.preventDefault();
  dragOverlay.classList.remove("active");

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    const videoFile = Array.from(files).find((file) => file.type.startsWith("video/"));
    if (videoFile) {
      handleFileEvent({ files: [videoFile] });
    } else {
      showMessageBox("Only video files are supported for drag-and-drop.");
    }
  }
});

// Clear all videos confirmation
clearAllBtn.onclick = async () => {
  const confirmed = await showConfirmBox(
    "Are you sure you want to delete ALL saved videos? This cannot be undone.",
    "Delete All",
    "Cancel"
  );
  if (!confirmed) return;
  
  await clearAll();
  stopAndClear();
  await refreshList();
  firstScreen.style.display = "flex";
  playerWrap.style.display = "none";
  controls.style.display = "none";
};

// Keyboard shortcuts for video controls
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

  const k = e.key.toLowerCase();

  // Play/Pause (Space, K)
  if (e.code === "Space" || k === "k") {
    if (playerWrap.style.display === "none") return;
    e.preventDefault();
    if (player.paused) {
      player.play();
      playBtn.textContent = "⏸";
    } else {
      player.pause();
      playBtn.textContent = "▶";
    }
    updatePlayPauseOverlay();
    return;
  }

  if (playerWrap.style.display === "none") return;

  // Seek controls
  if (k === "j") { // Rewind 10s
    const skipAmount = 10;
    player.currentTime = Math.max(0, player.currentTime - skipAmount);
    showSkipNotification(`- ${skipAmount}s`);
  }
  if (k === "l") { // Forward 10s
    const skipAmount = 10;
    player.currentTime = Math.min(player.duration || Infinity, player.currentTime + skipAmount);
    showSkipNotification(`+ ${skipAmount}s`);
  }
  if (k === "arrowleft") { // Rewind 5s
    const skipAmount = 5;
    player.currentTime = Math.max(0, player.currentTime - skipAmount);
    showSkipNotification(`- ${skipAmount}s`);
  }
  if (k === "arrowright") { // Forward 5s
    const skipAmount = 5;
    player.currentTime = Math.min(player.duration || Infinity, player.currentTime + skipAmount);
    showSkipNotification(`+ ${skipAmount}s`);
  }

  // Volume controls
  if (k === "arrowup") {
    e.preventDefault();
    player.volume = Math.min(1, player.volume + 0.05);
    volEl.value = player.volume;
    localStorage.setItem("vol", volEl.value);
  }
  if (k === "arrowdown") {
    e.preventDefault();
    player.volume = Math.max(0, player.volume - 0.05);
    volEl.value = player.volume;
    localStorage.setItem("vol", volEl.value);
  }

  // Mute toggle (M)
  if (k === "m") {
    player.muted = !player.muted;
    volBtn.textContent = player.muted ? "🔈" : "🔊";
  }

  // Fullscreen toggle (F)
  if (k === "f") {
    if (!document.fullscreenElement) {
      player.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // Seek to percentage (0-9 keys)
  if (!isNaN(Number(k))) {
    const n = Number(k);
    const pct = n * 10;
    if (player.duration) player.currentTime = (pct / 100) * player.duration;
  }

  // Navigation
  if (k === "n") { // Next
    e.preventDefault();
    nextBtn.click();
  }
  if (k === "p") { // Previous
    e.preventDefault();
    prevBtn.click();
  }

  // Playback speed (<, >)
  if (e.key === "<") {
    const newRate = Math.max(0.5, currentRate - 0.25);
    currentRate = newRate;
    player.playbackRate = newRate;
    rateEl.value = String(newRate);
    localStorage.setItem("rate", String(newRate));
  }
  if (e.key === ">") {
    const newRate = Math.min(2, currentRate + 0.25);
    currentRate = newRate;
    player.playbackRate = newRate;
    rateEl.value = String(newRate);
    localStorage.setItem("rate", String(newRate));
  }
});

// Auto-hide player controls on inactivity
let hideTimer = null;

/**
 * Shows player controls and starts auto-hide timer
 */
function showControls() {
  controls.style.opacity = 1;
  controls.style.pointerEvents = "auto";
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    controls.style.opacity = 0.02;
    controls.style.pointerEvents = "none";
  }, 3500);
}

document.addEventListener("mousemove", () => {
  if (playerWrap.style.display !== "none") {
    showControls();
  }
});

// Persist settings before page unload
window.addEventListener("beforeunload", () => {
  localStorage.setItem("vol", volEl.value);
  localStorage.setItem("rate", String(currentRate));
});

// Register service worker for offline support (if available)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

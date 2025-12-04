// Modal dialog system for user notifications and confirmations
      const modalBackdrop = document.getElementById("modalBackdrop");
      const modalMessage = document.getElementById("modalMessage");
      const modalButtons = document.getElementById("modalButtons");

      // Displays a dialogue box , showing message that files other than videos cannot be uploaded
      function showMessageBox(message) {
        return new Promise((resolve) => {
          modalMessage.textContent = message;
          modalButtons.innerHTML =
            '<button class="modal-btn btn-primary" id="modalOk">OK</button>';
          modalBackdrop.classList.add("show");

          document.getElementById("modalOk").onclick = () => {
            modalBackdrop.classList.remove("show");
            resolve();
          };
        });
      }

      /*Displays a dialogue box with message to delete video user wants to
       delete or deleting all videos from Saved videos list and along two buttons Confirm and Cancel*/
      function showConfirmBox(
        message,
        confirmText = "Confirm",
        cancelText = "Cancel"
      ) {
        return new Promise((resolve) => {
          modalMessage.textContent = message;
          modalButtons.innerHTML = `
      <button class="modal-btn btn-danger" id="modalConfirm">${confirmText}</button>
      <button class="modal-btn btn-secondary" id="modalCancel">${cancelText}</button>`;
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

     
      // Opening DB and creating store with 'name' as keyPath
      function openDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, 2);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
              db.createObjectStore(STORE, { keyPath: "name" }); // <--- use name as key
            }
          };
          request.onsuccess = () => {
            db = request.result;
            resolve(db);
          };
          request.onerror = () => reject(request.error);
        });
      }

      // Save video to IndexedDB
      async function putVideo(file) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");  //Opens a transaction on Object Store with read/write access
          const store = tx.objectStore(STORE);  //Gets a reference to the object storewhere the videos are kept.

          const rec = {
            name: file.name, // <--- key is name
            blob: file,  //the actual video file stored as a binary blob
            created: Date.now(),  //timestamp ehen the video was first saved
            lastPosition: 0, //playback postion which starts from 0
            playbackState: "paused",  //initial state when saved
            lastUpdated: Date.now(),  //timestamp for the most recent update
          };

          store.put(rec); // puts record into the store and will replace if name exists if record with samename exists
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      // Get video by name
      function getVideo(name) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly");
          const store = tx.objectStore(STORE);
          const request = store.get(name); // now works because name is key
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    
      //Retrieving video records from Indexed DB 
      function getAllVideos() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly"); //Opens a transaction on object store in readonly mode
          const store = tx.objectStore(STORE);
          const request = store.getAll(); // fetch all records
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }

      /**
       * Updates video record's metadata by merging with existing record.
       * Used to save lastPosition and playbackState without touching blob.
       * @param {string} name - Video name
       * @param {Object} updates - metadata fields to update (lastPosition, playbackState, lastUpdated)
       * @returns {Promise<void>}
       */
      /**
       * Updates video record's metadata (lastPosition, playbackState)
       * @param {string} name - Video name
       * @param {Object} updates - { lastPosition, playbackState }
       */
      async function saveVideoMeta(name, updates) {
        const rec = await getVideo(name);
        if (!rec) return; // record missing, skip

        const merged = { ...rec, ...updates, lastUpdated: Date.now() };

        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");  //Opens a read/write transaction on the store
          const store = tx.objectStore(STORE);
          store.put(merged);   //Replaces the old recordd with the updated one
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }

      /**
       * Deletes single video from IndexedDB
       * @param {string} name - Video name to delete
       * @returns {Promise<void>}
       */
      // Delete video by name
      function deleteVideo(name) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");   //Opens a read/write transaction on the store
          const store = tx.objectStore(STORE);
          const request = store.delete(name);  //Issues a delet operation for the record whose key matches with the provided name
          request.onsuccess = () => resolve();  //Resolves the promise when the deletion completes
          request.onerror = () => reject(request.error);
        });
      }

      //Delete all video records from IndexedDB object store in one go
      function clearAll() {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE, "readwrite");  //Opens a read/write transaction on the store
          const store = transaction.objectStore(STORE);
          const request = store.clear();  //Removes all video records from store at once
          request.onsuccess = () => resolve();  //Resolves the promise once teh clear operation is successful
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

      
      
      // Updates play/pause overlay visibility and icon 
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

      // Shows temporary skip notification (rewind/fast-forward feedback)
      // Here text shows the skip message , and duration tells for much time that message will be displayed 
      function showSkipNotification(text, duration = 800) {
        skipNotification.textContent = text; //Sets the notification element’s text to the provided message
        skipNotification.classList.add("show");
        setTimeout(() => {
          skipNotification.classList.remove("show");
        }, duration);
      }

      // Application state management
      let list = []; // All stored videos
      let order = []; // Current playlist order
      let current = -1; // Index of currently playing video
      let currentURL = null; // Active blob URL for cleanup
      let currentRate = Number(localStorage.getItem("rate")) || 1;

      // Theme management with localStorage persistence
      const savedTheme = localStorage.getItem("theme"); //- Reads the saved theme preference from the browser’s local storage.
      if (savedTheme === "light") {
        document.body.classList.add("light");
        themeIcon.textContent = "☀️";
        themeLabel.textContent = "Light mode";
      }

      const savedLoop = localStorage.getItem("loop");  //- Reads the saved loop preference (whether looping is enabled) from local storage.
      loopEl.checked = savedLoop === "true";  //- Sets the loop checkbox based on the saved value i.e. - If the stored value is "true", the checkbox is checked; otherwise, it’s unchecked.

      loopEl.onchange = () => {
        localStorage.setItem("loop", loopEl.checked);  // Adds an event listener to the loop toggle.Whenever the user changes the loop setting, the new value (true or false) is saved back into local storage.
      };

      // Toggles between light/dark theme and persists choice
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
      themeToggle.addEventListener("click", toggleTheme); //Attaches the toggleTheme function to the theme toggle button (themeToggle)

      // Application initialization
      //Immediately Invoked Function Expression (IIFE).
      (async function init() { 
        await openDB();
        await refreshList();

        // Restore user preferences
        const savedVol = localStorage.getItem("vol"); // Reads the saved volume from localStorage.

        volEl.value = savedVol !== null ? savedVol : 0.8;
        player.volume = Number(volEl.value);

        const savedRate = localStorage.getItem("rate"); // Reads the saved playback speed rate fro localstorage
        currentRate = savedRate ? Number(savedRate) : 1;
        player.playbackRate = currentRate;
        rateEl.value = String(currentRate);
      })();

      // Refreshes video playlist from IndexedDB and updates UI
      async function refreshList() {
        list = await getAllVideos();  //Calls getAllVideos() , and stores the result in list, which represents all videos currently saved.
        list.sort((a, b) => b.created - a.created); // Sorts the list so the newest videos appears first. Uses the created timestamp property from each record.
        order = list.map((i) => i.name);  //Extracts just the name of each video into a new array called order.
        renderPlaylist();  //function that updates the visible playlist 
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
            const confirmed = await showConfirmBox(
              `Are you sure you want to delete "${name}"?`
            );
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

      // --- Timestamp / Position restore logic ---
      // We'll throttle writes to IndexedDB while the video is playing.
      let saveTimeout = null;
      let lastSavedTime = 0; //Tracks the last time metadata was saved,to enforce  throttling

      //Schedule a metadata save for the currently playing video (throttled)

      function scheduleSaveCurrentMeta(position, state) {  // Saves the current playback position and state, but throttled to avoid excessive writes.
        if (current < 0 || !order[current]) return;
        const name = order[current];

        // Throttle: only save every 1000ms (or if immediate flag set)
        const now = Date.now();
        if (now - lastSavedTime > 1000) {
          // immediate save
          lastSavedTime = now;
          saveVideoMeta(name, {
            lastPosition: position,
            playbackState: state,
          }).catch((e) => console.error("saveVideoMeta error:", e));
        } else {
          // schedule delayed save (reset previous)
          if (saveTimeout) clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            lastSavedTime = Date.now();
            saveVideoMeta(name, {
              lastPosition: position,
              playbackState: state,
            }).catch((e) => console.error("saveVideoMeta error:", e));
            saveTimeout = null;
          }, 700);
        }
      }

      // Save immediately (used on pause / beforeunload / switching)
      async function saveCurrentMetaImmediate() {
        if (current < 0 || !order[current]) return;
        const name = order[current];
        try {
          await saveVideoMeta(name, {
            lastPosition: player.currentTime || 0,
            playbackState: player.paused ? "paused" : "playing",
          });
        } catch (e) {
          console.error("saveCurrentMetaImmediate error:", e);
        }
      }

      // Plays video by name from playlist
      async function playByName(name) {
        await saveCurrentMetaImmediate(); // save previous

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
        player.src = currentURL;
        player.load();

        player.onloadedmetadata = async () => {
          player.playbackRate = currentRate;
          rateEl.value = String(currentRate);

          // Restore saved position and state
          if (rec.lastPosition && rec.lastPosition < player.duration) {
            player.currentTime = rec.lastPosition;
          } else {
            player.currentTime = 0;
          }

          // Update time display immediately
          if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(
              player.currentTime
            )} / ${formatTime(player.duration)}`;
          }

          if (rec.playbackState === "playing") {
            try {
              await player.play();
              playBtn.textContent = "⏸";
            } catch {
              playBtn.textContent = "▶";
            }
          } else {
            playBtn.textContent = "▶";
          }

          updatePlayPauseOverlay();
          updatePlaylistHighlight();
        };

        player.onended = () => {
          saveVideoMeta(name, { lastPosition: 0, playbackState: "paused" });
          if (loopEl.checked) {
            player.currentTime = 0;
            player.play();
          } else if (autoplayEl.checked) playNext();
          else playBtn.textContent = "▶";
        };
        const timeDisplay = document.getElementById("timeDisplay"); // create or select this

        function formatTime(sec) {
          const m = Math.floor(sec / 60)
            .toString()
            .padStart(2, "0");
          const s = Math.floor(sec % 60)
            .toString()
            .padStart(2, "0");
          return `${m}:${s}`;
        }
        player.ontimeupdate = () => {
          progressEl.max = player.duration || 0;
          progressEl.value = player.currentTime;
          if (timeDisplay) {
            timeDisplay.textContent = `${formatTime(
              player.currentTime
            )} / ${formatTime(player.duration || 0)}`;
          }
          scheduleSaveCurrentMeta(
            player.currentTime,
            player.paused ? "paused" : "playing"
          );
        };

        player.onplay = () => {
          playBtn.textContent = "⏸";
          updatePlayPauseOverlay();
          scheduleSaveCurrentMeta(player.currentTime, "playing");
        };
        player.onpause = () => {
          playBtn.textContent = "▶";
          updatePlayPauseOverlay();
          saveCurrentMetaImmediate();
        };
      }
      
      //Stops current video and cleans up blob URL
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

      //Plays next video in playlist (supports shuffle)
      async function playNext() {
        if (order.length === 0) return;
        if (shuffleEl.checked) {
          let idx = current;
          if (order.length > 1) {
            while (idx === current)
              idx = Math.floor(Math.random() * order.length);
          } else idx = 0;
          current = idx;
        } else {
          current = (current + 1) % order.length;
        }
        await playByName(order[current]);
        // Force autoplay if toggle is checked
        if (autoplayEl.checked) {
          try {
            await player.play();
            playBtn.textContent = "⏸";
            updatePlayPauseOverlay();
          } catch {}
        }
      }

      //Plays previous video in playlist (supports shuffle)
      async function playPrev() {
        if (order.length === 0) return;
        if (shuffleEl.checked) {
          let idx = current;
          if (order.length > 1) {
            while (idx === current)
              idx = Math.floor(Math.random() * order.length);
          } else idx = 0;
          current = idx;
        } else {
          current = (current - 1 + order.length) % order.length;
        }
        playByName(order[current]);
        // Force autoplay if toggle is checked
        if (autoplayEl.checked) {
          try {
            await player.play();
            playBtn.textContent = "⏸";
            updatePlayPauseOverlay();
          } catch {}
        }
      }

      //Updates currently playing item highlight in playlist
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
        // save soon after skip
        scheduleSaveCurrentMeta(
          player.currentTime,
          player.paused ? "paused" : "playing"
        );
      };

      fwdBtn.onclick = () => {
        const skipAmount = 10;
        player.currentTime = Math.min(
          player.duration || Infinity,
          player.currentTime + skipAmount
        );
        showSkipNotification(`+ ${skipAmount}s`);
        scheduleSaveCurrentMeta(
          player.currentTime,
          player.paused ? "paused" : "playing"
        );
      };

      prevBtn.onclick = () => playPrev();
      nextBtn.onclick = () => playNext();

      stopBtn.onclick = () => {
        player.pause();
        player.currentTime = 0;
        playBtn.textContent = "▶";
        // save immediate
        saveCurrentMetaImmediate();
      };

      progressEl.oninput = () => {
        player.currentTime = Number(progressEl.value);
        // When user seeks, save metadata after seek
        scheduleSaveCurrentMeta(
          player.currentTime,
          player.paused ? "paused" : "playing"
        );
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

      //Handles file input changes and drag-drop events
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
          const videoFile = Array.from(files).find((file) =>
            file.type.startsWith("video/")
          );
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
      document.addEventListener("keydown", async (e) => {
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
        if (k === "j") {
          // Rewind 10s
          const skipAmount = 10;
          player.currentTime = Math.max(0, player.currentTime - skipAmount);
          showSkipNotification(`- ${skipAmount}s`);
        }
        if (k === "l") {
          // Forward 10s
          const skipAmount = 10;
          player.currentTime = Math.min(
            player.duration || Infinity,
            player.currentTime + skipAmount
          );
          showSkipNotification(`+ ${skipAmount}s`);
        }
        if (k === "arrowleft") {
          // Rewind 5s
          const skipAmount = 5;
          player.currentTime = Math.max(0, player.currentTime - skipAmount);
          showSkipNotification(`- ${skipAmount}s`);
        }
        if (k === "arrowright") {
          // Forward 5s
          const skipAmount = 5;
          player.currentTime = Math.min(
            player.duration || Infinity,
            player.currentTime + skipAmount
          );
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
          if (player.duration)
            player.currentTime = (pct / 100) * player.duration;
        }

        // Navigation
        if (k === "n") {
          e.preventDefault();
          if (order.length === 0) return;

          // Save current video metadata and stop
          await saveCurrentMetaImmediate();
          stopAndClear();

          // Move to next
          if (shuffleEl.checked) {
            let idx = current;
            if (order.length > 1) {
              while (idx === current)
                idx = Math.floor(Math.random() * order.length);
            } else idx = 0;
            current = idx;
          } else {
            current = (current + 1) % order.length;
          }

          playByName(order[current]);
          return;
        }
        // Previous video (P)

        if (k === "p") {
          e.preventDefault();
          if (order.length === 0) return;

          await saveCurrentMetaImmediate();
          stopAndClear();

          if (shuffleEl.checked) {
            let idx = current;
            if (order.length > 1) {
              while (idx === current)
                idx = Math.floor(Math.random() * order.length);
            } else idx = 0;
            current = idx;
          } else {
            current = (current - 1 + order.length) % order.length;
          }

          playByName(order[current]);
          return;
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

      // Persist settings and save metadata before page unload
      window.addEventListener("beforeunload", (e) => {
        localStorage.setItem("vol", volEl.value);
        localStorage.setItem("rate", String(currentRate));
        // Save current video metadata synchronously (attempt)
        // Note: IndexedDB is async; best-effort save (we call immediate save).
        // Browsers may still not complete async writes on unload, but this helps.
        navigator.sendBeacon; // no-op placeholder
        // Call immediate save (async) — it's best-effort
        saveCurrentMetaImmediate();
      });

      // Register service worker for offline support (if available)
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      }
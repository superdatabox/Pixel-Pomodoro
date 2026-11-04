
document.addEventListener("DOMContentLoaded", () => {
    const $ = (id) => document.getElementById(id);

    // Check that the other modules loaded successfully.
    if (!window.PPSettings || !window.PPAudio ||
        !window.PPStats || !window.PPTimer) {
        console.error("Pixel Pomodoro: One or more modules failed to load.");
        if ($("timerMessage")) {
            $("timerMessage").textContent =
                "Error: A project file could not be loaded.";
        }
        return;
    }

    // -----------------------------
    // TIMER
    // -----------------------------

    const phaseNames = {
        work: "WORK SESSION",
        break: "SHORT BREAK",
        longBreak: "LONG BREAK"
    };

    function updateTimer(state) {
        if ($("timer")) {
            $("timer").textContent =
                PPTimer.formatTime(state.timeLeft);
        }

        if ($("status")) {
            $("status").textContent = phaseNames[state.phase];
        }

        if ($("startBtn")) {
            $("startBtn").textContent =
                state.running ? "PAUSE" : "START";
        }

        if ($("sessionCount")) {
            $("sessionCount").textContent =
                `SESSION ${state.completedWorkSessions + 1}`;
        }

        if ($("progressBar")) {
            const elapsed = state.duration - state.timeLeft;
            const progress = Math.min(
                100,
                Math.max(0, (elapsed / state.duration) * 100)
            );
            $("progressBar").style.width = `${progress}%`;
        }

        if ($("timerMessage")) {
            if (state.running) {
                $("timerMessage").textContent = "Stay focused!";
            } else if (state.timeLeft === 0) {
                $("timerMessage").textContent = "Phase complete!";
            } else {
                $("timerMessage").textContent = "Ready when you are.";
            }
        }
    }

    PPTimer.initialize();
    PPTimer.subscribe(updateTimer);

    $("startBtn")?.addEventListener("click", () => {
        const state = PPTimer.getState();
        if (state.running) {
            PPTimer.pause();
        } else {
            PPTimer.start();
        }
    });

    $("resetBtn")?.addEventListener("click", () => {
        PPTimer.reset();
    });

    $("skipBtn")?.addEventListener("click", () => {
        PPTimer.skip();
    });

    // -----------------------------
    // SETTINGS
    // -----------------------------

    function loadSettingsIntoForm() {
        const settings = PPSettings.getAll();

        if ($("workInput")) {
            $("workInput").value = settings.workDuration;
        }
        if ($("breakInput")) {
            $("breakInput").value = settings.breakDuration;
        }
        if ($("longBreakInput")) {
            $("longBreakInput").value = settings.longBreakDuration;
        }
        if ($("sessionsInput")) {
            $("sessionsInput").value =
                settings.sessionsBeforeLongBreak;
        }
        if ($("autoBreakInput")) {
            $("autoBreakInput").checked =
                settings.autoStartBreaks;
        }
        if ($("autoWorkInput")) {
            $("autoWorkInput").checked =
                settings.autoStartWork;
        }
        if ($("soundVolume")) {
            $("soundVolume").value = settings.volume;
            PPAudio.setVolume(settings.volume);
        }
        if ($("musicVolume")) {
            $("musicVolume").value = settings.musicVolume;
            PPAudio.setMusicVolume(settings.musicVolume);
        }
    }

    $("saveSettingsBtn")?.addEventListener("click", () => {
        const fields = [
            ["workInput", "workDuration", 1, 180],
            ["breakInput", "breakDuration", 1, 60],
            ["longBreakInput", "longBreakDuration", 1, 120],
            ["sessionsInput", "sessionsBeforeLongBreak", 1, 12]
        ];

        for (const [id, key, min, max] of fields) {
            const element = $(id);
            if (!element) continue;

            const value = Number(element.value);

            if (!Number.isInteger(value) ||
                value < min || value > max) {
                element.focus();
                if ($("timerMessage")) {
                    $("timerMessage").textContent =
                        `Enter a whole number from ${min} to ${max}.`;
                }
                return;
            }

            PPSettings.set(key, value);
        }

        if ($("autoBreakInput")) {
            PPSettings.set(
                "autoStartBreaks",
                $("autoBreakInput").checked
            );
        }

        if ($("autoWorkInput")) {
            PPSettings.set(
                "autoStartWork",
                $("autoWorkInput").checked
            );
        }

        PPTimer.refreshSettings();

        if ($("timerMessage")) {
            $("timerMessage").textContent = "Settings saved!";
        }
    });

    // -----------------------------
    // STATISTICS
    // -----------------------------

    function updateStatistics() {
        const totalSessions = PPStats.getTotalSessions();
        const totalMinutes = PPStats.getTotalMinutes();
        const todayMinutes = PPStats.getTodayMinutes();

        if ($("totalSessions")) {
            $("totalSessions").textContent = totalSessions;
        }

        if ($("totalMinutes")) {
            $("totalMinutes").textContent = totalMinutes;
        }

        if ($("todayMinutes")) {
            $("todayMinutes").textContent = todayMinutes;
        }

        if ($("bestDay")) {
            const best = PPStats.getBestDay();
            if (typeof best === "string" || typeof best === "number") {
                $("bestDay").textContent = best;
            } else if (best && typeof best === "object") {
                $("bestDay").textContent =
                    best.minutes ?? best.totalMinutes ?? best.date ?? "—";
            } else {
                $("bestDay").textContent = "—";
            }
        }

        // Simple XP system: 25 XP per completed work session.
        const xp = totalSessions * 25;
        const level = Math.floor(xp / 100) + 1;

        if ($("xpDisplay")) {
            $("xpDisplay").textContent = `${xp} XP`;
        }

        if ($("playerLevel")) {
            $("playerLevel").textContent = `LEVEL ${level}`;
        }

        updateWeeklyStats();
        updateSessionHistory();
    }

    function updateWeeklyStats() {
        const container = $("weeklyStats");
        if (!container) return;

        const days = PPStats.getWeeklyStats();
        container.replaceChildren();

        if (!Array.isArray(days) || days.length === 0) {
            container.textContent = "No weekly data yet.";
            return;
        }

        const maxMinutes = Math.max(
            1,
            ...days.map(day => Number(day.minutes) || 0)
        );

        days.forEach(day => {
            const item = document.createElement("div");
            item.className = "weekly-stat";

            const label = document.createElement("span");
            label.textContent = day.date || "Day";

            const bar = document.createElement("div");
            bar.className = "weekly-stat-bar";

            const fill = document.createElement("div");
            fill.className = "weekly-stat-fill";
            fill.style.width =
                `${(Number(day.minutes || 0) / maxMinutes) * 100}%`;

            bar.appendChild(fill);

            const value = document.createElement("span");
            value.textContent = `${day.minutes || 0} min`;

            item.append(label, bar, value);
            container.appendChild(item);
        });
    }

    function updateSessionHistory() {
        const container = $("sessionHistory");
        if (!container) return;

        const history = PPStats.getHistory(10);
        container.replaceChildren();

        if (!Array.isArray(history) || history.length === 0) {
            container.textContent = "No completed sessions yet.";
            return;
        }

        history.forEach(session => {
            const item = document.createElement("div");
            item.className = "history-entry";

            const date = document.createElement("span");
            date.textContent = session.date
                ? new Date(session.date).toLocaleString()
                : "Completed session";

            const duration = document.createElement("span");
            duration.textContent =
                `${session.minutes ?? session.duration ?? 0} min`;

            item.append(date, duration);
            container.appendChild(item);
        });
    }

    // Refresh statistics when a work session finishes.
    let previousTotalSessions = PPStats.getTotalSessions();

    PPTimer.subscribe((state) => {
        updateTimer(state);

        const currentTotalSessions = PPStats.getTotalSessions();

        if (currentTotalSessions !== previousTotalSessions) {
            previousTotalSessions = currentTotalSessions;
            updateStatistics();
        }
    });

    // -----------------------------
    // AUDIO SETTINGS
    // -----------------------------

    $("soundVolume")?.addEventListener("input", (event) => {
        const volume = Number(event.target.value);
        PPAudio.setVolume(volume);
        PPSettings.set("volume", volume);
    });

    $("musicVolume")?.addEventListener("input", (event) => {
        const volume = Number(event.target.value);
        PPAudio.setMusicVolume(volume);
        PPSettings.set("musicVolume", volume);
    });

    // -----------------------------
    // MUSIC UPLOAD AND PLAYBACK
    // -----------------------------

    async function refreshMusicList() {
        const select = $("musicSelect");
        if (!select) return;

        try {
            const tracks = await PPAudio.getMusicTracks();
            select.replaceChildren();

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a track";
            select.appendChild(defaultOption);

            tracks.forEach(track => {
                const option = document.createElement("option");
                option.value = track.id;
                option.textContent = track.name || "Uploaded track";
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Could not load music:", error);
        }
    }

    $("musicUpload")?.addEventListener("change", async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        try {
            await PPAudio.addMusicFiles(files);
            await refreshMusicList();

            if ($("timerMessage")) {
                $("timerMessage").textContent = "Music uploaded!";
            }
        } catch (error) {
            console.error("Music upload failed:", error);
            if ($("timerMessage")) {
                $("timerMessage").textContent =
                    "Could not upload music.";
            }
        }

        event.target.value = "";
    });

    $("playMusicBtn")?.addEventListener("click", async () => {
        const id = $("musicSelect")?.value;
        if (!id) {
            if ($("timerMessage")) {
                $("timerMessage").textContent =
                    "Choose a music track first.";
            }
            return;
        }

        try {
            await PPAudio.playMusic(id);
        } catch (error) {
            console.error("Music playback failed:", error);
        }
    });

    $("pauseMusicBtn")?.addEventListener("click", () => {
        PPAudio.pauseMusic();
    });

    // -----------------------------
    // INITIAL DISPLAY
    // -----------------------------

    loadSettingsIntoForm();
    updateStatistics();
    refreshMusicList();

    console.log("Pixel Pomodoro initialized successfully!");
});

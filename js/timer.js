
const PPTimer = (() => {

    let interval = null;
    let running = false;
    let phase = "work";

    let endTime = null;
    let timeLeft = 25 * 60;
    let completedWorkSessions = 0;
    let phaseStarted = false;

    let onUpdate = () => {};

    function getDuration(currentPhase) {
        const key = {
            work: "workDuration",
            break: "breakDuration",
            longBreak: "longBreakDuration"
        }[currentPhase];

        return Math.max(1, Number(PPSettings.get(key)) || 1) * 60;
    }

    function getState() {
        return {
            phase,
            running,
            timeLeft: Math.max(0, Math.ceil(timeLeft)),
            completedWorkSessions,
            duration: getDuration(phase)
        };
    }

    function notify() {
        onUpdate(getState());
    }

    function setPhase(newPhase) {
        phase = newPhase;
        timeLeft = getDuration(phase);
        phaseStarted = false;
        notify();
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remainingSeconds).padStart(2, "0")
        );
    }

    function stopInterval() {
        clearInterval(interval);
        interval = null;
        running = false;
    }

    function updateTimer() {
        if (!running) return;

        timeLeft = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        notify();

        if (timeLeft <= 0) {
            completePhase();
        }
    }

    function start() {
        if (running) return;

        running = true;
        endTime = Date.now() + timeLeft * 1000;

        if (!phaseStarted) {
            const eventName = {
                work: "workStarted",
                break: "breakStarted",
                longBreak: "breakStarted"
            }[phase];

            PPAudio.playEvent(eventName);
            phaseStarted = true;
        }

        clearInterval(interval);
        interval = setInterval(updateTimer, 250);

        notify();
    }

    function pause() {
        if (!running) return;

        timeLeft = Math.max(
            0,
            Math.ceil((endTime - Date.now()) / 1000)
        );

        if (timeLeft <= 0) {
            completePhase();
            return;
        }

        stopInterval();
        notify();
    }

    function completePhase() {
        if (!running) return;

        stopInterval();
        timeLeft = 0;

        if (phase === "work") {

            PPStats.recordSession(getDuration("work") / 60);
            completedWorkSessions++;

            PPAudio.playEvent("workFinished");

            const requiredSessions = Math.max(
                1,
                Number(PPSettings.get("sessionsBeforeLongBreak")) || 4
            );

            if (completedWorkSessions >= requiredSessions) {
                completedWorkSessions = 0;

                PPAudio.playEvent("sessionCompleted");
                setPhase("longBreak");

            } else {
                setPhase("break");
            }

            if (PPSettings.get("autoStartBreaks")) {
                start();
            }

        } else {

            PPAudio.playEvent("breakFinished");
            setPhase("work");

            if (PPSettings.get("autoStartWork")) {
                start();
            }
        }
    }

    function reset() {
        stopInterval();

        completedWorkSessions = 0;

        setPhase("work");
    }

    function refreshSettings() {
        if (running) return;

        timeLeft = getDuration(phase);
        notify();
    }

    // Skip the current phase without recording
    // an incomplete work session.
    function skip() {
        if (running) {
            stopInterval();
        }

        if (phase === "work") {
            PPAudio.playEvent("workFinished");
            setPhase("break");

        } else {
            PPAudio.playEvent("breakFinished");
            setPhase("work");
        }
    }

    function subscribe(callback) {
        if (typeof callback === "function") {
            onUpdate = callback;
        }

        notify();
    }

    function initialize() {
        stopInterval();

        phase = "work";
        timeLeft = getDuration("work");
        completedWorkSessions = 0;
        phaseStarted = false;

        notify();
    }

    return {
        start,
        pause,
        reset,
        skip,
        subscribe,
        getState,
        formatTime,
        refreshSettings,
        initialize
    };

})();

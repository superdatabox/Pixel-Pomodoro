
const PPStats = (() => {

    const STORAGE_KEY = "pixelPomodoroStats";

    function load() {
        try {
            return JSON.parse(
                localStorage.getItem(STORAGE_KEY)
            ) || {
                sessions: [],
                totalMinutes: 0
            };
        } catch (error) {
            console.warn("Could not load statistics:", error);

            return {
                sessions: [],
                totalMinutes: 0
            };
        }
    }

    let data = load();

    function save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(data)
            );
        } catch (error) {
            console.error("Could not save statistics:", error);
        }
    }

    // Record a completed work session
    function recordSession(minutes) {
        minutes = Math.max(0, Number(minutes) || 0);

        if (minutes <= 0) return;

        const session = {
            date: new Date().toISOString(),
            minutes: minutes
        };

        data.sessions.push(session);
        data.totalMinutes += minutes;

        save();

        return session;
    }

    // Total completed sessions
    function getTotalSessions() {
        return data.sessions.length;
    }

    // Total focused minutes
    function getTotalMinutes() {
        return data.totalMinutes;
    }

    // Today's completed sessions
    function getTodaySessions() {
        const today = new Date().toDateString();

        return data.sessions.filter(session =>
            new Date(session.date).toDateString() === today
        );
    }

    // Today's focused minutes
    function getTodayMinutes() {
        return getTodaySessions().reduce(
            (total, session) => total + session.minutes,
            0
        );
    }

    // Daily statistics for the last seven days
    function getWeeklyStats() {
        const result = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();

            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);

            const daySessions = data.sessions.filter(session => {
                const sessionDate = new Date(session.date);

                return sessionDate.toDateString() ===
                    date.toDateString();
            });

            result.push({
                date: date.toLocaleDateString(),
                sessions: daySessions.length,
                minutes: daySessions.reduce(
                    (total, session) => total + session.minutes,
                    0
                )
            });
        }

        return result;
    }

    // Longest daily focus time
    function getBestDay() {
        const days = {};

        data.sessions.forEach(session => {
            const day = new Date(session.date).toDateString();

            days[day] = (days[day] || 0) + session.minutes;
        });

        return Math.max(0, ...Object.values(days));
    }

    // Recent session history
    function getHistory(limit = 20) {
        return [...data.sessions]
            .reverse()
            .slice(0, limit);
    }

    // Reset all statistics
    function reset() {
        data = {
            sessions: [],
            totalMinutes: 0
        };

        save();
    }

    return {
        recordSession,
        getTotalSessions,
        getTotalMinutes,
        getTodaySessions,
        getTodayMinutes,
        getWeeklyStats,
        getBestDay,
        getHistory,
        reset
    };

})();

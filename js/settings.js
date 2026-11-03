
const PPSettings = (() => {

    const DEFAULTS = {
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        sessionsBeforeLongBreak: 4,
        volume: 70,
        musicVolume: 40,
        autoStartBreaks: false,
        autoStartWork: false
    };

    const STORAGE_KEY = "pixelPomodoroSettings";

    function load() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return { ...DEFAULTS };
            }

            return {
                ...DEFAULTS,
                ...JSON.parse(saved)
            };

        } catch (error) {
            console.error("Could not load settings:", error);
            return { ...DEFAULTS };
        }
    }

    let settings = load();

    function save() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );

        } catch (error) {
            console.error("Could not save settings:", error);
        }
    }

    function get(key) {
        return settings[key];
    }

    function set(key, value) {
        if (!(key in DEFAULTS)) {
            console.warn("Unknown setting:", key);
            return;
        }

        settings[key] = value;
        save();
    }

    function getAll() {
        return { ...settings };
    }

    function reset() {
        settings = { ...DEFAULTS };
        save();
    }

    return {
        get,
        set,
        getAll,
        save,
        reset
    };

})();

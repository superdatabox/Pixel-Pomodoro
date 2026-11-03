
const PPAudio = (() => {

    const DB_NAME = "PixelPomodoroAudio";
    const STORE_NAME = "audioFiles";

    const SOUND_EVENTS = [
        "workStarted",
        "workFinished",
        "breakStarted",
        "breakFinished",
        "sessionCompleted"
    ];

    let dbPromise = null;
    let currentMusic = null;
    let currentMusicId = null;
    const soundPlayers = {};
    const objectURLs = new Map();

    // Open the browser's audio database
    function openDatabase() {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);

            request.onupgradeneeded = () => {
                const db = request.result;

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, {
                        keyPath: "id"
                    });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                dbPromise = null;
                reject(request.error);
            };
        });

        return dbPromise;
    }

    // Save an audio file
    async function saveFile(record) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                STORE_NAME, "readwrite"
            );

            transaction.objectStore(STORE_NAME).put(record);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Retrieve an audio file
    async function getFile(id) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const request = db.transaction(
                STORE_NAME, "readonly"
            ).objectStore(STORE_NAME).get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Retrieve all uploaded audio
    async function getAllFiles() {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const request = db.transaction(
                STORE_NAME, "readonly"
            ).objectStore(STORE_NAME).getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete an audio file
    async function deleteFile(id) {
        const db = await openDatabase();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(
                STORE_NAME, "readwrite"
            );

            transaction.objectStore(STORE_NAME).delete(id);

            transaction.oncomplete = resolve;
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Get a reusable URL for an audio file
    function getAudioURL(record) {
        if (!objectURLs.has(record.id)) {
            objectURLs.set(
                record.id,
                URL.createObjectURL(record.blob)
            );
        }

        return objectURLs.get(record.id);
    }

    // Upload a custom sound for a specific event
    async function assignSound(eventName, file) {
        if (!SOUND_EVENTS.includes(eventName)) {
            throw new Error("Unknown sound event.");
        }

        if (!file || !file.type.startsWith("audio/")) {
            throw new Error("Please select an audio file.");
        }

        const id = `sound:${eventName}`;

        await deleteFile(id);

        const oldURL = objectURLs.get(id);
        if (oldURL) {
            URL.revokeObjectURL(oldURL);
            objectURLs.delete(id);
        }

        await saveFile({
            id,
            name: file.name,
            blob: file,
            kind: "sound"
        });

        return true;
    }

    // Play a sound assigned to an event
    async function playEvent(eventName) {
        if (!SOUND_EVENTS.includes(eventName)) return false;

        try {
            const record = await getFile(`sound:${eventName}`);

            if (!record) return false;

            const volume = PPSettings.get("volume") / 100;

            const player = new Audio(getAudioURL(record));
            player.volume = volume;

            soundPlayers[eventName] = player;

            await player.play();
            return true;

        } catch (error) {
            console.warn("Could not play sound:", error);
            return false;
        }
    }

    // Preview an assigned sound
    async function previewSound(eventName) {
        return playEvent(eventName);
    }

    // Remove an assigned sound
    async function removeSound(eventName) {
        if (!SOUND_EVENTS.includes(eventName)) return;

        const id = `sound:${eventName}`;

        await deleteFile(id);

        const url = objectURLs.get(id);

        if (url) {
            URL.revokeObjectURL(url);
            objectURLs.delete(id);
        }
    }

    // Change sound effect volume
    function setVolume(value) {
        const volume = Math.max(0, Math.min(100, Number(value)));

        PPSettings.set("volume", volume);
    }

    // Upload one or more background music tracks
    async function addMusicFiles(files) {
        const added = [];

        for (const file of Array.from(files)) {
            if (!file.type.startsWith("audio/")) continue;

            const id = "music:" +
                (crypto.randomUUID
                    ? crypto.randomUUID()
                    : Date.now() + "-" + Math.random());

            await saveFile({
                id,
                name: file.name,
                blob: file,
                kind: "music"
            });

            added.push({ id, name: file.name });
        }

        return added;
    }

    // List available music tracks
    async function getMusicTracks() {
        const files = await getAllFiles();

        return files
            .filter(file => file.kind === "music")
            .map(file => ({
                id: file.id,
                name: file.name
            }));
    }

    // Play a selected music track
    async function playMusic(id) {
        try {
            const record = await getFile(id);

            if (!record || record.kind !== "music") {
                return false;
            }

            if (currentMusic) {
                currentMusic.pause();
            }

            currentMusic = new Audio(getAudioURL(record));
            currentMusic.loop = true;
            currentMusic.volume =
                PPSettings.get("musicVolume") / 100;

            currentMusicId = id;

            await currentMusic.play();
            return true;

        } catch (error) {
            console.warn("Could not play music:", error);
            return false;
        }
    }

    function pauseMusic() {
        if (currentMusic) {
            currentMusic.pause();
        }
    }

    function toggleMusic() {
        if (!currentMusic) return;

        if (currentMusic.paused) {
            currentMusic.play().catch(error => {
                console.warn("Could not resume music:", error);
            });
        } else {
            currentMusic.pause();
        }
    }

    function setMusicVolume(value) {
        const volume = Math.max(0, Math.min(100, Number(value)));

        PPSettings.set("musicVolume", volume);

        if (currentMusic) {
            currentMusic.volume = volume / 100;
        }
    }

    // Remove a background music track
    async function removeMusic(id) {
        await deleteFile(id);

        const url = objectURLs.get(id);

        if (url) {
            URL.revokeObjectURL(url);
            objectURLs.delete(id);
        }

        if (currentMusicId === id) {
            currentMusic.pause();
            currentMusic = null;
            currentMusicId = null;
        }
    }

    return {
        assignSound,
        playEvent,
        previewSound,
        removeSound,
        setVolume,
        addMusicFiles,
        getMusicTracks,
        playMusic,
        pauseMusic,
        toggleMusic,
        setMusicVolume,
        removeMusic
    };

})();

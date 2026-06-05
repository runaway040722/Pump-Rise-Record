let songData;
let userRecords;
let mode = "single";
let currentLevel = null;
let showUnclearedOnly = false;
let editingSong = null;

/* localStorage 안전 로딩 */
try {
    songData = JSON.parse(localStorage.getItem("songData") || "null") || {
        single: {},
        double: {}
    };
} catch {
    songData = { single: {}, double: {} };
}

try {
    userRecords = JSON.parse(localStorage.getItem("userRecords") || "null") || {};
} catch {
    userRecords = {};
}

function save() {
    localStorage.setItem(
        "userRecords",
        JSON.stringify(userRecords)
    );
}

function changeMode(m) {

    mode = m;

    currentLevel = null;

    const levelBox =
        document.getElementById("levelBox");

    const songToolbar =
        document.getElementById("songToolbar");

    const backupArea =
        document.getElementById("backupArea");

    const modeBox =
        document.querySelector(".mode");

    if (modeBox)
        modeBox.style.display = "block";

    if (backupArea)
        backupArea.style.display = "block";

    if (levelBox)
        levelBox.style.display = "block";

    if (songToolbar)
        songToolbar.style.display = "none";

    document.getElementById("songList").innerHTML = "";

    renderLevels();
}

function renderSongs() {

    const list = document.getElementById("songList");
    list.innerHTML = "";

    const statsBox = document.getElementById("levelStats");

    let songs = songData?.[mode]?.[currentLevel] || [];

    const keyword =
        document.getElementById("searchBox")?.value
            .toLowerCase()
            .trim() || "";

    if (keyword) {
        songs = songs.filter(song =>
            song.title.toLowerCase().includes(keyword)
        );
    }

    if (showUnclearedOnly) {
        songs = songs.filter(song => {
            const score = Number(userRecords[song.id] || 0);
            return score < 1000000;
        });
    }

    // =========================
    // 상단 통계 (레벨 들어갔을 때만)
    // =========================
    if (currentLevel && statsBox) {

        const stats = getLevelStats(currentLevel);

        statsBox.innerHTML = `
            <div style="
                text-align: center;
                font-size: 18px;
                font-weight: bold;
            ">
                ${mode === "single" ? "S" : "D"}${currentLevel}
                올퍼펙 비율 ${stats.percent}% (${stats.cleared}/${stats.total})
            </div>
        `;
    } else if (statsBox) {
        statsBox.innerHTML = "";
    }

    // =========================
    // 곡 리스트 렌더링
    // =========================
    songs.forEach(song => {

        const score = userRecords[song.id] || 0;
        const rankState = getRank(score);

        const rankTextMap = {
            "SSS_RAINBOW": "SSS",
            "SSS": "SSS",
            "SS": "SS",
            "S": "S",
            "-": "-"
        };

        const div = document.createElement("div");
        div.className = "song";

        div.innerHTML = `
            <img src="${song.image || ''}" />

            <div class="song-title">
                ${song.title}
            </div>

            <input
                value="${score}"
                oninput="handleScoreInput('${song.id}', this)"
            >

            <div id="rank-${song.id}" class="rank ${rankState}">
                ${rankTextMap[rankState]}
            </div>
        `;

        list.appendChild(div);
    });
}

function setScore(id, val) {

    if (val === "") {
        delete userRecords[id];
        save();
        return;
    }

    let n = Number(val);

    if (isNaN(n)) return;

    // 100만 제한
    if (n > 1000000) n = 1000000;
    if (n < 0) n = 0;

    userRecords[id] = n;
    save();

    // 🔥 화면 즉시 반영 (핵심)
    const inputEl = document.querySelector(`input[oninput*="${id}"]`);
    if (inputEl) {
        inputEl.value = n;
    }

    // rank 즉시 반영
    const rankEl = document.getElementById(`rank-${id}`);
    if (!rankEl) return;

    const rankState = getRank(n);

    const rankTextMap = {
        "SSS_RAINBOW": "SSS",
        "SSS": "SSS",
        "SS": "SS",
        "S": "S",
        "-": "-"
    };

    rankEl.className = `rank ${rankState}`;
    rankEl.textContent = rankTextMap[rankState];
}

function getRank(s) {
    const n = Number(s);

    if (n >= 1000000) return "SSS_RAINBOW";
    if (n >= 990000) return "SSS";
    if (n >= 970000) return "SS";
    if (n >= 950000) return "S";
    return "-";
}

function toggleUncleared() {

    showUnclearedOnly = !showUnclearedOnly;

    const btn = document.getElementById("toggleBtn");

    btn.textContent = showUnclearedOnly
        ? "전체 곡 보기"
        : "100만점 제외 보기";

    renderSongs();
}

function randomSong() {

    let songs = songData?.[mode]?.[currentLevel] || [];

    if (!songs.length) {
        alert("곡이 없습니다.");
        return;
    }

    const song =
        songs[Math.floor(Math.random() * songs.length)];

    alert("🎲 랜덤 곡\n\n" + song.title);
}

function randomUnclearedSong() {

    let songs = songData?.[mode]?.[currentLevel] || [];

    songs = songs.filter(song => {
        const score = Number(userRecords[song.id] || 0);
        return score < 1000000;
    });

    if (!songs.length) {
        alert("100만점 미달성 곡이 없습니다.");
        return;
    }

    const song =
        songs[Math.floor(Math.random() * songs.length)];

    alert("🎲 100만점 제외 랜덤\n\n" + song.title);
}

function openRegister() {
    document.getElementById("registerModal").style.display = "block";
}

function closeRegister() {
    document.getElementById("registerModal").style.display = "none";
}

function findSongForEdit() {

    const keyword =
        document.getElementById("editSearch")
            .value
            .trim()
            .toLowerCase();

    if (!keyword) return;

    let foundTitle = null;
    let foundImage = "";

    const singleLevels = [];
    const doubleLevels = [];

    const singleMap = new Map(); // level -> song object
    const doubleMap = new Map();

    Object.keys(songData.single).forEach(level => {

        songData.single[level].forEach(song => {

            if (song.title.toLowerCase() === keyword) {

                foundTitle = song.title;
                foundImage = song.image || foundImage;

                singleLevels.push(level);
                singleMap.set(level, song);
            }
        });
    });

    Object.keys(songData.double).forEach(level => {

        songData.double[level].forEach(song => {

            if (song.title.toLowerCase() === keyword) {

                foundTitle = song.title;
                foundImage = song.image || foundImage;

                doubleLevels.push(level);
                doubleMap.set(level, song);
            }
        });
    });

    if (!foundTitle) {
        alert("곡을 찾을 수 없습니다.");
        return;
    }

    editingSong = {
        title: foundTitle,
        singleMap,
        doubleMap
    };

    document.getElementById("editArea").style.display = "block";

    document.getElementById("editTitle").value = foundTitle;
    document.getElementById("editSingle").value = singleLevels.join(" ");
    document.getElementById("editDouble").value = doubleLevels.join(" ");

    const preview = document.getElementById("editPreview");

    if (preview) {
        preview.src = foundImage;
        preview.style.display = foundImage ? "block" : "none";
    }
}

function deleteSong() {

    if (!editingSong) return;

    ["single", "double"].forEach(modeName => {

        Object.keys(songData[modeName]).forEach(level => {

            songData[modeName][level] =
                songData[modeName][level]
                .filter(song =>
                    song.title !== editingSong.title
                );

        });

    });

    save();

    alert("삭제 완료");

    renderSongs();
}

function updateSong() {

    if (!editingSong) return;

    const newTitle =
        document.getElementById("editTitle")
            .value
            .trim();

    const newSingleLevels =
        document.getElementById("editSingle")
            .value
            .trim()
            .split(" ")
            .filter(v => v);

    const newDoubleLevels =
        document.getElementById("editDouble")
            .value
            .trim()
            .split(" ")
            .filter(v => v);

    const file =
        document.getElementById("editImg").files[0];

    function apply(newImage) {

        let oldImage = "";

        const keptRecords = new Map(); // id 유지용

        const removedIds = [];

        // -------------------------
        // 1. 기존 곡 전부 스캔 + 제거
        // -------------------------
        ["single", "double"].forEach(modeName => {

            Object.keys(songData[modeName]).forEach(level => {

                const newList = [];

                songData[modeName][level].forEach(song => {

                    if (song.title === editingSong.title) {

                        oldImage = song.image || oldImage;

                        const stillExists =
                            (modeName === "single" && newSingleLevels.includes(level)) ||
                            (modeName === "double" && newDoubleLevels.includes(level));

                        if (stillExists) {
                            keptRecords.set(song.id, song);
                        } else {
                            removedIds.push(song.id);
                        }

                    } else {
                        newList.push(song);
                    }
                });

                songData[modeName][level] = newList;
            });
        });

        // -------------------------
        // 2. 삭제된 난이도 점수 제거
        // -------------------------
        removedIds.forEach(id => {
            delete userRecords[id];
        });

        const finalImage = newImage || oldImage;

        // -------------------------
        // 3. 유지 + 신규 재등록
        // -------------------------
        function rebuild(levels, modeName) {

            levels.forEach(level => {

                if (!songData[modeName][level]) {
                    songData[modeName][level] = [];
                }

                let existing = songData[modeName][level].find(
                    s => s.title === newTitle
                );

                if (existing) {
                    // 이미 존재 → 유지
                    existing.title = newTitle;
                    existing.image = finalImage;

                } else {

                    // 새로 추가된 난이도 → 새 ID
                    songData[modeName][level].push({
                        id: crypto.randomUUID(),
                        title: newTitle,
                        image: finalImage
                    });
                }
            });
        }

        rebuild(newSingleLevels, "single");
        rebuild(newDoubleLevels, "double");

        save();

        editingSong = null;

        renderSongs();

        alert("수정 완료");
    }

    if (!file) {
        apply(null);
        return;
    }

    const reader = new FileReader();

    reader.onload = e => {
        apply(e.target.result);
    };

    reader.readAsDataURL(file);
}

function addSong() {
    const title = document.getElementById("title").value;
    const single = document.getElementById("singleLevel").value.split(" ");
    const double = document.getElementById("doubleLevel").value.split(" ");
    const file = document.getElementById("img").files[0];

    if (!title) return alert("제목 입력");

    const reader = new FileReader();

    function process(img) {

        single.forEach(lv => {
            if (!lv) return;
            if (!songData.single[lv]) songData.single[lv] = [];

            songData.single[lv].push({
                id: crypto.randomUUID(),
                title,
                image: img
            });
        });

        double.forEach(lv => {
            if (!lv) return;
            if (!songData.double[lv]) songData.double[lv] = [];

            songData.double[lv].push({
                id: crypto.randomUUID(),
                title,
                image: img
            });
        });

        save();

        // 🔥 핵심: 입력값 초기화
        document.getElementById("title").value = "";
        document.getElementById("singleLevel").value = "";
        document.getElementById("doubleLevel").value = "";
        document.getElementById("img").value = "";

        closeRegister();
        renderSongs();
    }

    reader.onload = (e) => process(e.target.result || "");

    if (file) reader.readAsDataURL(file);
    else process("");
}

function renderLevels() {

    const box = document.getElementById("levelBox");

    if (!box) return;

    box.innerHTML = "";

    const max = mode === "single" ? 26 : 27;

    for (let i = 1; i <= max; i++) {

        const stats = getLevelStats(i);

        const b = document.createElement("button");

        b.innerHTML = `
            <div>Lv.${i}</div>
        `;

        b.onclick = () => {

            currentLevel = i;

            document.getElementById("levelBox").style.display = "none";
            document.querySelector(".mode").style.display = "none";
            document.getElementById("backupArea").style.display = "none";
            document.getElementById("songToolbar").style.display = "flex";

            renderSongs();
        };

        box.appendChild(b);
    }
}

function exportJSON() {
    const blob = new Blob(
        [JSON.stringify({ songData, userRecords })],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "backup.json";
    a.click();
}

function importJSON(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(ev) {
        const data = JSON.parse(ev.target.result);

        songData = data.songData || { single: {}, double: {} };
        userRecords = data.userRecords || {};

        save();
        renderLevels();
        renderSongs();
    };

    reader.readAsText(file);
}

function goBack() {

    currentLevel = null;

    document.getElementById("levelBox").style.display = "block";

    document.querySelector(".mode").style.display = "block";

    document.getElementById("backupArea").style.display = "block";

    document.getElementById("songToolbar").style.display = "none";

    document.getElementById("songList").innerHTML = "";

    // 🔥 추가 (핵심)
    const statsBox = document.getElementById("levelStats");
    if (statsBox) statsBox.innerHTML = "";
}

function handleScoreInput(id, el) {

    let val = el.value;

    if (val === "") {
        delete userRecords[id];
        save();
        return;
    }

    let n = Number(val);

    if (isNaN(n)) {
        el.value = "";
        delete userRecords[id];
        save();
        return;
    }

    if (n > 1000000) n = 1000000;
    if (n < 0) n = 0;

    if (Number(val) !== n) {
        el.value = n;
    }

    userRecords[id] = n;
    save();

    const rankEl = document.getElementById(`rank-${id}`);
    if (!rankEl) return;

    const rankState = getRank(n);

    const rankTextMap = {
        "SSS_RAINBOW": "SSS",
        "SSS": "SSS",
        "SS": "SS",
        "S": "S",
        "-": "-"
    };

    rankEl.className = `rank ${rankState}`;
    rankEl.textContent = rankTextMap[rankState];
}

function getLevelStats(level) {

    const songs = songData?.[mode]?.[level] || [];

    const total = songs.length;

    let cleared = 0;

    songs.forEach(song => {
        const score = Number(userRecords[song.id] || 0);
        if (score >= 1000000) cleared++;
    });

    const percent = total === 0 ? 0 : Math.floor((cleared / total) * 100);

    return { total, cleared, percent };
}

window.onload = () => {
    changeMode("single");
};

window.changeMode = changeMode;
window.addSong = addSong;
window.openRegister = openRegister;
window.closeRegister = closeRegister;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.setScore = setScore;
window.goBack = goBack;
window.randomSong = randomSong;
window.randomUnclearedSong = randomUnclearedSong;
window.findSongForEdit = findSongForEdit;
window.updateSong = updateSong;
window.deleteSong = deleteSong;
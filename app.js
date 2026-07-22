/* =========================================================
   상태 변수
========================================================= */
let currentGame = "rise";      // "rise" | "arcade"
let mode = "single";           // "single" | "double"
let currentLevel = null;
let showUnclearedOnly = false;
let editingSong = null;
let statsOpen = false;

/* =========================================================
   게임/모드 설정
========================================================= */
const GAME_CONFIG = {
    rise: {
        label: "Rise",
        modes: {
            single: { label: "싱글",     start: 1, max: 26, prefix: "S" },
            double: { label: "하프더블", start: 4, max: 28, prefix: "D" }
        }
    },
    arcade: {
        label: "Arcade",
        modes: {
            single: { label: "싱글", start: 1, max: 26, prefix: "S" },
            double: { label: "더블", start: 5, max: 29, prefix: "D" }
        }
    }
};

/* 등록/수정 모달에서 다루는 4개 고정 카테고리 */
const EDIT_CATEGORIES = [
    { game: "rise",   mode: "single", key: "rise_single",   label: "Rise 싱글" },
    { game: "rise",   mode: "double", key: "rise_double",   label: "Rise 하프더블" },
    { game: "arcade", mode: "single", key: "arcade_single", label: "Arcade 싱글" },
    { game: "arcade", mode: "double", key: "arcade_double", label: "Arcade 더블" }
];

/* =========================================================
   랭크 시스템
========================================================= */
const RISE_RANK_INFO = {
    SSS_RAINBOW: { text: "SSS", cls: "SSS_RAINBOW" },
    SSS:         { text: "SSS", cls: "SSS" },
    SS:          { text: "SS",  cls: "SS" },
    S:           { text: "S",   cls: "S" },
    "-":         { text: "-",   cls: "" }
};

function getRiseRank(n) {
    if (n >= 1000000) return "SSS_RAINBOW";
    if (n >= 990000) return "SSS";
    if (n >= 970000) return "SS";
    if (n >= 950000) return "S";
    return "-";
}

const ARCADE_RANK_INFO = {
    SSSap: { text: "SSS+", cls: "arc-SSSap" },
    SSSp: { text: "SSS+", cls: "arc-SSSp" },
    SSS:  { text: "SSS",  cls: "arc-SSS" },
    SSp:  { text: "SS+",  cls: "arc-SSp" },
    SS:   { text: "SS",   cls: "arc-SS" },
    Sp:   { text: "S+",   cls: "arc-Sp" },
    S:    { text: "S",    cls: "arc-S" },
    AAAp: { text: "AAA+", cls: "arc-AAAp" },
    AAA:  { text: "AAA",  cls: "arc-AAA" },
    AAp:  { text: "AA+",  cls: "arc-AAp" },
    AA:   { text: "AA",   cls: "arc-AA" },
    Ap:   { text: "A+",   cls: "arc-Ap" },
    A:    { text: "A",    cls: "arc-A" },
    "-":  { text: "-",    cls: "" }
};

function getArcadeRank(n) {
    if (n == 1000000) return "SSSap";
    if (n >= 995000) return "SSSp";
    if (n >= 990000) return "SSS";
    if (n >= 985000) return "SSp";
    if (n >= 980000) return "SS";
    if (n >= 975000) return "Sp";
    if (n >= 970000) return "S";
    if (n >= 960000) return "AAAp";
    if (n >= 950000) return "AAA";
    if (n >= 925000) return "AAp";
    if (n >= 900000) return "AA";
    if (n >= 825000) return "Ap";
    if (n >= 750000) return "A";
    return "-";
}

function getRankInfo(n) {
    if (currentGame === "rise") {
        return RISE_RANK_INFO[getRiseRank(n)];
    }
    return ARCADE_RANK_INFO[getArcadeRank(n)];
}

/* =========================================================
   데이터 로딩 / 저장 (localStorage)
========================================================= */
function DEFAULT_SONGDATA() {
    return {
        rise:   { single: {}, double: {} },
        arcade: { single: {}, double: {} }
    };
}

function DEFAULT_RECORDS() {
    return { rise: {}, arcade: {} };
}

function safeParse(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
        return null;
    }
}

/* 예전 버전(Rise 단일 구조) 백업/데이터를 새 구조로 자동 변환 */
function normalizeSongData(data) {
    const base = DEFAULT_SONGDATA();
    if (!data) return base;

    if (data.rise || data.arcade) {
        base.rise.single = data.rise?.single || {};
        base.rise.double = data.rise?.double || {};
        base.arcade.single = data.arcade?.single || {};
        base.arcade.double = data.arcade?.double || {};
        return base;
    }

    // 레거시 { single:{}, double:{} } 구조 → Rise로 간주
    if (data.single || data.double) {
        base.rise.single = data.single || {};
        base.rise.double = data.double || {};
        return base;
    }

    return base;
}

function normalizeUserRecords(data) {
    const base = DEFAULT_RECORDS();
    if (!data) return base;

    if (data.rise || data.arcade) {
        base.rise = data.rise || {};
        base.arcade = data.arcade || {};
        return base;
    }

    // 레거시 { songId: score } 구조 → Rise로 간주
    const keys = Object.keys(data);
    const looksLegacy = keys.length > 0 && typeof data[keys[0]] === "number";
    if (looksLegacy) {
        base.rise = data;
        return base;
    }

    return base;
}

let songData = DEFAULT_SONGDATA();
let userRecords = DEFAULT_RECORDS();

function save() {
    // 브라우저 저장소에 자동 저장하지 않음.
    // 데이터는 메모리에만 유지되며, 백업(exportJSON)/불러오기(importJSON)로 직접 관리.
}

/* =========================================================
   공용 헬퍼
========================================================= */
function currentModeConfig() {
    return GAME_CONFIG[currentGame].modes[mode];
}

function currentRecords() {
    return userRecords[currentGame];
}

function parseLevels(str) {
    return (str || "").trim().split(/\s+/).filter(v => v);
}

/* =========================================================
   게임 전환
========================================================= */
function changeGame(g) {
    if (!GAME_CONFIG[g]) return;

    currentGame = g;
    mode = "single";
    currentLevel = null;
    showUnclearedOnly = false;

    const toggleBtn = document.getElementById("toggleBtn");
    if (toggleBtn) toggleBtn.textContent = "100만점 제외 보기";

    updateGameUI();
    renderModeButtons();

    document.getElementById("levelBox").style.display = "block";
    document.getElementById("modeBox").style.display = "flex";
    document.getElementById("backupArea").style.display = "block";
    document.getElementById("songToolbar").style.display = "none";
    document.getElementById("songList").innerHTML = "";

    const statsBox = document.getElementById("levelStats");
    if (statsBox) statsBox.innerHTML = "";

    renderLevels();
    renderDashboard();
    if (statsOpen) renderLevelGraph();
}

function updateGameUI() {
    const titleEl = document.getElementById("gameTitle");
    if (titleEl) titleEl.textContent = `🎮 ${GAME_CONFIG[currentGame].label} 기록지`;

    document.querySelectorAll(".game-select button").forEach(btn => {
        btn.classList.toggle("active-game", btn.dataset.game === currentGame);
    });
}

function renderModeButtons() {
    const box = document.getElementById("modeBox");
    if (!box) return;
    box.innerHTML = "";

    const modes = GAME_CONFIG[currentGame].modes;
    Object.keys(modes).forEach((key, idx) => {
        const btn = document.createElement("button");
        btn.textContent = modes[key].label;
        btn.className = idx === 0 ? "mode-single" : "mode-double";
        btn.onclick = () => changeMode(key);
        box.appendChild(btn);
    });
}

/* =========================================================
   모드 전환
========================================================= */
function changeMode(m) {
    mode = m;
    currentLevel = null;

    const levelBox = document.getElementById("levelBox");
    const songToolbar = document.getElementById("songToolbar");
    const backupArea = document.getElementById("backupArea");
    const modeBox = document.getElementById("modeBox");

    if (modeBox) modeBox.style.display = "flex";
    if (backupArea) backupArea.style.display = "block";
    if (levelBox) levelBox.style.display = "block";
    if (songToolbar) songToolbar.style.display = "none";

    document.getElementById("songList").innerHTML = "";

    const statsBox = document.getElementById("levelStats");
    if (statsBox) statsBox.innerHTML = "";

    renderLevels();

    if (statsOpen) {
        renderLevelGraph();
    }
}

/* =========================================================
   레벨 목록
========================================================= */
function renderLevels() {
    const box = document.getElementById("levelBox");
    if (!box) return;
    box.innerHTML = "";

    const cfg = currentModeConfig();

    for (let i = cfg.start; i <= cfg.max; i++) {
        const b = document.createElement("button");
        b.innerHTML = `<div>Lv.${i}</div>`;
        b.onclick = () => {
            currentLevel = i;
            document.getElementById("levelBox").style.display = "none";
            document.getElementById("modeBox").style.display = "none";
            document.getElementById("backupArea").style.display = "none";
            document.getElementById("songToolbar").style.display = "flex";
            renderSongs();
        };
        box.appendChild(b);
    }
}

/* =========================================================
   곡 목록
========================================================= */
function renderSongs() {
    const list = document.getElementById("songList");
    list.innerHTML = "";

    const statsBox = document.getElementById("levelStats");
    const records = currentRecords();
    const cfg = currentModeConfig();

    let songs = songData?.[currentGame]?.[mode]?.[currentLevel] || [];

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
            const score = Number(records[song.id] || 0);
            return score < 1000000;
        });
    }

    // 정렬: 숫자 → 영어 → 한글
    songs = [...songs].sort((a, b) => {
        const getType = (title) => {
            const first = title.trim()[0];
            if (/[0-9]/.test(first)) return 0;
            if (/[a-zA-Z]/.test(first)) return 1;
            return 2;
        };

        const typeA = getType(a.title);
        const typeB = getType(b.title);

        if (typeA !== typeB) return typeA - typeB;
        return a.title.localeCompare(b.title, "ko");
    });

    if (currentLevel && statsBox) {
        const stats = getLevelStats(currentLevel);

        statsBox.innerHTML = `
            <div style="text-align:center;font-size:18px;font-weight:bold;">
                ${cfg.prefix}${currentLevel}
                올퍼펙 비율 ${stats.percent}%
                (${stats.cleared}/${stats.total})
            </div>
        `;
    } else if (statsBox) {
        statsBox.innerHTML = "";
    }

    songs.forEach(song => {
        const score = records[song.id] ?? "";
        const n = Number(score);
        const info = getRankInfo(n);

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
            />
            <div id="rank-${song.id}" class="rank ${info.cls}">
                ${info.text}
            </div>
        `;

        list.appendChild(div);
    });

    renderDashboard();
    renderLevelGraph();
}

/* =========================================================
   점수 입력
========================================================= */
function handleScoreInput(id, el) {
    const records = currentRecords();
    let val = el.value;

    if (val.trim() === "") {
        delete records[id];
        save();
        updateRankOnly(id);
        renderDashboard();
        if (statsOpen) renderLevelGraph();
        return;
    }

    let n = Number(val);
    if (isNaN(n)) return;

    if (n > 1000000) n = 1000000;
    if (n < 0) n = 0;

    records[id] = n;
    save();

    if (Number(val) !== n) {
        el.value = n;
    }

    if (showUnclearedOnly && n === 1000000) {
        renderSongs();
    } else {
        updateRankOnly(id, n);
        renderDashboard();

        const statsBox = document.getElementById("levelStats");
        if (currentLevel && statsBox) {
            const stats = getLevelStats(currentLevel);
            const cfg = currentModeConfig();
            statsBox.innerHTML = `
                <div style="text-align:center;font-size:18px;font-weight:bold;">
                    ${cfg.prefix}${currentLevel}
                    올퍼펙 비율 ${stats.percent}%
                    (${stats.cleared}/${stats.total})
                </div>
            `;
        }
        if (statsOpen) renderLevelGraph();
    }
}

function updateRankOnly(id, n) {
    if (n === undefined) n = Number(currentRecords()[id] || 0);

    const rankEl = document.getElementById(`rank-${id}`);
    if (!rankEl) return;

    const info = getRankInfo(n);
    rankEl.className = `rank ${info.cls}`;
    rankEl.textContent = info.text;
}

/* =========================================================
   검색 / 랜덤 / 필터
========================================================= */
function toggleUncleared() {
    showUnclearedOnly = !showUnclearedOnly;
    const btn = document.getElementById("toggleBtn");
    btn.textContent = showUnclearedOnly ? "전체 곡 보기" : "100만점 제외 보기";
    renderSongs();
}

function randomSong() {
    let songs = songData?.[currentGame]?.[mode]?.[currentLevel] || [];
    if (!songs.length) {
        alert("곡이 없습니다.");
        return;
    }
    const song = songs[Math.floor(Math.random() * songs.length)];
    alert("🎲 랜덤 곡\n\n" + song.title);
}

function randomUnclearedSong() {
    const records = currentRecords();
    let songs = songData?.[currentGame]?.[mode]?.[currentLevel] || [];
    songs = songs.filter(song => {
        const score = Number(records[song.id] || 0);
        return score < 1000000;
    });

    if (!songs.length) {
        alert("100만점 미달성 곡이 없습니다.");
        return;
    }
    const song = songs[Math.floor(Math.random() * songs.length)];
    alert("🎲 100만점 제외 랜덤\n\n" + song.title);
}

function goBack() {
    currentLevel = null;
    document.getElementById("levelBox").style.display = "block";
    document.getElementById("modeBox").style.display = "flex";
    document.getElementById("backupArea").style.display = "block";
    document.getElementById("songToolbar").style.display = "none";
    document.getElementById("songList").innerHTML = "";

    const statsBox = document.getElementById("levelStats");
    if (statsBox) statsBox.innerHTML = "";

    renderLevels();
}

/* =========================================================
   등록 모달
========================================================= */
function openRegister() {
    document.getElementById("registerModal").style.display = "block";
}

function closeRegister() {
    document.getElementById("registerModal").style.display = "none";
}

/* =========================================================
   개발자 패널
   - 제목을 짧은 시간 안에 5번 클릭하면 열림 (실수로 노출 방지)
   - 배포용 곡 목록(이미지/점수 제외) 내보내기
   - 전체 게임의 점수 기록 완전 삭제 (곡 목록/난이도는 유지)
========================================================= */
let devClickCount = 0;
let devClickTimer = null;

function handleTitleClick() {
    devClickCount++;
    clearTimeout(devClickTimer);
    devClickTimer = setTimeout(() => { devClickCount = 0; }, 1500);

    if (devClickCount >= 5) {
        devClickCount = 0;
        openDevPanel();
    }
}

function openDevPanel() {
    const input = document.getElementById("devConfirmInput");
    if (input) input.value = "";
    document.getElementById("devModal").style.display = "block";
}

function closeDevPanel() {
    document.getElementById("devModal").style.display = "none";
}

/* 배포용: 이미지 + 개인 점수 기록을 제외한 곡 제목/난이도만 내보내기 */
function exportSongListOnly() {
    function stripImages(bucket) {
        const out = {};
        Object.keys(bucket).forEach(level => {
            out[level] = (bucket[level] || []).map(song => ({
                id: song.id,
                title: song.title
            }));
        });
        return out;
    }

    const releaseData = {
        songData: {
            rise: {
                single: stripImages(songData.rise.single),
                double: stripImages(songData.rise.double)
            },
            arcade: {
                single: stripImages(songData.arcade.single),
                double: stripImages(songData.arcade.double)
            }
        }
    };

    const blob = new Blob(
        [JSON.stringify(releaseData)],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "song_list_release.json";
    a.click();
    URL.revokeObjectURL(url);

    closeDevPanel();
}

/* 전체 점수 기록(Rise + Arcade) 완전 삭제. 곡 목록/난이도/이미지는 그대로 유지 */
const DEV_RESET_KEYWORD = "삭제";

function resetAllRecords() {
    const input = document.getElementById("devConfirmInput");
    const value = input ? input.value.trim() : "";

    if (value !== DEV_RESET_KEYWORD) {
        alert(`확인 문구가 일치하지 않습니다. "${DEV_RESET_KEYWORD}"를 정확히 입력하세요.`);
        return;
    }

    userRecords = DEFAULT_RECORDS();
    save();

    if (currentLevel) renderSongs();
    renderDashboard();
    if (statsOpen) renderLevelGraph();

    closeDevPanel();
    alert("모든 게임의 점수 기록이 삭제되었습니다. (곡 목록은 유지됨)");
}

/* 곡 등록: Rise 싱글 / Rise 하프더블 / Arcade 싱글 / Arcade 더블 4개 레벨 입력 + 공통 이미지 */
function addSong() {
    const title = document.getElementById("title").value.trim();
    const file = document.getElementById("img").files[0];

    const levelInputs = {
        rise_single:   parseLevels(document.getElementById("riseSingleLevel").value),
        rise_double:   parseLevels(document.getElementById("riseDoubleLevel").value),
        arcade_single: parseLevels(document.getElementById("arcadeSingleLevel").value),
        arcade_double: parseLevels(document.getElementById("arcadeDoubleLevel").value)
    };

    if (!title) return alert("제목 입력");

    const hasAnyLevel = Object.values(levelInputs).some(arr => arr.length > 0);
    if (!hasAnyLevel) return alert("레벨을 하나 이상 입력하세요.");

    const reader = new FileReader();

    function process(img) {
        EDIT_CATEGORIES.forEach(cat => {
            const levels = levelInputs[cat.key];
            levels.forEach(lv => {
                if (!lv) return;
                const bucket = songData[cat.game][cat.mode];
                if (!bucket[lv]) bucket[lv] = [];
                bucket[lv].push({
                    id: crypto.randomUUID(),
                    title,
                    image: img
                });
            });
        });

        save();

        document.getElementById("title").value = "";
        document.getElementById("riseSingleLevel").value = "";
        document.getElementById("riseDoubleLevel").value = "";
        document.getElementById("arcadeSingleLevel").value = "";
        document.getElementById("arcadeDoubleLevel").value = "";
        document.getElementById("img").value = "";

        closeRegister();
        renderLevels();
        if (currentLevel) renderSongs();
        renderDashboard();
        if (statsOpen) renderLevelGraph();
    }

    reader.onload = (e) => process(e.target.result || "");
    if (file) reader.readAsDataURL(file);
    else process("");
}

/* 곡 검색 (4개 카테고리 전체에서 제목 일치 검색) */
function findSongForEdit() {
    const keyword = document.getElementById("editSearch").value.trim().toLowerCase();
    if (!keyword) return;

    let foundTitle = null;
    let foundImage = "";
    const levels = { rise_single: [], rise_double: [], arcade_single: [], arcade_double: [] };

    EDIT_CATEGORIES.forEach(cat => {
        const bucket = songData[cat.game][cat.mode];
        Object.keys(bucket).forEach(level => {
            (bucket[level] || []).forEach(song => {
                if (song.title.toLowerCase() === keyword) {
                    foundTitle = song.title;
                    foundImage = song.image || foundImage;
                    levels[cat.key].push(level);
                }
            });
        });
    });

    if (!foundTitle) {
        alert("곡을 찾을 수 없습니다.");
        return;
    }

    editingSong = { title: foundTitle };

    document.getElementById("editArea").style.display = "block";
    document.getElementById("editTitle").value = foundTitle;
    document.getElementById("editRiseSingle").value = levels.rise_single.join(" ");
    document.getElementById("editRiseDouble").value = levels.rise_double.join(" ");
    document.getElementById("editArcadeSingle").value = levels.arcade_single.join(" ");
    document.getElementById("editArcadeDouble").value = levels.arcade_double.join(" ");

    const preview = document.getElementById("editPreview");
    if (preview) {
        preview.src = foundImage;
        preview.style.display = foundImage ? "block" : "none";
    }
}

/* 곡 삭제: 4개 카테고리에서 모두 제거 + 관련 점수 기록도 함께 삭제 */
function deleteSong() {
    if (!editingSong) return;

    EDIT_CATEGORIES.forEach(cat => {
        const bucket = songData[cat.game][cat.mode];
        Object.keys(bucket).forEach(level => {
            bucket[level] = (bucket[level] || []).filter(song => {
                if (song.title === editingSong.title) {
                    delete userRecords[cat.game][song.id];
                    return false;
                }
                return true;
            });
        });
    });

    save();
    editingSong = null;
    document.getElementById("editArea").style.display = "none";
    alert("삭제 완료");

    renderLevels();
    if (currentLevel) renderSongs();
    renderDashboard();
    if (statsOpen) renderLevelGraph();
}

/* 곡 수정: 4개 카테고리 레벨/제목/이미지(공통) 모두 수정 가능
   - 기존 레벨이 그대로 유지되는 경우 id를 보존하여 점수 기록이 사라지지 않도록 처리 */
function updateSong() {
    if (!editingSong) return;

    const newTitle = document.getElementById("editTitle").value.trim();
    if (!newTitle) return alert("제목을 입력하세요.");

    const newLevels = {
        rise_single:   parseLevels(document.getElementById("editRiseSingle").value),
        rise_double:   parseLevels(document.getElementById("editRiseDouble").value),
        arcade_single: parseLevels(document.getElementById("editArcadeSingle").value),
        arcade_double: parseLevels(document.getElementById("editArcadeDouble").value)
    };
    const file = document.getElementById("editImg").files[0];

    function apply(newImage) {
        let oldImage = "";
        const perCategoryOldEntries = {};

        // 1) 기존 항목들을 찾아서 제거하고, 레벨별 기존 entry(=id 보존용)를 수집
        EDIT_CATEGORIES.forEach(cat => {
            const bucket = songData[cat.game][cat.mode];
            const oldEntryByLevel = {};

            Object.keys(bucket).forEach(level => {
                bucket[level] = (bucket[level] || []).filter(song => {
                    if (song.title !== editingSong.title) return true;
                    oldImage = song.image || oldImage;
                    oldEntryByLevel[level] = song;
                    return false;
                });
            });

            perCategoryOldEntries[cat.key] = oldEntryByLevel;
        });

        const finalImage = newImage || oldImage;

        // 2) 더 이상 포함되지 않는 레벨의 점수 기록 삭제 + 새 레벨 목록으로 재구성
        EDIT_CATEGORIES.forEach(cat => {
            const bucket = songData[cat.game][cat.mode];
            const wantedLevels = newLevels[cat.key];
            const oldEntryByLevel = perCategoryOldEntries[cat.key];
            const wantedSet = new Set(wantedLevels);

            Object.keys(oldEntryByLevel).forEach(level => {
                if (!wantedSet.has(level)) {
                    delete userRecords[cat.game][oldEntryByLevel[level].id];
                }
            });

            wantedLevels.forEach(level => {
                if (!bucket[level]) bucket[level] = [];
                const old = oldEntryByLevel[level];
                bucket[level].push({
                    id: old ? old.id : crypto.randomUUID(),
                    title: newTitle,
                    image: finalImage
                });
            });
        });

        save();
        editingSong = null;
        document.getElementById("editArea").style.display = "none";

        renderLevels();
        if (currentLevel) renderSongs();
        renderDashboard();
        if (statsOpen) renderLevelGraph();

        alert("수정 완료");
    }

    if (!file) {
        apply(null);
        return;
    }

    const reader = new FileReader();
    reader.onload = e => { apply(e.target.result); };
    reader.readAsDataURL(file);
}

/* =========================================================
   통계 (게임별 완전 독립 계산)
========================================================= */
function getLevelStats(level) {
    const songs = songData?.[currentGame]?.[mode]?.[level] || [];
    const records = currentRecords();
    const total = songs.length;
    let cleared = 0;

    songs.forEach(song => {
        const score = Number(records[song.id] || 0);
        if (score >= 1000000) cleared++;
    });

    const percent = total === 0 ? 0 : Math.floor((cleared / total) * 100);
    return { total, cleared, percent };
}

function getGlobalStats() {
    const modeCfg = GAME_CONFIG[currentGame].modes;
    const records = currentRecords();
    const modes = {};
    let totalAll = 0, clearedAll = 0;

    Object.keys(modeCfg).forEach(modeName => {
        let total = 0, cleared = 0;
        const bucket = songData[currentGame][modeName];

        Object.keys(bucket).forEach(level => {
            (bucket[level] || []).forEach(song => {
                total++;
                const score = Number(records[song.id] || 0);
                if (score >= 1000000) cleared++;
            });
        });

        const percent = total === 0 ? 0 : Math.floor((cleared / total) * 100);
        modes[modeName] = { total, cleared, percent, label: modeCfg[modeName].label };

        totalAll += total;
        clearedAll += cleared;
    });

    const percentAll = totalAll === 0 ? 0 : Math.floor((clearedAll / totalAll) * 100);

    return { modes, totalAll, clearedAll, percentAll };
}

function renderDashboard() {
    const box = document.getElementById("dashboard");
    if (!box) return;

    const stats = getGlobalStats();
    const modeKeys = Object.keys(stats.modes);
    const colors = ["#ff4757", "#1e90ff"];

    const modeLine = modeKeys.map((k, idx) => {
        const m = stats.modes[k];
        return `<span style="color:${colors[idx % colors.length]};font-weight:bold;">${m.label}</span> ${m.total}곡 / 올퍼펙 ${m.cleared}개 (${m.percent}%)`;
    }).join('<span style="color:#555;margin:0 15px;">|</span>');

    box.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 8px; letter-spacing: 0.5px;">
            <span style="color: #fff; font-weight: bold;">${GAME_CONFIG[currentGame].label} 전체</span>
            ${stats.totalAll}곡 / 올퍼펙 ${stats.clearedAll}개 (${stats.percentAll}%)
        </div>

        <div style="width: 200px; height: 1px; background: #444; margin: 6px auto 10px auto;"></div>

        <div style="font-size: 14px; color: #ccc;">
            ${modeLine}
        </div>
    `;
}

function renderLevelGraph() {
    const box = document.getElementById("levelGraph");
    if (!box) return;

    const cfg = currentModeConfig();
    box.innerHTML = "";

    for (let i = cfg.start; i <= cfg.max; i++) {
        const stats = getLevelStats(i);
        const percent = stats.total === 0 ? 0 : (stats.cleared / stats.total) * 100;

        const row = document.createElement("div");
        row.className = "graph-row";

        row.innerHTML = `
            <div style="width:60px;">${cfg.prefix}${i}</div>
            <div style="flex:1; background:#333; height:10px; border-radius:4px;">
                <div class="graph-bar" style="width:${percent}%"></div>
            </div>
            <div style="width:60px; text-align:right;">
                ${stats.cleared}/${stats.total}
            </div>
        `;

        box.appendChild(row);
    }
}

function toggleStats() {
    statsOpen = !statsOpen;

    const graph = document.getElementById("levelGraph");
    const btn = document.getElementById("toggleStatsBtn");

    if (!graph || !btn) return;

    if (statsOpen) {
        graph.style.display = "block";
        btn.textContent = "📊 통계 접기";
        renderLevelGraph();
    } else {
        graph.style.display = "none";
        btn.textContent = "📊 통계 펼치기";
    }
}

/* =========================================================
   백업 / 불러오기 (새 데이터 구조 저장, 구버전 백업 자동 변환)
========================================================= */
function exportJSON() {
    const blob = new Blob(
        [JSON.stringify({ songData, userRecords })],
        { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rise_arcade_backup.json";
    a.click();
}

function importJSON(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function (ev) {
        try {
            const data = JSON.parse(ev.target.result);
            songData = normalizeSongData(data.songData);
            userRecords = normalizeUserRecords(data.userRecords);

            save();
            changeGame(currentGame);
        } catch (err) {
            alert("불러오기 실패: 올바른 백업 파일이 아닙니다.");
        } finally {
            e.target.value = "";
        }
    };
    reader.readAsText(file);
}

/* =========================================================
   초기화
========================================================= */
window.onload = () => {
    changeGame("rise");
};

window.changeGame = changeGame;
window.changeMode = changeMode;
window.addSong = addSong;
window.openRegister = openRegister;
window.closeRegister = closeRegister;
window.exportJSON = exportJSON;
window.importJSON = importJSON;
window.goBack = goBack;
window.randomSong = randomSong;
window.randomUnclearedSong = randomUnclearedSong;
window.toggleUncleared = toggleUncleared;
window.toggleStats = toggleStats;
window.findSongForEdit = findSongForEdit;
window.updateSong = updateSong;
window.deleteSong = deleteSong;
window.handleScoreInput = handleScoreInput;
window.renderSongs = renderSongs;
window.handleTitleClick = handleTitleClick;
window.openDevPanel = openDevPanel;
window.closeDevPanel = closeDevPanel;
window.exportSongListOnly = exportSongListOnly;
window.resetAllRecords = resetAllRecords;
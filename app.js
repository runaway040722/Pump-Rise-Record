let songData;
let userRecords;
let mode = "single";
let currentLevel = null;
let showUnclearedOnly = false;
let editingSong = null;
let statsOpen = false;

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

    const levelBox = document.getElementById("levelBox");
    const songToolbar = document.getElementById("songToolbar");
    const backupArea = document.getElementById("backupArea");
    const modeBox = document.querySelector(".mode");

    if (modeBox) modeBox.style.display = "block";
    if (backupArea) backupArea.style.display = "block";
    if (levelBox) levelBox.style.display = "block";
    if (songToolbar) songToolbar.style.display = "none";

    document.getElementById("songList").innerHTML = "";

    // 1. 선택한 모드(싱글 1~26 / 더블 4~27)에 맞게 레벨 버튼 재배치
    renderLevels();

    // 🔴 [핵심 수정] 통계가 펼쳐져 있는 상태라면, 전환된 모드에 맞춰 그래프도 즉시 실시간 갱신!
    if (statsOpen) {
        renderLevelGraph();
    }
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

    // 🔥 정렬 추가
songs.sort((a, b) => {

    const getType = (title) => {

        const first = title.trim()[0];

        // 숫자 시작
        if (/[0-9]/.test(first)) return 0;

        // 영어 시작
        if (/[a-zA-Z]/.test(first)) return 1;

        // 나머지 (한글 포함)
        return 2;
    };

    const typeA = getType(a.title);
    const typeB = getType(b.title);

    // 1차 정렬: 숫자 → 영어 → 한글
    if (typeA !== typeB) return typeA - typeB;

    // 2차 정렬: 내부 알파벳 정렬
    return a.title.localeCompare(b.title, "ko");
});

    if (currentLevel && statsBox) {
        const stats = getLevelStats(currentLevel);

        statsBox.innerHTML = `
            <div style="text-align:center;font-size:18px;font-weight:bold;">
                ${mode === "single" ? "S" : "D"}${currentLevel}
                올퍼펙 비율 ${stats.percent}%
                (${stats.cleared}/${stats.total})
            </div>
        `;
    } else if (statsBox) {
        statsBox.innerHTML = "";
    }

    songs.forEach(song => {

        const score = userRecords[song.id] ?? "";
        const n = Number(score);

        const rankState = getRank(n);

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
            />

            <div id="rank-${song.id}" class="rank ${rankState}">
                ${rankTextMap[rankState]}
            </div>
        `;

        list.appendChild(div);
    });

    renderDashboard();
    renderLevelGraph();
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

    // 🔴 모드에 따라 시작 레벨과 최대 레벨 설정 (더블은 4부터)
    const start = mode === "single" ? 1 : 4;
    const max = mode === "single" ? 26 : 27;

    // start부터 반복문을 돌려 버튼 생성
    for (let i = start; i <= max; i++) {
        const stats = getLevelStats(i);
        const b = document.createElement("button");
        b.innerHTML = `<div>Lv.${i}</div>`;
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

    if (val.trim() === "") {
        delete userRecords[id];
        save();
        updateRankOnly(id);
        
        // 데이터가 바뀌었으므로 상단 대시보드와 통계도 실시간 갱신
        renderDashboard();
        if (statsOpen) renderLevelGraph();
        return;
    }

    let n = Number(val);
    if (isNaN(n)) return;

    if (n > 1000000) n = 1000000;
    if (n < 0) n = 0;

    userRecords[id] = n;
    save();

    if (Number(val) !== n) {
        el.value = n;
    }

    // 🔴 [수정 및 추가 핵심 로직]
    // 만약 '100만점 제외' 필터가 켜져 있고, 방금 입력한 점수가 100만점이라면 목록에서 즉시 지워야 하므로 전체 리렌더링
    if (showUnclearedOnly && n === 1000000) {
        renderSongs(); 
    } else {
        // 그 외의 경우(필터가 꺼져있거나 100만점이 아닐 때)는 렉 줄이기를 위해 랭크와 상단 대시보드만 즉시 반영
        updateRankOnly(id, n);
        renderDashboard();
        
        // 현재 레벨 통계 문자열(올퍼펙 비율)도 실시간 업데이트
        const statsBox = document.getElementById("levelStats");
        if (currentLevel && statsBox) {
            const stats = getLevelStats(currentLevel);
            statsBox.innerHTML = `
                <div style="text-align:center;font-size:18px;font-weight:bold;">
                    ${mode === "single" ? "S" : "D"}${currentLevel}
                    올퍼펙 비율 ${stats.percent}%
                    (${stats.cleared}/${stats.total})
                </div>
            `;
        }
        if (statsOpen) renderLevelGraph();
    }
}

function updateRankOnly(id, n = userRecords[id] || 0) {

    const rankEl = document.getElementById(`rank-${id}`);
    if (!rankEl) return;

    const rankState = getRank(n);

    const map = {
        "SSS_RAINBOW": "SSS",
        "SSS": "SSS",
        "SS": "SS",
        "S": "S",
        "-": "-"
    };

    rankEl.className = `rank ${rankState}`;
    rankEl.textContent = map[rankState];
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

function getGlobalStats() {

    let total = 0;
    let cleared = 0;
    let sss = 0;
    let uncleared = 0;

    Object.keys(songData).forEach(modeKey => {
        Object.keys(songData[modeKey]).forEach(level => {
            songData[modeKey][level].forEach(song => {

                total++;

                const score = Number(userRecords[song.id] || 0);

                if (score >= 1000000) {
                    cleared++;
                    sss++;
                } else {
                    uncleared++;
                }
            });
        });
    });

    const percent = total === 0 ? 0 : Math.floor((cleared / total) * 100);

    return { total, cleared, sss, uncleared, percent };
}

function renderLevelGraph() {
    const box = document.getElementById("levelGraph");
    if (!box) return;

    // 🔴 모드에 따라 시작 레벨과 최대 레벨을 유동적으로 설정
    const start = mode === "single" ? 1 : 4;
    const max = mode === "single" ? 26 : 27;
    
    box.innerHTML = "";

    // start(싱글은 1, 더블은 4)부터 반복문 시작
    for (let i = start; i <= max; i++) {
        const stats = getLevelStats(i);
        const percent = stats.total === 0 ? 0 : (stats.cleared / stats.total) * 100;

        const row = document.createElement("div");
        row.className = "graph-row";

        const modePrefix = mode === "single" ? "S" : "D";

        row.innerHTML = `
            <div style="width:60px;">${modePrefix}${i}</div>
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

function renderDashboard() {

    const box = document.getElementById("dashboard");
    if (!box) return;

    const stats = getGlobalStats();

    box.innerHTML = `
        전체 곡 ${stats.total}개 |
        올퍼펙 ${stats.cleared}개 |
        미클리어 ${stats.uncleared}개 |
        올퍼펙률 ${stats.percent}%
    `;
}

function toggleStats() {

    statsOpen = !statsOpen;

    const graph = document.getElementById("levelGraph");
    const btn = document.getElementById("toggleStatsBtn");

    if (!graph || !btn) return;

    if (statsOpen) {
        graph.style.display = "block";
        btn.textContent = "📊 통계 접기";
        renderLevelGraph(); // 열릴 때만 렌더
    } else {
        graph.style.display = "none";
        btn.textContent = "📊 통계 펼치기";
    }
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
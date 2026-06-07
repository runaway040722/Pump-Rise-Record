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

    // 🔴 통계가 펼쳐져 있는 상태라면, 전환된 모드에 맞춰 그래프도 즉시 실시간 갱신!
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

    // 🔥 정렬: 숫자 → 영어 → 한글
    songs.sort((a, b) => {
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

    if (n > 1000000) n = 1000000;
    if (n < 0) n = 0;

    userRecords[id] = n;
    save();

    const inputEl = document.querySelector(`input[oninput*="${id}"]`);
    if (inputEl) {
        inputEl.value = n;
    }

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
    btn.textContent = showUnclearedOnly ? "전체 곡 보기" : "100만점 제외 보기";
    renderSongs();
}

function randomSong() {
    let songs = songData?.[mode]?.[currentLevel] || [];
    if (!songs.length) {
        alert("곡이 없습니다.");
        return;
    }
    const song = songs[Math.floor(Math.random() * songs.length)];
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
    const song = songs[Math.floor(Math.random() * songs.length)];
    alert("🎲 100만점 제외 랜덤\n\n" + song.title);
}

function openRegister() {
    document.getElementById("registerModal").style.display = "block";
}

function closeRegister() {
    document.getElementById("registerModal").style.display = "none";
}

function findSongForEdit() {
    const keyword = document.getElementById("editSearch").value.trim().toLowerCase();
    if (!keyword) return;

    let foundTitle = null;
    let foundImage = "";

    const singleLevels = [];
    const doubleLevels = [];
    const singleMap = new Map();
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

    editingSong = { title: foundTitle, singleMap, doubleMap };

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
            songData[modeName][level] = songData[modeName][level].filter(song =>
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

    const newTitle = document.getElementById("editTitle").value.trim();
    const newSingleLevels = document.getElementById("editSingle").value.trim().split(" ").filter(v => v);
    const newDoubleLevels = document.getElementById("editDouble").value.trim().split(" ").filter(v => v);
    const file = document.getElementById("editImg").files[0];

    function apply(newImage) {
        let oldImage = "";
        const keptRecords = new Map();
        const removedIds = [];

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

        removedIds.forEach(id => { delete userRecords[id]; });
        const finalImage = newImage || oldImage;

        function rebuild(levels, modeName) {
            levels.forEach(level => {
                if (!songData[modeName][level]) songData[modeName][level] = [];
                let existing = songData[modeName][level].find(s => s.title === newTitle);

                if (existing) {
                    existing.title = newTitle;
                    existing.image = finalImage;
                } else {
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
    reader.onload = e => { apply(e.target.result); };
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

    const start = mode === "single" ? 1 : 4;
    const max = mode === "single" ? 26 : 27;

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

    const statsBox = document.getElementById("levelStats");
    if (statsBox) statsBox.innerHTML = "";
}

function handleScoreInput(id, el) {
    let val = el.value;

    if (val.trim() === "") {
        delete userRecords[id];
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

    userRecords[id] = n;
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

// 🟢 [수정 완료] 싱글과 더블의 전적을 완전히 독립적으로 산출하는 글로벌 통계 함수
function getGlobalStats() {
    let singleTotal = 0, singleCleared = 0;
    let doubleTotal = 0, doubleCleared = 0;

    if (songData && songData.single) {
        Object.keys(songData.single).forEach(level => {
            if (Array.isArray(songData.single[level])) {
                songData.single[level].forEach(song => {
                    singleTotal++;
                    const score = Number(userRecords[song.id] || 0);
                    if (score >= 1000000) singleCleared++;
                });
            }
        });
    }

    if (songData && songData.double) {
        Object.keys(songData.double).forEach(level => {
            if (Array.isArray(songData.double[level])) {
                songData.double[level].forEach(song => {
                    doubleTotal++;
                    const score = Number(userRecords[song.id] || 0);
                    if (score >= 1000000) doubleCleared++;
                });
            }
        });
    }

    const singlePercent = singleTotal === 0 ? 0 : Math.floor((singleCleared / singleTotal) * 100);
    const doublePercent = doubleTotal === 0 ? 0 : Math.floor((doubleCleared / doubleTotal) * 100);

    return {
        singleTotal, singleCleared, singlePercent,
        doubleTotal, doubleCleared, doublePercent
    };
}

function renderDashboard() {
    const box = document.getElementById("dashboard");
    if (!box) return;

    const stats = getGlobalStats();
    
    // 싱글 + 더블 데이터 합산
    const totalSongs = stats.singleTotal + stats.doubleTotal;
    const totalCleared = stats.singleCleared + stats.doubleCleared;
    const totalPercent = totalSongs === 0 ? 0 : Math.floor((totalCleared / totalSongs) * 100);

    box.innerHTML = `
        <div style="font-size: 18px; margin-bottom: 8px; letter-spacing: 0.5px;">
            <span style="color: #fff; font-weight: bold;">전체</span> ${totalSongs}곡 / 올퍼펙 ${totalCleared}개 (${totalPercent}%)
        </div>
        
        <div style="width: 200px; height: 1px; background: #444; margin: 6px auto 10px auto;"></div>

        <div style="font-size: 14px; color: #ccc;">
            <span style="color: #ff4757; font-weight: bold;">싱글</span> ${stats.singleTotal}곡 / 올퍼펙 ${stats.singleCleared}개 (${stats.singlePercent}%)
            <span style="color: #555; margin: 0 15px;">|</span>
            <span style="color: #1e90ff; font-weight: bold;">더블</span> ${stats.doubleTotal}곡 / 올퍼펙 ${stats.doubleCleared}개 (${stats.doublePercent}%)
        </div>
    `;
}
function renderLevelGraph() {
    const box = document.getElementById("levelGraph");
    if (!box) return;

    const start = mode === "single" ? 1 : 4;
    const max = mode === "single" ? 26 : 27;
    
    box.innerHTML = "";

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
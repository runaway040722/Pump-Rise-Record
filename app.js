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

function renderLevels() {

    const box = document.getElementById("levelBox");

    if (!box) return;

    box.innerHTML = "";

    const max = mode === "single" ? 26 : 27;

    for (let i = 1; i <= max; i++) {

        const b = document.createElement("button");

        b.innerText = "Lv." + i;

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
function renderSongs() {
    const list = document.getElementById("songList");
    list.innerHTML = "";

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

    songs.forEach(song => {

        const score = userRecords[song.id] || "";

        const rankState = getRank(score);

        const rankTextMap = {
            "SSS_RAINBOW": "SSS",
            "SSS": "SSS",
            "SS": "SS",
            "S": "S",
            "-": "-"
        };

        const rankText = rankTextMap[rankState];

        const div = document.createElement("div");
        div.className = "song";

        div.innerHTML = `
            <img src="${song.image || ''}" />

            <div class="song-title">
                ${song.title}
            </div>

            <input
                value="${score}"
                oninput="setScore('${song.id}', this.value)"
            >

            <div class="rank ${rankState}">
                ${rankText}
            </div>
        `;

        list.appendChild(div);
    });
}

function setScore(id, val) {
    if (val === "") {
        delete userRecords[id];
    } else {
        const n = Number(val);
        if (isNaN(n)) return;
        userRecords[id] = n;
    }

    save();
    renderSongs();
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

    const singleLevels = [];
    const doubleLevels = [];

    let foundImage = "";

    Object.keys(songData.single).forEach(level => {

        songData.single[level].forEach(song => {

            if (
                song.title.toLowerCase() === keyword
            ) {

                foundTitle = song.title;

                singleLevels.push(level);

                foundImage = song.image || "";
            }

        });

    });

    Object.keys(songData.double).forEach(level => {

        songData.double[level].forEach(song => {

            if (
                song.title.toLowerCase() === keyword
            ) {

                foundTitle = song.title;

                doubleLevels.push(level);

                if (!foundImage)
                    foundImage = song.image || "";
            }

        });

    });

    if (!foundTitle) {

        alert("곡을 찾을 수 없습니다.");

        return;
    }

    editingSong = {
        title: foundTitle
    };

    document.getElementById("editArea").style.display =
        "block";

    document.getElementById("editTitle").value =
        foundTitle;

    document.getElementById("editSingle").value =
        singleLevels.join(" ");

    document.getElementById("editDouble").value =
        doubleLevels.join(" ");

    const preview =
        document.getElementById("editPreview");

    if (preview) {

        preview.src = foundImage;

        preview.style.display =
            foundImage ? "block" : "none";
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

    const singleLevels =
        document.getElementById("editSingle")
        .value
        .trim()
        .split(" ")
        .filter(v => v);

    const doubleLevels =
        document.getElementById("editDouble")
        .value
        .trim()
        .split(" ")
        .filter(v => v);

    const file =
        document.getElementById("editImg")
        .files[0];

    function apply(newImage) {

        let oldImage = "";

        /* 기존 곡 삭제 */
        ["single", "double"].forEach(modeName => {

            Object.keys(songData[modeName]).forEach(level => {

                songData[modeName][level].forEach(song => {

                    if (
                        song.title ===
                        editingSong.title
                    ) {
                        oldImage =
                            song.image || oldImage;
                    }

                });

                songData[modeName][level] =
                    songData[modeName][level]
                    .filter(
                        song =>
                            song.title !==
                            editingSong.title
                    );

            });

        });

        const finalImage =
            newImage || oldImage;

        /* 싱글 재등록 */
        singleLevels.forEach(level => {

            if (!songData.single[level]) {
                songData.single[level] = [];
            }

            songData.single[level].push({
                id: crypto.randomUUID(),
                title: newTitle,
                image: finalImage
            });

        });

        /* 하프더블 재등록 */
        doubleLevels.forEach(level => {

            if (!songData.double[level]) {
                songData.double[level] = [];
            }

            songData.double[level].push({
                id: crypto.randomUUID(),
                title: newTitle,
                image: finalImage
            });

        });

        save();

        editingSong = {
            title: newTitle
        };

        renderSongs();

        alert("수정 완료");
    }

    if (!file) {

        apply(null);

        return;
    }

    const reader =
        new FileReader();

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
        closeRegister();
        renderSongs();
    }

    reader.onload = (e) => process(e.target.result || "");

    if (file) reader.readAsDataURL(file);
    else process("");
}

/* =======================
   EXPORT / IMPORT
======================= */

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
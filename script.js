(() => {
"use strict";

const $ = id => document.getElementById(id);

const board = $("board");
const setup = $("setup");
const game = $("game");
const music = $("bgMusic");

const weapons = [
    { name: "Strawberry", icon: "🍓", cls: "strawberry" },
    { name: "Croissant", icon: "🥐", cls: "croissant" },
    { name: "Ribbon Bow", icon: "🎀", cls: "bow" },
    { name: "Sweet Star", icon: "⭐", cls: "star" },
    { name: "Paw Print", icon: "🐾", cls: "paw" },
    { name: "Love Heart", icon: "💗", cls: "heart" }
];

const levels = {
    easy: { name: "Easy", time: 60 },
    medium: { name: "Medium", time: 45 },
    hard: { name: "Hard", time: 30 }
};

let layout = "8x8";
let difficulty = "medium";

let rows = 8;
let cols = 8;

let tiles = [];
let score = 0;
let time = 45;

let best = Number(
    localStorage.getItem("raveCrushHighScore") || 0
);

let active = false;
let paused = false;
let busy = false;
let chosen = null;

let timer = null;
let countTimer = null;

let playingMusic = false;
let drag = null;

$("best").textContent = best;


/* =========================
   SETUP SCREEN
========================= */

function selected(group, attr, value) {
    document.querySelectorAll(group).forEach(button => {
        button.classList.toggle(
            "chosen",
            button.dataset[attr] === value
        );
    });
}

function summary() {
    let [r, c] = layout.split("x");

    $("summary").innerHTML =
        `Your game: <b>${r} × ${c} board</b> · <b>${levels[difficulty].name}</b>`;
}

document.querySelectorAll(".layout").forEach(button => {
    button.onclick = () => {
        layout = button.dataset.layout;

        selected(".layout", "layout", layout);
        summary();
    };
});

document.querySelectorAll(".level").forEach(button => {
    button.onclick = () => {
        difficulty = button.dataset.level;

        selected(".level", "level", difficulty);
        summary();
    };
});


/* =========================
   TILE GENERATION
========================= */

function random(except) {
    let available = weapons.filter(
        weapon => weapon.name !== except
    );

    return available[
        Math.floor(Math.random() * available.length)
    ];
}

function type(i) {
    return tiles[i]?.dataset.type || "";
}

function makeTile(i, weapon) {
    let tile = document.createElement("div");

    tile.className = `tile ${weapon.cls}`;
    tile.dataset.type = weapon.name;
    tile.dataset.index = i;

    tile.textContent = weapon.icon;
    tile.title = weapon.name;

    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", weapon.name);

    return tile;
}

function wouldMatch(i, name) {
    let r = Math.floor(i / cols);
    let c = i % cols;

    return (
        (c > 1 &&
         type(i - 1) === name &&
         type(i - 2) === name) ||

        (r > 1 &&
         type(i - cols) === name &&
         type(i - 2 * cols) === name)
    );
}


/* =========================
   CREATE GAME BOARD
========================= */

function buildBoard() {
    [rows, cols] = layout.split("x").map(Number);

    board.innerHTML = "";

    board.style.gridTemplateColumns =
        `repeat(${cols}, minmax(0, 1fr))`;

    board.style.aspectRatio = `${cols}/${rows}`;

    tiles = [];

    for (let i = 0; i < rows * cols; i++) {
        let weapon = random();

        let tries = 0;

        while (
            wouldMatch(i, weapon.name) &&
            tries++ < 20
        ) {
            weapon = random(weapon.name);
        }

        let tile = makeTile(i, weapon);

        board.append(tile);
        tiles.push(tile);
    }
}


/* =========================
   MATCHING HELPERS
========================= */

function neighbor(a, b) {
    return (
        Math.abs(Math.floor(a / cols) - Math.floor(b / cols)) +
        Math.abs(a % cols - b % cols) === 1
    );
}

function swap(a, b) {
    let A = tiles[a];
    let B = tiles[b];

    let dataA = {
        type: A.dataset.type,
        text: A.textContent,
        cls: A.className,
        title: A.title,
        special: A.dataset.special || ""
    };

    A.dataset.type = B.dataset.type;
    A.textContent = B.textContent;
    A.className = B.className;
    A.title = B.title;
    A.dataset.special = B.dataset.special || "";

    B.dataset.type = dataA.type;
    B.textContent = dataA.text;
    B.className = dataA.cls;
    B.title = dataA.title;
    B.dataset.special = dataA.special;

    A.setAttribute("aria-label", A.title);
    B.setAttribute("aria-label", B.title);
}


/* =========================
   FIND MATCHES
========================= */

function matches() {
    let set = new Set();
    let runs = [];

    // Horizontal matches

    for (let r = 0; r < rows; r++) {
        let c = 0;

        while (c < cols) {
            let start = c;
            let name = type(r * cols + c);

            if (!name) {
                c++;
                continue;
            }

            while (
                c < cols &&
                type(r * cols + c) === name
            ) {
                c++;
            }

            if (c - start >= 3) {
                let run = [];

                for (let x = start; x < c; x++) {
                    run.push(r * cols + x);
                }

                run.forEach(i => set.add(i));
                runs.push(run);
            }
        }
    }

    // Vertical matches

    for (let c = 0; c < cols; c++) {
        let r = 0;

        while (r < rows) {
            let start = r;
            let name = type(r * cols + c);

            if (!name) {
                r++;
                continue;
            }

            while (
                r < rows &&
                type(r * cols + c) === name
            ) {
                r++;
            }

            if (r - start >= 3) {
                let run = [];

                for (let y = start; y < r; y++) {
                    run.push(y * cols + c);
                }

                run.forEach(i => set.add(i));
                runs.push(run);
            }
        }
    }

    return {
        ids: [...set],
        runs
    };
}


/* =========================
   SCORE
========================= */

function addScore(number) {
    score += number * 10;

    $("score").textContent = score;

    if (score > best) {
        best = score;

        localStorage.setItem(
            "raveCrushHighScore",
            best
        );

        $("best").textContent = best;
    }
}



/* ==========================================
   RAVE CRUSH — ADVANCED MATCH EFFECTS
========================================== */

function sparkle(tile) {
    if (!tile) return;

    const rect = tile.getBoundingClientRect();

    const symbols = ["✧", "♡", "✿", "✨", "💗", "⋆"];

    for (let i = 0; i < 7; i++) {
        const spark = document.createElement("span");

        spark.className = "match-particle";
        spark.textContent =
            symbols[Math.floor(Math.random() * symbols.length)];

        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 55;

        spark.style.left =
            rect.left + rect.width / 2 + "px";

        spark.style.top =
            rect.top + rect.height / 2 + "px";

        spark.style.setProperty(
            "--move-x",
            Math.cos(angle) * distance + "px"
        );

        spark.style.setProperty(
            "--move-y",
            Math.sin(angle) * distance + "px"
        );

        spark.style.setProperty(
            "--spark-size",
            (14 + Math.random() * 15) + "px"
        );

        document.body.appendChild(spark);

        setTimeout(() => spark.remove(), 850);
    }
}


/* FLOATING COMBO MESSAGE */

function comboMessage(count) {
    let message = "SWEET MATCH! 💗";
    let level = "combo-three";

    if (count >= 8) {
        message = "UNBELIEVABLE! 🌈";
        level = "combo-five";
    } else if (count >= 5) {
        message = "AMAZING COMBO! ✨";
        level = "combo-five";
    } else if (count >= 4) {
        message = "SUPER SWEET! 🎀";
        level = "combo-four";
    }

    const banner = document.createElement("div");

    banner.className = `combo-banner ${level}`;
    banner.textContent = message;

    const frame = document.querySelector(".board-frame") || board;

    frame.appendChild(banner);

    setTimeout(() => banner.remove(), 1100);
}


/* BOARD IMPACT */

function boardImpact(count) {
    board.classList.remove(
        "shake-three",
        "shake-four",
        "shake-five"
    );

    void board.offsetWidth;

    if (count >= 5) {
        board.classList.add("shake-five");
    } else if (count >= 4) {
        board.classList.add("shake-four");
    } else {
        board.classList.add("shake-three");
    }

    setTimeout(() => {
        board.classList.remove(
            "shake-three",
            "shake-four",
            "shake-five"
        );
    }, 500);
}


/* FLOATING SCORE */

function floatingScore(tile, points) {
    if (!tile) return;

    const rect = tile.getBoundingClientRect();

    const scorePop = document.createElement("div");

    scorePop.className = "floating-score";
    scorePop.textContent = `+${points}`;

    scorePop.style.left =
        rect.left + rect.width / 2 + "px";

    scorePop.style.top =
        rect.top + rect.height / 2 + "px";

    document.body.appendChild(scorePop);

    setTimeout(() => scorePop.remove(), 950);
}


/* COMPLETE MATCH EFFECT */

function matchEffects(ids, runs = []) {
    const count = ids.length;

    if (!count) return;

    ids.forEach((index, position) => {
        const tile = tiles[index];

        if (!tile) return;

        sparkle(tile);

        if (position % 2 === 0) {
            floatingScore(tile, 10);
        }
    });

    comboMessage(count);
    boardImpact(count);
}

const wait = ms =>
    new Promise(resolve => setTimeout(resolve, ms));



/* =========================
   SPECIAL TILE CREATION
========================= */

function markSpecials(runs) {
    let keep = new Set();

    runs.forEach(run => {
        if (run.length < 4) return;

        let index = run[Math.floor(run.length / 2)];
        let tile = tiles[index];

        if (!tile) return;

        tile.dataset.special =
            run.length >= 5 ? "rocket" : "bomb";

        tile.classList.add(
            run.length >= 5
                ? "special-rocket"
                : "special-bomb"
        );

        keep.add(index);
    });

    return keep;
}


/* =========================
   SPECIAL EFFECTS
========================= */

function specialExpand(ids) {
    let result = new Set(ids);

    ids.forEach(index => {
        let tile = tiles[index];

        let r = Math.floor(index / cols);
        let c = index % cols;

        if (tile?.dataset.special === "bomb") {
            for (
                let y = Math.max(0, r - 1);
                y <= Math.min(rows - 1, r + 1);
                y++
            ) {
                for (
                    let x = Math.max(0, c - 1);
                    x <= Math.min(cols - 1, c + 1);
                    x++
                ) {
                    result.add(y * cols + x);
                }
            }
        }

        if (tile?.dataset.special === "rocket") {
            for (let x = 0; x < cols; x++) {
                result.add(r * cols + x);
            }

            for (let y = 0; y < rows; y++) {
                result.add(y * cols + c);
            }
        }
    });

    return [...result];
}



/* ==========================================
   CLEAR MATCHED TILES — SMOOTH COMBO VERSION
========================================== */

async function clear(ids, runs = []) {
    let valid = [...new Set(ids)].filter(
        i => tiles[i] && type(i)
    );

    if (!valid.length) return;

    // Trigger visual effects
    matchEffects(valid, runs);

    // Calculate score
    addScore(valid.length);

    // Add matching animation
    valid.forEach((i, index) => {
        const tile = tiles[i];

        tile.classList.add("matched");

        tile.style.setProperty(
            "--match-delay",
            (index % 5) * 35 + "ms"
        );

        if (valid.length >= 5) {
            tile.classList.add("mega-match");
        }
    });

    // Give the animation time to finish
    await wait(valid.length >= 5 ? 470 : 350);

    // Clear the matched tiles
    valid.forEach(i => {
        const tile = tiles[i];

        tile.dataset.type = "";
        tile.dataset.special = "";

        tile.className = "tile";
        tile.textContent = "";
        tile.title = "";

        tile.style.removeProperty("--match-delay");
    });
}



/* =========================
   DROP AND REFILL TILES
========================= */

function collapse() {
    for (let c = 0; c < cols; c++) {
        let items = [];

        for (let r = rows - 1; r >= 0; r--) {
            let tile = tiles[r * cols + c];

            if (type(r * cols + c)) {
                items.push({
                    type: tile.dataset.type,
                    text: tile.textContent,
                    cls: tile.className,
                    title: tile.title,
                    special: tile.dataset.special || ""
                });
            }
        }

        for (let r = rows - 1; r >= 0; r--) {
            let tile = tiles[r * cols + c];
            let value = items.shift();

            if (value) {
                tile.dataset.type = value.type;
                tile.textContent = value.text;

                tile.className =
    value.cls.replace("matched", "").trim() +
    " falling";

tile.style.setProperty(
    "--fall-delay",
    (Math.random() * 100) + "ms"
);

                tile.title = value.title;
                tile.dataset.special = value.special;
            } else {
                let weapon = random();

                tile.dataset.type = weapon.name;
                tile.textContent = weapon.icon;
                tile.className = `tile ${weapon.cls} falling`;

tile.style.setProperty(
    "--fall-delay",
    (Math.random() * 100) + "ms"
);
                tile.title = weapon.name;
                tile.dataset.special = "";
            }

            tile.setAttribute("aria-label", tile.title);

            setTimeout(() => {
    tile.classList.remove("falling");
    tile.style.removeProperty("--fall-delay");
}, 650);
        }
    }
}


/* =========================
   CHAIN MATCHES
========================= */

async function resolve() {
    for (let n = 0; n < 20; n++) {
        let result = matches();

        if (!result.ids.length) break;

        let keep = markSpecials(result.runs);

        let expanded = specialExpand(result.ids);

        await clear(
    expanded.filter(i => !keep.has(i)),
    result.runs
 );

        collapse();

        await wait(170);
    }
}


/* =========================
   MOVE TILES
========================= */

async function move(a, b) {
    if (
        busy ||
        !active ||
        paused ||
        !neighbor(a, b)
    ) {
        return;
    }

    busy = true;

    swap(a, b);

    await wait(90);

    let result = matches();

    let special =
        tiles[a].dataset.special ||
        tiles[b].dataset.special;

    if (!result.ids.length && !special) {
        swap(a, b);
        busy = false;
        return;
    }

    let ids = special
        ? [...new Set([...result.ids, a, b])]
        : result.ids;

    let keep = markSpecials(result.runs);

    await clear(
    specialExpand(ids).filter(i => !keep.has(i)),
    result.runs
);

    collapse();

    await wait(170);

    await resolve();

    busy = false;
}


/* =========================
   CLICK TO SWAP
========================= */

function tap(index) {
    if (!active || paused || busy) return;

    if (chosen === null) {
        chosen = index;
        tiles[index].classList.add("selected");
        return;
    }

    let old = chosen;

    tiles[old]?.classList.remove("selected");

    chosen = null;

    if (old !== index && neighbor(old, index)) {
        move(old, index);
    } else if (old !== index) {
        chosen = index;
        tiles[index].classList.add("selected");
    }
}

board.addEventListener("click", event => {
    let tile = event.target.closest(".tile");

    if (tile) {
        tap(Number(tile.dataset.index));
    }
});


/* =========================
   SWIPE SUPPORT
========================= */

board.addEventListener("pointerdown", event => {
    let tile = event.target.closest(".tile");

    if (tile && active && !paused && !busy) {
        drag = {
            i: Number(tile.dataset.index),
            x: event.clientX,
            y: event.clientY
        };
    }
});

board.addEventListener("pointerup", event => {
    if (!drag) return;

    let d = drag;
    drag = null;

    let dx = event.clientX - d.x;
    let dy = event.clientY - d.y;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) {
        return;
    }

    let target =
        d.i +
        (
            Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 1 : -1)
                : (dy > 0 ? cols : -cols)
        );

    if (
        target >= 0 &&
        target < tiles.length &&
        neighbor(d.i, target)
    ) {
        move(d.i, target);
    }
});


/* =========================
   TIMER
========================= */

function stop() {
    clearInterval(timer);
    clearInterval(countTimer);

    timer = null;
    countTimer = null;
}

function beginTimer() {
    clearInterval(timer);

    timer = setInterval(() => {
        if (!active || paused) return;

        time--;

        $("timer").textContent = time;

        $("timerCard").classList.toggle(
            "urgent",
            time <= 10
        );

        if (time <= 0) {
            endGame();
        }
    }, 1000);
}


/* =========================
   COUNTDOWN
========================= */

function countdown() {
    let number = 3;

    $("count").textContent = number;
    $("countdown").hidden = false;

    clearInterval(countTimer);

    countTimer = setInterval(() => {
        number--;

        if (number <= 0) {
            clearInterval(countTimer);
            countTimer = null;

            $("countdown").hidden = true;

            active = true;

            beginTimer();
        } else {
            $("count").textContent = number;
        }
    }, 800);
}


/* =========================
   START NEW GAME
========================= */

function newGame() {
    stop();

    score = 0;
    time = levels[difficulty].time;

    active = false;
    paused = false;
    busy = false;
    chosen = null;

    $("score").textContent = 0;
    $("timer").textContent = time;

    $("timerCard").classList.remove("urgent");

    $("mode").textContent =
        `${rows} × ${cols} · ${levels[difficulty].name}`;

    setup.hidden = true;

    $("over").hidden = true;
    $("pauseModal").hidden = true;

    game.hidden = false;

    buildBoard();

    countdown();
}


/* =========================
   GAME OVER
========================= */

function endGame() {
    if (!active) return;

    active = false;

    stop();

    $("final").textContent = score;

    $("bestMessage").textContent =
        score >= best
            ? "A new lovely high score! ✨"
            : `Your best score is ${best}.`;

    $("over").hidden = false;
}


/* =========================
   RETURN TO SETUP
========================= */

function toSetup() {
    stop();

    active = false;
    paused = false;
    busy = false;
    chosen = null;

    $("countdown").hidden = true;
    $("pauseModal").hidden = true;
    $("over").hidden = true;

    game.hidden = true;
    setup.hidden = false;
}


/* =========================
   BUTTON EVENTS
========================= */

$("play").onclick = newGame;

$("back").onclick = toSetup;
$("exit").onclick = toSetup;

$("overSetup").onclick = toSetup;
$("again").onclick = newGame;


/* =========================
   PAUSE AND RESUME
========================= */

$("pause").onclick = () => {
    if (!active || busy) return;

    paused = true;

    $("pauseModal").hidden = false;
    $("pause").textContent = "▶ RESUME";
};

$("resume").onclick = () => {
    paused = false;

    $("pauseModal").hidden = true;
    $("pause").textContent = "Ⅱ PAUSE";
};

$("pauseSetup").onclick = toSetup;


/* =========================
   MUSIC ON / OFF
========================= */

$("musicToggle").onclick = async () => {
    try {
        if (!playingMusic) {
            await music.play();

            playingMusic = true;

            $("musicToggle").textContent =
                "♫ Music: On";

            $("musicToggle").setAttribute(
                "aria-pressed",
                "true"
            );
        } else {
            music.pause();

            playingMusic = false;

            $("musicToggle").textContent =
                "♫ Music: Off";

            $("musicToggle").setAttribute(
                "aria-pressed",
                "false"
            );
        }
    } catch (error) {
        console.error(
            "Music file missing. Put gymnopedie.mp3 in audio folder.",
            error
        );

        $("musicToggle").textContent =
            "♫ Music unavailable";
    }
};

music.volume = 0.25;


/* =========================
   FLOATING PETALS
========================= */

function petal() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
    }

    const p = document.createElement("span");

    const petalStyle = Math.floor(Math.random() * 4);
    p.className = `falling-petal petal-style-${petalStyle}`;

    p.style.left = Math.random() * 100 + "%";

    p.style.setProperty(
        "--drift",
        (Math.random() * 220 - 110) + "px"
    );

    p.style.setProperty(
        "--petal-scale",
        (0.65 + Math.random() * 0.85).toFixed(2)
    );

    p.style.animationDuration =
        (10 + Math.random() * 11) + "s";

    p.style.animationDelay =
        (Math.random() * 1.5) + "s";

    $("petals").append(p);

    setTimeout(() => p.remove(), 24000);
}

setInterval(petal, 1100);

for (let i = 0; i < 6; i++) {
    setTimeout(petal, i * 400);
}

summary();

})();

/* =====================================
   RAVE CRUSH SETTINGS & GUEST PROFILE
===================================== */

(() => {
    const savedTheme = localStorage.getItem("raveCrushTheme") || "light";
    document.body.dataset.theme = savedTheme;

    const savedAvatar = localStorage.getItem("raveCrushAvatar") || "🐰";
    const savedRating = Number(localStorage.getItem("raveCrushRating") || 0);

    const animals = ["🐰", "🐱", "🐻", "🐼", "🦊", "🐸", "🐹", "🐨", "🐶", "🦄"];

    // Settings button
    const settingsButton = document.createElement("button");
    settingsButton.id = "settingsButton";
    settingsButton.innerHTML = "⚙️ Settings";
    document.body.appendChild(settingsButton);

    // Settings window
    const modal = document.createElement("div");
    modal.id = "settingsModal";

    modal.innerHTML = `
        <div class="settings-panel">
            <div class="settings-header">
                <h2>🎀 Game Settings</h2>
                <button id="closeSettings">×</button>
            </div>

            <div class="settings-tabs">
                <button class="settings-tab active" data-tab="profile">👤 Profile</button>
                <button class="settings-tab" data-tab="appearance">🎨 Theme</button>
                <button class="settings-tab" data-tab="report">💌 Report</button>
                <button class="settings-tab" data-tab="rating">⭐ Rating</button>
                <button class="settings-tab" data-tab="guidelines">📖 Guide</button>
            </div>

            <!-- PROFILE -->
            <section class="settings-section active" id="profile">
                <h3>My Guest Profile</h3>

                <div class="settings-card">
                    <div id="guestAvatarPreview">${savedAvatar}</div>
                    <h3>Guest Player</h3>
                    <p>Choose your favorite animal avatar!</p>

                    <div class="animal-choice">
                        ${animals.map(animal => `
                            <button class="animal-avatar ${animal === savedAvatar ? "selected" : ""}"
                                data-avatar="${animal}">
                                ${animal}
                            </button>
                        `).join("")}
                    </div>
                </div>

                <p class="settings-note">
                    Your avatar is saved on this device. No account is required.
                </p>
            </section>

            <!-- APPEARANCE -->
            <section class="settings-section" id="appearance">
                <h3>Choose Your Theme</h3>

                <div class="settings-card">
                    <p>Make your game feel just right!</p>

                    <div class="theme-choice">
                        <button class="settings-action" data-theme-choice="light">
                            ☀️ Light Mode
                        </button>

                        <button class="settings-action" data-theme-choice="dark">
                            🌙 Dark Mode
                        </button>
                    </div>
                </div>
            </section>

            <!-- REPORT -->
            <section class="settings-section" id="report">
                <h3>Report an Issue 💌</h3>

                <div class="settings-card">
                    <p>Found a bug or something not working?</p>

                    <textarea id="reportText"
                        placeholder="Describe the issue here..."></textarea>

                    <button id="submitReport">Submit Report</button>

                    <p id="reportMessage" class="settings-note"></p>
                </div>

                <p class="settings-note">
                    Reports are saved locally on this device. They are not
                    automatically sent to the developer.
                </p>
            </section>

            <!-- RATING -->
            <section class="settings-section" id="rating">
                <h3>Rate Rave Crush! ⭐</h3>

                <div class="settings-card">
                    <p>How much do you enjoy playing?</p>

                    <div class="rating-stars">
                        ${[1, 2, 3, 4, 5].map(number => `
                            <button class="rating-star ${number <= savedRating ? "active" : ""}"
                                data-rating="${number}">★</button>
                        `).join("")}
                    </div>

                    <p id="ratingMessage">
                        ${savedRating ? `Thank you for your ${savedRating}-star rating! 💗` : "Select your rating!"}
                    </p>
                </div>
            </section>

            <!-- GUIDELINES -->
            <section class="settings-section" id="guidelines">
                <h3>How to Play 📖</h3>

                <div class="settings-card">
                    <p><strong>1. Match the tiles</strong></p>
                    <p>Swap neighboring tiles to make a line of three or more matching tiles.</p>

                    <p><strong>2. Create special tiles</strong></p>
                    <p>Matching larger groups can create special tiles with powerful effects.</p>

                    <p><strong>3. Earn points</strong></p>
                    <p>Every successful match adds points to your score.</p>

                    <p><strong>4. Watch the timer</strong></p>
                    <p>Complete as many matches as possible before time runs out.</p>

                    <p><strong>5. Choose your challenge</strong></p>
                    <p>Select your preferred board size and difficulty before starting.</p>

                    <p><strong>6. Have fun!</strong></p>
                    <p>Enjoy Rave Crush and try to beat your best score! 🎀</p>
                </div>
            </section>
        </div>
    `;

    document.body.appendChild(modal);

    // Open and close settings
    settingsButton.addEventListener("click", () => {
        modal.classList.add("show");
    });

    document.getElementById("closeSettings").addEventListener("click", () => {
        modal.classList.remove("show");
    });

    modal.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.remove("show");
        }
    });

    // Settings tabs
    const tabs = modal.querySelectorAll(".settings-tab");
    const sections = modal.querySelectorAll(".settings-section");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(item => item.classList.remove("active"));
            sections.forEach(section => section.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(tab.dataset.tab).classList.add("active");
        });
    });

    // Animal avatar selection
    modal.querySelectorAll(".animal-avatar").forEach(button => {
        button.addEventListener("click", () => {
            const avatar = button.dataset.avatar;

            localStorage.setItem("raveCrushAvatar", avatar);
            document.getElementById("guestAvatarPreview").textContent = avatar;

            modal.querySelectorAll(".animal-avatar").forEach(item => {
                item.classList.remove("selected");
            });

            button.classList.add("selected");
        });
    });

    // Light and dark mode
    function updateTheme(theme) {
        document.body.dataset.theme = theme;
        localStorage.setItem("raveCrushTheme", theme);

        modal.querySelectorAll("[data-theme-choice]").forEach(button => {
            button.classList.toggle(
                "selected",
                button.dataset.themeChoice === theme
            );
        });
    }

    modal.querySelectorAll("[data-theme-choice]").forEach(button => {
        button.addEventListener("click", () => {
            updateTheme(button.dataset.themeChoice);
        });
    });

    updateTheme(savedTheme);

    // Report issue
    document.getElementById("submitReport").addEventListener("click", () => {
        const reportText = document.getElementById("reportText");
        const message = document.getElementById("reportMessage");
        const report = reportText.value.trim();

        if (!report) {
            message.textContent = "Please describe the issue first. 💗";
            return;
        }

        const reports = JSON.parse(
            localStorage.getItem("raveCrushReports") || "[]"
        );

        reports.push({
            message: report,
            date: new Date().toISOString()
        });

        localStorage.setItem("raveCrushReports", JSON.stringify(reports));

        reportText.value = "";
        message.textContent = "Your report has been saved on this device! Thank you. 💌";
    });

    // Star ratings
    modal.querySelectorAll(".rating-star").forEach(button => {
        button.addEventListener("click", () => {
            const rating = Number(button.dataset.rating);

            localStorage.setItem("raveCrushRating", rating);

            modal.querySelectorAll(".rating-star").forEach(star => {
                star.classList.toggle(
                    "active",
                    Number(star.dataset.rating) <= rating
                );
            });

            document.getElementById("ratingMessage").textContent =
                `Thank you for your ${rating}-star rating! 💗`;
        });
    });

})();

/* =====================================
   RAVE CRUSH - FLOATING PET COMPANION
===================================== */

(() => {
    const animals = {
        "🐰": "🐰",
        "🐱": "🐱",
        "🐻": "🐻",
        "🐼": "🐼",
        "🦊": "🦊",
        "🐸": "🐸",
        "🐹": "🐹",
        "🐨": "🐨",
        "🐶": "🐶",
        "🦄": "🦄"
    };

    let avatar = localStorage.getItem("raveCrushAvatar") || "🐰";
    let angry = localStorage.getItem("ravePetMood") === "angry";
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let initialX = 0;
    let initialY = 0;

    const pet = document.createElement("div");
    pet.id = "ravePet";
    pet.setAttribute("role", "button");
    pet.setAttribute("aria-label", "Floating pet. Tap to change its mood.");
    pet.innerHTML = `
        <span class="pet-animal"></span>
        <span class="pet-mood"></span>
    `;

    document.body.appendChild(pet);

    const animalElement = pet.querySelector(".pet-animal");
    const moodElement = pet.querySelector(".pet-mood");

    function updatePet() {
        animalElement.textContent = animals[avatar] || "🐰";

        pet.classList.toggle("angry", angry);
        pet.classList.toggle("cute", !angry);

        moodElement.textContent = angry ? "😤" : "💗";

        localStorage.setItem("ravePetMood", angry ? "angry" : "cute");
    }

    // Restore saved position
    const savedPosition = JSON.parse(
        localStorage.getItem("ravePetPosition") || "null"
    );

    if (savedPosition &&
        Number.isFinite(savedPosition.x) &&
        Number.isFinite(savedPosition.y)) {
        pet.style.left = savedPosition.x + "px";
        pet.style.top = savedPosition.y + "px";
        pet.style.right = "auto";
        pet.style.bottom = "auto";
    }

    function keepInsideScreen(x, y) {
        const maxX = window.innerWidth - pet.offsetWidth;
        const maxY = window.innerHeight - pet.offsetHeight;

        return {
            x: Math.max(0, Math.min(x, maxX)),
            y: Math.max(0, Math.min(y, maxY))
        };
    }

    function savePosition() {
        const rect = pet.getBoundingClientRect();

        localStorage.setItem(
            "ravePetPosition",
            JSON.stringify({
                x: rect.left,
                y: rect.top
            })
        );
    }

    // Drag and tap interaction
    pet.addEventListener("pointerdown", event => {
        dragging = true;
        moved = false;

        const rect = pet.getBoundingClientRect();

        startX = event.clientX;
        startY = event.clientY;

        initialX = rect.left;
        initialY = rect.top;

        pet.setPointerCapture(event.pointerId);
    });

    pet.addEventListener("pointermove", event => {
        if (!dragging) return;

        const dx = event.clientX - startX;
        const dy = event.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            moved = true;
        }

        if (moved) {
            const position = keepInsideScreen(
                initialX + dx,
                initialY + dy
            );

            pet.style.left = position.x + "px";
            pet.style.top = position.y + "px";
            pet.style.right = "auto";
            pet.style.bottom = "auto";
        }
    });

    function finishInteraction() {
        if (!dragging) return;

        dragging = false;

        if (moved) {
            savePosition();
        } else {
            angry = !angry;
            updatePet();
        }
    }

    pet.addEventListener("pointerup", finishInteraction);
    pet.addEventListener("pointercancel", finishInteraction);

    // Update when player changes their profile avatar
    document.addEventListener("click", event => {
        const avatarButton = event.target.closest("[data-avatar]");

        if (!avatarButton) return;

        const selectedAvatar = avatarButton.dataset.avatar;

        if (animals[selectedAvatar]) {
            avatar = selectedAvatar;
            updatePet();
        }
    });

    // Keep pet inside screen after resizing
    window.addEventListener("resize", () => {
        const rect = pet.getBoundingClientRect();
        const position = keepInsideScreen(rect.left, rect.top);

        pet.style.left = position.x + "px";
        pet.style.top = position.y + "px";
        pet.style.right = "auto";
        pet.style.bottom = "auto";

        savePosition();
    });

    updatePet();
})();
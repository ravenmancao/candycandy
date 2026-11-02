const width = 8;

const board = document.getElementById("board");

const scoreDisplay =
document.getElementById("score");

const timerDisplay =
document.getElementById("timer");

const highScoreDisplay =
document.getElementById("highScore");

const gameOverBox =
document.getElementById("gameOver");

const finalScore =
document.getElementById("finalScore");

const pauseBtn =
document.getElementById("pauseBtn");

const countdownScreen =
document.getElementById("countdownScreen");

const countdownText =
document.getElementById("countdownText");

const startScreen =
document.getElementById("startScreen");

/* ========================= */

let score = 0;
let timeLeft = 16;

let gameStarted = false;
let paused = false;

let countdown;
let gameLoop;

/* ========================= */

const weapons = [
    {name:"🎀", class:"m13"},
    {name:"🩵", class:"krig"},
    {name:"🌸", class:"fennec"},
    {name:"🦋", class:"holger"},
    {name:"♡", class:"rytec"},
    {name:"☁️", class:"switchblade"}
];

let squares = [];

/* ========================= */
/* HIGH SCORE */
/* ========================= */

let highScore =
localStorage.getItem("mythicHighScore") || 0;

highScoreDisplay.innerText =
highScore;

/* ========================= */
/* CREATE BOARD */
/* ========================= */

function createBoard(){

    board.innerHTML = "";

    squares = [];

    for(let i=0;i<64;i++){

        const square =
        document.createElement("div");

        square.setAttribute("id",i);

        square.classList.add("tile");

        let randomWeapon =
        weapons[Math.floor(
            Math.random()*weapons.length
        )];

        square.classList.add(
            randomWeapon.class
        );

        square.innerText =
        randomWeapon.name;

        board.appendChild(square);

        squares.push(square);
    }

    initSwipe();
}

createBoard();

/* ========================= */
/* SWIPE */
/* ========================= */

let startX = 0;
let startY = 0;
let startSquare = null;

function initSwipe(){

    squares.forEach(square=>{

        square.addEventListener(
            "touchstart",
            handleTouchStart,
            {passive:true}
        );

        square.addEventListener(
            "touchend",
            handleTouchEnd
        );

        square.addEventListener(
            "mousedown",
            handleMouseStart
        );

        square.addEventListener(
            "mouseup",
            handleMouseEnd
        );

    });
}

function handleTouchStart(e){

    if(paused || !gameStarted) return;

    startSquare = e.target;

    startX =
    e.changedTouches[0].clientX;

    startY =
    e.changedTouches[0].clientY;
}

function handleTouchEnd(e){

    if(paused || !gameStarted) return;

    let endX =
    e.changedTouches[0].clientX;

    let endY =
    e.changedTouches[0].clientY;

    swipeMove(endX,endY);
}

function handleMouseStart(e){

    if(paused || !gameStarted) return;

    startSquare = e.target;

    startX = e.clientX;
    startY = e.clientY;
}

function handleMouseEnd(e){

    if(paused || !gameStarted) return;

    let endX = e.clientX;
    let endY = e.clientY;

    swipeMove(endX,endY);
}

/* ========================= */
/* SWIPE MOVE */
/* ========================= */

function swipeMove(endX,endY){

    if(!startSquare) return;

    let diffX = endX - startX;
    let diffY = endY - startY;

    let direction = null;

    if(Math.abs(diffX) >
       Math.abs(diffY)){

        if(diffX > 30){

            direction = 1;
        }

        else if(diffX < -30){

            direction = -1;
        }
    }

    else{

        if(diffY > 30){

            direction = width;
        }

        else if(diffY < -30){

            direction = -width;
        }
    }

    if(direction === null) return;

    let startId =
    parseInt(startSquare.id);

    let targetId =
    startId + direction;

    if(targetId < 0 ||
       targetId >= 64){

        return;
    }

    if(direction === 1 &&
       startId % width === 7){

        return;
    }

    if(direction === -1 &&
       startId % width === 0){

        return;
    }

    let targetSquare =
    squares[targetId];

    swap(startSquare,targetSquare);

    if(!checkAnyMatch()){

        setTimeout(()=>{

            swap(
                startSquare,
                targetSquare
            );

        },150);
    }

    startSquare = null;
}

/* ========================= */
/* SWAP */
/* ========================= */

function swap(a,b){

    let tempClass = a.className;
    let tempText = a.innerText;

    a.className = b.className;
    a.innerText = b.innerText;

    b.className = tempClass;
    b.innerText = tempText;
}

/* ========================= */
/* MATCH */
/* ========================= */

function checkAnyMatch(){

    let found = false;

    for(let i=0;i<61;i++){

        let row6 =
        [i,i+1,i+2,i+3,i+4,i+5];

        let row5 =
        [i,i+1,i+2,i+3,i+4];

        let row4 =
        [i,i+1,i+2,i+3];

        let row3 =
        [i,i+1,i+2];

        if(i%8<=2 &&
           isMatch(row6)){

            rocketExplosion(row6);

            found = true;
        }

        else if(i%8<=3 &&
                isMatch(row5)){

            rocketExplosion(row5);

            found = true;
        }

        else if(i%8<=4 &&
                isMatch(row4)){

            bombExplosion(row4);

            found = true;
        }

        else if(i%8<=5 &&
                isMatch(row3)){

            destroy(row3);

            found = true;
        }
    }

    for(let i=0;i<40;i++){

        let col6 =
        [i,i+8,i+16,i+24,i+32,i+40];

        let col5 =
        [i,i+8,i+16,i+24,i+32];

        let col4 =
        [i,i+8,i+16,i+24];

        let col3 =
        [i,i+8,i+16];

        if(isMatch(col6)){

            rocketExplosion(col6);

            found = true;
        }

        else if(isMatch(col5)){

            rocketExplosion(col5);

            found = true;
        }

        else if(isMatch(col4)){

            bombExplosion(col4);

            found = true;
        }

        else if(isMatch(col3)){

            destroy(col3);

            found = true;
        }
    }

    return found;
}

function isMatch(arr){

    return arr.every(index=>

        squares[index] &&

        squares[index].innerText !== "" &&

        squares[index].innerText ===
        squares[arr[0]].innerText
    );
}

/* ========================= */
/* DESTROY */
/* ========================= */

function destroy(arr){

    arr.forEach(index=>{

        if(!squares[index]) return;

        squares[index]
        .classList.add("explode");

        setTimeout(()=>{

            squares[index]
            .className = "tile";

            squares[index]
            .innerText = "";

        },220);
    });

    addScore(arr.length);
}

/* ========================= */
/* BOMB */
/* ========================= */

function bombExplosion(arr){

    let targets = [];

    arr.forEach(center=>{

        targets.push(
            center,
            center-1,
            center+1,
            center-8,
            center+8,
            center-9,
            center-7,
            center+7,
            center+9
        );
    });

    targets =
    [...new Set(targets)];

    targets.forEach(index=>{

        if(
            squares[index] &&
            squares[index].innerText !== ""
        ){

            squares[index]
            .classList.add("explode");

            setTimeout(()=>{

                squares[index]
                .className = "tile";

                squares[index]
                .innerText = "";

            },220);
        }
    });

    addScore(4);
}

/* ========================= */
/* ROCKET */
/* ========================= */

function rocketExplosion(arr){

    let targets = [];

    for(let i=0;i<18;i++){

        targets.push(
            Math.floor(
                Math.random()*64
            )
        );
    }

    arr.forEach(index=>
        targets.push(index)
    );

    targets =
    [...new Set(targets)];

    targets.forEach(index=>{

        if(
            squares[index] &&
            squares[index].innerText !== ""
        ){

            squares[index]
            .classList.add("explode");

            setTimeout(()=>{

                squares[index]
                .className = "tile";

                squares[index]
                .innerText = "";

            },220);
        }
    });

    addScore(6);
}

/* ========================= */
/* SCORE */
/* ========================= */

function addScore(blocks){

    score += blocks * 10;

    scoreDisplay.innerText =
    score;

    if(blocks === 3){

        timeLeft += 1;
    }

    else if(blocks === 4){

        timeLeft += 2;
    }

    else if(blocks >= 5){

        timeLeft += 3;
    }

    timerDisplay.innerText =
    timeLeft;

    /* HIGH SCORE */

    if(score > highScore){

        highScore = score;

        localStorage.setItem(
            "mythicHighScore",
            highScore
        );

        highScoreDisplay.innerText =
        highScore;
    }
}

/* ========================= */
/* MOVE DOWN */
/* ========================= */

function moveDown(){

    for(let i=55;i>=0;i--){

        if(
            squares[i+8].innerText === ""
        ){

            squares[i+8].className =
            squares[i].className;

            squares[i+8].innerText =
            squares[i].innerText;

            squares[i+8]
            .classList.remove("fall");

            void squares[i+8]
            .offsetWidth;

            squares[i+8]
            .classList.add("fall");

            squares[i].className =
            "tile";

            squares[i].innerText = "";
        }
    }

    for(let i=0;i<8;i++){

        if(squares[i].innerText===""){

            let randomWeapon =
            weapons[
                Math.floor(
                    Math.random()*
                    weapons.length
                )
            ];

            squares[i].className =
            "tile " +
            randomWeapon.class;

            squares[i].innerText =
            randomWeapon.name;

            squares[i]
            .classList.add("fall");
        }
    }
}

/* ========================= */
/* START GAME */
/* ========================= */

function startCountdown(){

    startScreen.style.display =
    "none";

    countdownScreen.style.display =
    "flex";

    let count = 3;

    countdownText.innerText = count;

    let countdownInterval =
    setInterval(()=>{

        count--;

        if(count <= 0){

            clearInterval(
                countdownInterval
            );

            countdownScreen
            .style.display = "none";

            startGame();
        }

        else{

            countdownText.innerText =
            count;
        }

    },1000);
}

/* ========================= */
/* START */
/* ========================= */

function startGame(){

    gameStarted = true;

    countdown = setInterval(()=>{

        if(paused) return;

        timeLeft--;

        timerDisplay.innerText =
        timeLeft;

        if(timeLeft <= 0){

            clearInterval(
                countdown
            );

            clearInterval(
                gameLoop
            );

            gameOver();
        }

    },1000);

    gameLoop = setInterval(()=>{

        if(paused) return;

        checkAnyMatch();

        moveDown();

    },180);
}

/* ========================= */
/* PAUSE */
/* ========================= */

pauseBtn.addEventListener(
    "click",
    ()=>{

    paused = !paused;

    pauseBtn.innerText =
    paused ?
    "▶ RESUME" :
    "⏸ PAUSE";
});

/* ========================= */
/* GAME OVER */
/* ========================= */

function gameOver(){

    finalScore.innerText =
    score;

    gameOverBox.style.display =
    "flex";
}

/* ========================= */
/* RESTART */
/* ========================= */

function restartGame(){

    location.reload();
}

/* ========================= */
/* EXIT */
/* ========================= */

function exitGame(){

    location.reload();
}
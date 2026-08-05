const splash = document.getElementById("splashScreen");
const progress = document.getElementById("progress");
const continueText = document.getElementById("continueText");

const homeScreen = document.getElementById("homeScreen");
const gameSelect = document.getElementById("gameSelect");

homeScreen.style.display = "none";

let value = 0;

let loader = setInterval(() => {

    value++;

    progress.style.width = value + "%";

    if (value >= 100) {

        clearInterval(loader);

        document.querySelector(".loadingText").style.display = "none";

        continueText.style.display = "block";

    }

}, 150);

document.addEventListener("click", function () {

    if (value >= 100) {

        splash.style.display = "none";

        homeScreen.style.display = "block";

    }

});

document.getElementById("playBtn").onclick = function () {

    homeScreen.style.display = "none";

    gameSelect.style.display = "block";

}

document.getElementById("backBtn").onclick = function () {

    gameSelect.style.display = "none";

    homeScreen.style.display = "block";

}

const classicGame = document.getElementById("classicGame");

document.getElementById("classicBtn").onclick = function () {
    gameSelect.style.display = "none";
    classicGame.style.display = "block";
};

document.getElementById("classicBack").onclick = function () {
    classicGame.style.display = "none";
    gameSelect.style.display = "block";
};

const cells = document.querySelectorAll(".cell");
let currentPlayer = "X";

const winPatterns = [
[0,1,2],
[3,4,5],
[6,7,8],
[0,3,6],
[1,4,7],
[2,5,8],
[0,4,8],
[2,4,6]
];

cells.forEach((cell,index)=>{

cell.onclick=function(){

if(cell.textContent!="") return;

cell.textContent=currentPlayer;

checkWinner();

currentPlayer=currentPlayer=="X"?"O":"X";

}

});

function checkWinner(){

for(let pattern of winPatterns){

let a=cells[pattern[0]].textContent;
let b=cells[pattern[1]].textContent;
let c=cells[pattern[2]].textContent;

if(a!="" && a==b && b==c){

setTimeout(()=>{
alert(a+" Wins!");
},100);

return;

}

}

}
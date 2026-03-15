const socket = io();

// --- Canvas ---
const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d");
const tilesImg = new Image()
const playerImages = {}
const classes = ["humano", "Lobisomem", "Bruxa", "Vampiro"];
for (let c of classes) {
  const img = new Image();
  img.src = `./${c}.png`;
  playerImages[c] = img;
}

tilesImg.onload = () => {
  console.log("Tiles carregados")
}

tilesImg.src = "tiles.png"

// MAPA DO TILED
let mapData = null

fetch("mapa.json")
.then(res => res.json())
.then(map => {
    mapData = map
    console.log("Mapa carregado:", mapData)

    gameLoop() // inicia o jogo aqui
})


// --- Player local (com classe) ---
const playerClass = localStorage.getItem("playerClass") || "humano";
const playerImg = new Image();
playerImg.src = `./${playerClass}.png`; // ou "./images/${playerClass}.png" se usar pasta images

let player = {
  x: 200,
  y: 200,
  width: 48,
  height: 48,
  name: "Eu",
  direction: "right",
  class: playerClass
};

// --- Outros jogadores ---
let worldPlayers = {};


// --- Teclado ---
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Mapa ---
const mapWidth = 3000;
const mapHeight = 3000;


function draw(){

  if(!canvas || !ctx) return

  ctx.clearRect(0,0,canvas.width,canvas.height)

  if(!mapData) return
  if(!tilesImg.complete) return

  for(let layer of mapData.layers){

    if(layer.type === "tilelayer"){

      for(let i=0;i<layer.data.length;i++){

        let tile = layer.data[i]

        if(tile === 0) continue

        let x = (i % mapData.width) * 32
        let y = Math.floor(i / mapData.width) * 32

        let tileX = ((tile - 1) % 8) * 32
        let tileY = Math.floor((tile - 1) / 8) * 32

        ctx.drawImage(tilesImg, tileX, tileY, 32,32, x,y,32,32)

      }

    }

  }

  drawPlayer(player.x, player.y, playerImg, player.direction)
  
  for(let id in worldPlayers){

  let p = worldPlayers[id]

  if(!p) continue
  if(id === socket.id) continue
    


let img = playerImages[p.class]

drawPlayer(p.x, p.y, img, p.direction)
}
}


// --- Movimentar e enviar pro servidor ---
function movePlayer() {
  let speed = 5;
  let newX = player.x;
  let newY = player.y;

  if (keys["w"]) newY -= speed;
  if (keys["s"]) newY += speed;
  if (keys["a"]) { newX -= speed; player.direction = "left"; }
  if (keys["d"]) { newX += speed; player.direction = "right"; }

  if (!checkCollision(newX, newY)) {
    player.x = newX;
    player.y = newY;
  }

  socket.emit("playerMove", {
    x: player.x,
    y: player.y,
    direction: player.direction,
    class: player.class
  });
}

function checkCollision(newX, newY) {
  if (newX < 0 || newX + player.width > mapWidth) return true;
  if (newY < 0 || newY + player.height > mapHeight) return true;

  return false;
}

// --- Desenhar jogador com espelhamento ---
function drawPlayer(px, py, pImg, pDir) {
  ctx.save();
  if (pDir === "left") {
    ctx.translate(px + player.width / 2, py + player.height / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(pImg, -player.width / 2, -player.height / 2, player.width, player.height);
  } else {
    ctx.drawImage(pImg, px, py, player.width, player.height);
  }
  ctx.restore();
}


// --- socket.io ---
socket.on("worldState", data => {
  worldPlayers = data.worldPlayers || {};
});

socket.on("worldPlayersUpdate", data => {
  for (let id in data) {
    worldPlayers[id] = data[id]; // atualiza ou adiciona player
  }

  // opcional: remover players que saíram
  for (let id in worldPlayers) {
    if (!data[id]) delete worldPlayers[id];
  }
});

// --- loop ---
function gameLoop() {
  movePlayer();
  draw();
  requestAnimationFrame(gameLoop);
}


const socket = io();

// --- Canvas ---
const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d");

// --- Player Images ---
const playerImages = {};
const classes = ["humano", "Lobisomem", "Bruxa", "Vampiro"];
for (let c of classes) {
  const img = new Image();
  img.src = `./${c}.png`;
  playerImages[c] = img;
}

// --- Tiles --- (pré‑carregar tiles.json)
let loadedTiles = {};
fetch("tiles.json")
  .then(res => res.json())
  .then(data => {
    for (let tile of data.tiles) {
      const img = new Image();
      img.src = tile.image;
      img.onload = () => console.log("Tile carregado:", tile.image);
      img.onerror = () => console.error("Erro carregando tile:", tile.image);
      loadedTiles[tile.id] = img;
    }
  });

// --- Mapa ---
let mapData = null;
fetch("mapa.json")
  .then(res => res.json())
  .then(map => {
    mapData = map;
    console.log("Mapa carregado:", mapData);
    gameLoop();
  });

// --- Player local ---
const playerClass = localStorage.getItem("playerClass") || "humano";
const playerImg = new Image();
playerImg.src = `./${playerClass}.png`;

let player = {
  x: 200,
  y: 200,
  width: 48,
  height: 48,
  direction: "right",
  class: playerClass
};

// --- Outros jogadores ---
let worldPlayers = {};

// --- Teclado ---
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Dimensões do mapa ---
const mapWidth = 50 * 32;
const mapHeight = 50 * 32;

// --- Função draw ---
function draw() {
  if (!mapData) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let layer of mapData.layers) {
    if (layer.type === "tilelayer") {
      for (let i = 0; i < layer.data.length; i++) {
        const tileId = layer.data[i];
        if (tileId === 0) continue;

        const x = (i % mapData.width) * 32;
        const y = Math.floor(i / mapData.width) * 32;

        const tileImg = loadedTiles[tileId];
        if (tileImg && tileImg.complete) {
          ctx.drawImage(tileImg, x, y, tileImg.width, tileImg.height);
        }
      }
    }
  }

  drawPlayer(player.x, player.y, playerImg, player.direction);

  for (let id in worldPlayers) {
    const p = worldPlayers[id];
    if (!p || id === socket.id) continue;
    const img = playerImages[p.class];
    if (img && img.complete) drawPlayer(p.x, p.y, img, p.direction);
  }
}

// --- Movimentar ---
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

function drawPlayer(px, py, pImg, pDir) {
  if (!pImg || !pImg.complete) return;
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

socket.on("worldState", data => {
  worldPlayers = data.worldPlayers || {};
});

socket.on("worldPlayersUpdate", data => {
  for (let id in data) worldPlayers[id] = data[id];
  for (let id in worldPlayers) if (!data[id]) delete worldPlayers[id];
});

function gameLoop() {
  movePlayer();
  draw();
  requestAnimationFrame(gameLoop);
}

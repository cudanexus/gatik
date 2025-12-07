const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = overlay.querySelector('h2');
const overlayText = overlay.querySelector('p');

// Game Constants
const TILE_SIZE = 20;
const GRID_WIDTH = canvas.width / TILE_SIZE;
const GRID_HEIGHT = canvas.height / TILE_SIZE;
const GAME_SPEED = 100; // ms per frame

// Colors
const COLOR_SNAKE_HEAD = '#0ff';
const COLOR_SNAKE_BODY = '#008888';
const COLOR_FOOD = '#f0f';
const COLOR_PARTICLE = '#ff0';

// Game State
let snake = [];
let food = { x: 0, y: 0 };
let direction = { x: 0, y: 0 };
let nextDirection = { x: 0, y: 0 };
let score = 0;
let gameLoopId = null;
let isGameRunning = false;
let particles = [];

// Audio Context (for simple synth sounds)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'die') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

// Particle System
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = COLOR_PARTICLE;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE/2));
    }
}

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score.toString().padStart(3, '0');
    placeFood();
    particles = [];
    isGameRunning = true;
    overlay.classList.add('hidden');
    
    if (gameLoopId) clearInterval(gameLoopId);
    gameLoopId = setInterval(gameLoop, GAME_SPEED);
    
    // Start animation loop for particles
    requestAnimationFrame(renderLoop);
}

function placeFood() {
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * GRID_WIDTH);
        food.y = Math.floor(Math.random() * GRID_HEIGHT);
        
        validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
}

function handleInput(e) {
    if (!isGameRunning) {
        if (e.code === 'Space') {
            initGame();
        }
        return;
    }

    switch(e.code) {
        case 'ArrowUp':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
    }
}

function gameLoop() {
    update();
    // Drawing is handled in renderLoop for smoother animations
}

function update() {
    direction = nextDirection;

    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Wall Collision
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        gameOver();
        return;
    }

    // Self Collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score.toString().padStart(3, '0');
        playSound('eat');
        createExplosion(food.x, food.y);
        placeFood();
    } else {
        snake.pop();
    }
}

function renderLoop() {
    draw();
    if (isGameRunning || particles.length > 0) {
        requestAnimationFrame(renderLoop);
    }
}

function draw() {
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE_BODY;
        
        // Glow effect for head
        if (index === 0) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = COLOR_SNAKE_HEAD;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fillRect(
            segment.x * TILE_SIZE + 1, 
            segment.y * TILE_SIZE + 1, 
            TILE_SIZE - 2, 
            TILE_SIZE - 2
        );
        
        ctx.shadowBlur = 0; // Reset shadow
    });

    // Draw Food
    ctx.fillStyle = COLOR_FOOD;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_FOOD;
    
    // Pulsing effect
    const pulse = Math.sin(Date.now() / 200) * 2;
    ctx.fillRect(
        food.x * TILE_SIZE + 2 - pulse/2, 
        food.y * TILE_SIZE + 2 - pulse/2, 
        TILE_SIZE - 4 + pulse, 
        TILE_SIZE - 4 + pulse
    );
    ctx.shadowBlur = 0;

    // Draw Particles
    particles.forEach((p, i) => {
        p.update();
        p.draw(ctx);
        if (p.life <= 0) particles.splice(i, 1);
    });
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoopId);
    playSound('die');
    
    overlayTitle.textContent = "SYSTEM FAILURE";
    overlayTitle.classList.remove('blink');
    overlayTitle.style.color = '#f00';
    overlayTitle.style.textShadow = '0 0 10px #f00';
    
    overlayText.innerHTML = `FINAL SCORE: <span class="key-highlight">${score}</span><br><br>PRESS <span class="key-highlight">SPACE</span> TO REBOOT`;
    
    overlay.classList.remove('hidden');
}

window.addEventListener('keydown', handleInput);

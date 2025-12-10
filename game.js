// Game state and configuration
const gameState = {
    isRunning: false,
    isPaused: false,
    score: 0,
    lives: 3,
    level: 1,
    gameSpeed: 60
};

// Canvas and context
let canvas;
let ctx;

// Game objects
let player;
let treasures = [];
let obstacles = [];
let particles = [];

// Input handling
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ArrowUp: false,
    ArrowLeft: false,
    ArrowDown: false,
    ArrowRight: false
};

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 5;
        this.color = '#ff6b6b';
    }

    update() {
        // Movement controls
        if (keys.w || keys.ArrowUp) {
            this.y = Math.max(0, this.y - this.speed);
        }
        if (keys.s || keys.ArrowDown) {
            this.y = Math.min(canvas.height - this.height, this.y + this.speed);
        }
        if (keys.a || keys.ArrowLeft) {
            this.x = Math.max(0, this.x - this.speed);
        }
        if (keys.d || keys.ArrowRight) {
            this.x = Math.min(canvas.width - this.width, this.x + this.speed);
        }
    }

    draw() {
        // Draw player as a simple character
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add some detail - eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 5, this.y + 5, 6, 6);
        ctx.fillRect(this.x + 19, this.y + 5, 6, 6);
        
        // Pupils
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 7, this.y + 7, 2, 2);
        ctx.fillRect(this.x + 21, this.y + 7, 2, 2);
        
        // Smile
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + 15, this.y + 20, 8, 0, Math.PI);
        ctx.stroke();
    }
}

// Treasure class
class Treasure {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.color = '#ffd700';
        this.collected = false;
    }

    draw() {
        if (!this.collected) {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Add sparkle effect
            ctx.fillStyle = '#fff';
            ctx.fillRect(this.x + 8, this.y + 2, 4, 4);
            ctx.fillRect(this.x + 2, this.y + 8, 4, 4);
            ctx.fillRect(this.x + 14, this.y + 14, 4, 4);
        }
    }

    checkCollision(player) {
        if (!this.collected &&
            player.x < this.x + this.width &&
            player.x + player.width > this.x &&
            player.y < this.y + this.height &&
            player.y + player.height > this.y) {
            this.collected = true;
            gameState.score += 100;
            updateUI();
            createParticles(this.x + this.width/2, this.y + this.height/2);
            return true;
        }
        return false;
    }
}

// Obstacle class
class Obstacle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = '#8b4513';
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add texture
        ctx.fillStyle = '#654321';
        for (let i = 0; i < this.width; i += 10) {
            ctx.fillRect(this.x + i, this.y, 2, this.height);
        }
    }

    checkCollision(player) {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }
}

// Particle class for effects
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 30;
        this.maxLife = 30;
        this.color = '#ffd700';
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1;
    }
}

// Initialize game
function initGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Create player
    player = new Player(50, canvas.height / 2);
    
    // Create initial treasures
    generateTreasures();
    
    // Create obstacles
    generateObstacles();
    
    // Set up event listeners
    setupEventListeners();
    
    updateUI();
}

// Generate treasures randomly
function generateTreasures() {
    treasures = [];
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * (canvas.width - 20);
        const y = Math.random() * (canvas.height - 20);
        treasures.push(new Treasure(x, y));
    }
}

// Generate obstacles
function generateObstacles() {
    obstacles = [];
    for (let i = 0; i < 3; i++) {
        const x = Math.random() * (canvas.width - 60);
        const y = Math.random() * (canvas.height - 40);
        obstacles.push(new Obstacle(x, y, 60, 40));
    }
}

// Create particle effects
function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(x, y));
    }
}

// Game loop
function gameLoop() {
    if (!gameState.isRunning || gameState.isPaused) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update player
    player.update();
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Check treasure collisions
    treasures.forEach(treasure => {
        treasure.checkCollision(player);
    });
    
    // Check obstacle collisions
    obstacles.forEach(obstacle => {
        if (obstacle.checkCollision(player)) {
            gameState.lives--;
            updateUI();
            
            if (gameState.lives <= 0) {
                gameOver();
                return;
            }
            
            // Reset player position
            player.x = 50;
            player.y = canvas.height / 2;
        }
    });
    
    // Check if all treasures collected
    if (treasures.every(treasure => treasure.collected)) {
        nextLevel();
    }
    
    // Draw everything
    drawGame();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Draw all game objects
function drawGame() {
    // Draw treasures
    treasures.forEach(treasure => treasure.draw());
    
    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw());
    
    // Draw particles
    particles.forEach(particle => particle.draw());
    
    // Draw player
    player.draw();
}

// Next level
function nextLevel() {
    gameState.level++;
    gameState.score += 500;
    updateUI();
    
    // Generate new treasures and obstacles
    generateTreasures();
    generateObstacles();
    
    // Reset player position
    player.x = 50;
    player.y = canvas.height / 2;
}

// Game over
function gameOver() {
    gameState.isRunning = false;
    alert(`Game Over! Final Score: ${gameState.score}`);
    resetGame();
}

// Reset game
function resetGame() {
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.score = 0;
    gameState.lives = 3;
    gameState.level = 1;
    
    // Reset player position
    if (player) {
        player.x = 50;
        player.y = canvas.height / 2;
    }
    
    // Clear arrays
    particles = [];
    
    // Regenerate game objects
    generateTreasures();
    generateObstacles();
    
    updateUI();
    
    // Clear canvas
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGame();
    }
}

// Update UI elements
function updateUI() {
    document.getElementById('score').textContent = `Score: ${gameState.score}`;
    document.getElementById('lives').textContent = `Lives: ${gameState.lives}`;
    document.getElementById('level').textContent = `Level: ${gameState.level}`;
}

// Event listeners
function setupEventListeners() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.code in keys) {
            keys[e.code] = true;
            e.preventDefault();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (e.code in keys) {
            keys[e.code] = false;
            e.preventDefault();
        }
    });
    
    // Button controls
    document.getElementById('startBtn').addEventListener('click', () => {
        if (!gameState.isRunning) {
            gameState.isRunning = true;
            gameState.isPaused = false;
            gameLoop();
        }
    });
    
    document.getElementById('pauseBtn').addEventListener('click', () => {
        if (gameState.isRunning) {
            gameState.isPaused = !gameState.isPaused;
            if (!gameState.isPaused) {
                gameLoop();
            }
        }
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        resetGame();
    });
}

// Initialize game when page loads
window.addEventListener('load', () => {
    initGame();
});
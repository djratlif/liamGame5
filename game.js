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
        // Debug: Log key states (remove this after debugging)
        const activeKeys = Object.keys(keys).filter(key => keys[key]);
        if (activeKeys.length > 0) {
            console.log('Active keys:', activeKeys);
        }
        
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
        
        // Check if player touches the bottom (death zone)
        if (this.y + this.height >= canvas.height) {
            return 'death';
        }
        
        return 'alive';
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
    constructor(x, y, width, height, isMoving = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = isMoving ? '#8b0000' : '#8b4513'; // Dark red for moving obstacles
        this.isMoving = isMoving;
        
        if (isMoving) {
            // Random movement direction and speed
            this.vx = (Math.random() - 0.5) * 2; // -1 to 1
            this.vy = (Math.random() - 0.5) * 2; // -1 to 1
            this.originalX = x;
            this.originalY = y;
            this.moveRadius = 50; // How far from original position it can move
        }
    }

    update() {
        if (this.isMoving) {
            // Move the obstacle
            this.x += this.vx;
            this.y += this.vy;
            
            // Bounce off canvas edges
            if (this.x <= 0 || this.x + this.width >= canvas.width) {
                this.vx = -this.vx;
                this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
            }
            
            // Keep away from death zone and top edge
            const deathZoneHeight = getDeathZoneHeight();
            if (this.y <= 0 || this.y + this.height >= canvas.height - deathZoneHeight) {
                this.vy = -this.vy;
                this.y = Math.max(0, Math.min(canvas.height - deathZoneHeight - this.height, this.y));
            }
            
            // Keep within movement radius of original position
            const distanceFromOrigin = Math.sqrt(
                Math.pow(this.x - this.originalX, 2) + Math.pow(this.y - this.originalY, 2)
            );
            
            if (distanceFromOrigin > this.moveRadius) {
                // Reverse direction when too far from origin
                this.vx = -this.vx;
                this.vy = -this.vy;
            }
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add texture
        ctx.fillStyle = this.isMoving ? '#660000' : '#654321';
        for (let i = 0; i < this.width; i += 10) {
            ctx.fillRect(this.x + i, this.y, 2, this.height);
        }
        
        // Add movement indicator for moving obstacles
        if (this.isMoving) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x + this.width/2 - 2, this.y + this.height/2 - 2, 4, 4);
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

// Generate treasures randomly - more treasures each level
function generateTreasures() {
    treasures = [];
    const treasureCount = 3 + (gameState.level * 2); // Start with 5, add 2 per level
    const deathZoneHeight = getDeathZoneHeight();
    
    for (let i = 0; i < treasureCount; i++) {
        let x, y;
        let attempts = 0;
        do {
            x = Math.random() * (canvas.width - 20);
            y = Math.random() * (canvas.height - 20 - deathZoneHeight); // Keep away from death zone
            attempts++;
        } while (attempts < 100 && isTreasurePositionBlocked(x, y, 20, 20));
        treasures.push(new Treasure(x, y));
    }
}

// Generate obstacles - more and larger obstacles each level
function generateObstacles() {
    obstacles = [];
    const obstacleCount = 2 + gameState.level; // Start with 3, add 1 per level
    const baseSize = 40;
    const deathZoneHeight = getDeathZoneHeight();
    
    // From level 3 onwards, some obstacles will be moving
    const movingObstacleCount = gameState.level >= 3 ? Math.floor(obstacleCount / 2) : 0;
    
    for (let i = 0; i < obstacleCount; i++) {
        let x, y, width, height;
        let attempts = 0;
        
        // Make obstacles larger each level
        width = baseSize + (gameState.level * 8);
        height = baseSize + (gameState.level * 4);
        
        do {
            x = Math.random() * (canvas.width - width);
            y = Math.random() * (canvas.height - height - deathZoneHeight); // Keep away from death zone
            attempts++;
        } while (attempts < 50 && isPositionBlocked(x, y, width, height));
        
        // Determine if this obstacle should be moving
        const isMoving = i < movingObstacleCount;
        
        obstacles.push(new Obstacle(x, y, width, height, isMoving));
    }
}

// Get death zone height - increases with level
function getDeathZoneHeight() {
    return 10 + (gameState.level * 3); // Start at 10px, add 3px per level
}

// Check if a position is blocked by existing obstacles (for obstacle placement)
function isPositionBlocked(x, y, width, height) {
    // Check against existing obstacles
    for (let obstacle of obstacles) {
        if (x < obstacle.x + obstacle.width &&
            x + width > obstacle.x &&
            y < obstacle.y + obstacle.height &&
            y + height > obstacle.y) {
            return true;
        }
    }
    
    // Keep away from player starting position
    if (x < 100 && y > canvas.height / 2 - 50 && y < canvas.height / 2 + 50) {
        return true;
    }
    
    return false;
}

// Check if a treasure position is blocked by obstacles (for treasure placement)
function isTreasurePositionBlocked(x, y, width, height) {
    // Check against ALL obstacles (they're already placed when treasures are generated)
    for (let obstacle of obstacles) {
        // First check: Don't spawn directly inside obstacles
        if (x < obstacle.x + obstacle.width &&
            x + width > obstacle.x &&
            y < obstacle.y + obstacle.height &&
            y + height > obstacle.y) {
            return true;
        }
        
        // Second check: Add VERY generous padding around obstacles for safe collection
        const padding = obstacle.isMoving ? 60 : 40; // Much larger buffer zones
        if (x < obstacle.x + obstacle.width + padding &&
            x + width > obstacle.x - padding &&
            y < obstacle.y + obstacle.height + padding &&
            y + height > obstacle.y - padding) {
            return true;
        }
    }
    
    // Keep away from player starting position with larger buffer
    if (x < 120 && y > canvas.height / 2 - 60 && y < canvas.height / 2 + 60) {
        return true;
    }
    
    return false;
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
    
    // Update player and check for death
    const playerStatus = player.update();
    if (playerStatus === 'death') {
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
    
    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.life > 0;
    });
    
    // Update moving obstacles
    obstacles.forEach(obstacle => {
        if (obstacle.isMoving) {
            obstacle.update();
        }
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
    // Draw death zone at the bottom - gets bigger each level
    const deathZoneHeight = getDeathZoneHeight();
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, canvas.height - deathZoneHeight, canvas.width, deathZoneHeight);
    
    // Add warning pattern to death zone
    ctx.fillStyle = '#ffff00';
    for (let i = 0; i < canvas.width; i += 20) {
        ctx.fillRect(i, canvas.height - deathZoneHeight, 10, deathZoneHeight);
    }
    
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
    
    // Increase player speed slightly each level for balance
    player.speed = Math.min(8, 5 + (gameState.level * 0.3));
    
    // Generate new treasures and obstacles
    generateTreasures();
    generateObstacles();
    
    // Reset player position
    player.x = 50;
    player.y = canvas.height / 2;
    
    // Show level up message
    setTimeout(() => {
        const movingObstacles = gameState.level >= 3 ? Math.floor((2 + gameState.level) / 2) : 0;
        let message = `Level ${gameState.level}! Difficulty increased!\n- More obstacles (${2 + gameState.level})\n- Larger obstacles\n- More treasures (${3 + (gameState.level * 2)})\n- Bigger death zone`;
        
        if (gameState.level >= 3) {
            message += `\n- Moving obstacles (${movingObstacles})`;
        }
        
        alert(message);
    }, 100);
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

// Clear all key states to prevent stuck keys
function clearAllKeys() {
    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
    console.log('All keys cleared');
}

// Event listeners
function setupEventListeners() {
    // Clear all keys on window focus/blur to prevent stuck keys
    window.addEventListener('focus', () => {
        clearAllKeys();
    });
    
    window.addEventListener('blur', () => {
        clearAllKeys();
    });
    
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
    
    // Clear keys when losing focus from the document
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearAllKeys();
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
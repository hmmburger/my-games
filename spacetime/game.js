// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 30;
const BULLET_SIZE = 5;
const ENEMY_SIZE = 25;

// Time Eras
const ERAS = [
    { year: 2024, name: 'Present Day', bgColor: '#000022', enemyColor: '#ff0000' },
    { year: 2150, name: 'Future', bgColor: '#001133', enemyColor: '#00ffff' },
    { year: 1880, name: 'Wild West', bgColor: '#221100', enemyColor: '#ffaa00' },
    { year: 3000, name: 'Far Future', bgColor: '#110022', enemyColor: '#ff00ff' },
    { year: 10000, name: 'Time End', bgColor: '#000000', enemyColor: '#ffffff' }
];

// Game State
let canvas, ctx;
let gameState = 'start'; // start, playing, shop, gameover, pause
let player;
let player2 = null; // For PVP mode
let bullets = [];
let bullets2 = []; // Player 2's bullets
let enemies = [];
let particles = [];
let powerups = [];
let coins = 0;
let activeBuffs = []; // { type: string, endTime: number, value: any }
let isPvP = false;

// Persistent progress
let totalCoins = parseInt(localStorage.getItem('spacetime_coins')) || 0;
let unlockedLevels = parseInt(localStorage.getItem('spacetime_levels')) || 1;
let currentLevel = 1;

// Permanent ship upgrades
let shipUpgrades = JSON.parse(localStorage.getItem('spacetime_upgrades')) || {
    speed: 0,
    health: 0,
    damage: 0,
    firerate: 0,
    multishot: 0
};

// Level definitions
const LEVELS = [
    { id: 1, name: 'Present Day', waves: 2, enemySpeed: 0.8, enemyHealth: 1, spawnRate: 0.01 },
    { id: 2, name: 'Near Future', waves: 3, enemySpeed: 1, enemyHealth: 1, spawnRate: 0.015 },
    { id: 3, name: 'Wild West', waves: 4, enemySpeed: 1.2, enemyHealth: 1, spawnRate: 0.02 },
    { id: 4, name: 'Future', waves: 5, enemySpeed: 1.3, enemyHealth: 2, spawnRate: 0.025 },
    { id: 5, name: 'Time End', waves: 6, enemySpeed: 1.5, enemyHealth: 2, spawnRate: 0.03 },
    { id: 6, name: 'Void', waves: 7, enemySpeed: 1.7, enemyHealth: 3, spawnRate: 0.035 },
    { id: 7, name: 'Infinity', waves: 10, enemySpeed: 2, enemyHealth: 3, spawnRate: 0.04 }
];
let wave = 1;
let eraIndex = 0;
let enemiesKilled = 0;
let enemiesPerWave = 5;
let wavesCompleted = 0;
let bossActive = false;
let boss = null;
let enemiesSpawned = 0;
let lastEnemyTime = Date.now();
let lastDamageTime = 0; // Cooldown for taking damage
let shopItems = [];
let keys = {};

// Initialize
window.onload = function() {
    canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    ctx = canvas.getContext('2d');

    setupEventListeners();
    loadBroadcastMessage();
    updateMainMenu();
    gameLoop();
};

function setupEventListeners() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    });
    document.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mouse tracking
    canvas.addEventListener('mousemove', (e) => {
        if (player) {
            const rect = canvas.getBoundingClientRect();
            player.mouseX = e.clientX - rect.left;
            player.mouseY = e.clientY - rect.top;
        }
    });

    // Mouse shooting
    canvas.addEventListener('click', () => {
        if (gameState === 'playing') {
            player.shoot();
        }
    });

    // Buttons
    document.getElementById('start-btn').addEventListener('click', () => startGame(1));
    document.getElementById('restart-btn').addEventListener('click', () => startGame(currentLevel));
    document.getElementById('next-wave-btn').addEventListener('click', nextWave);
    document.getElementById('resume-btn').addEventListener('click', togglePause);
    document.getElementById('upgrades-btn').addEventListener('click', showUpgradeShop);
    document.getElementById('levels-btn').addEventListener('click', showLevelSelect);
    document.getElementById('back-from-upgrades').addEventListener('click', () => showScreen('start-screen'));
    document.getElementById('back-from-levels').addEventListener('click', () => showScreen('start-screen'));
    document.getElementById('pvp-btn').addEventListener('click', () => showScreen('pvp-screen'));
    document.getElementById('back-from-pvp').addEventListener('click', () => showScreen('start-screen'));
    document.getElementById('start-pvp-btn').addEventListener('click', startPvP);

    // Leaderboard button
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });

    // Auth buttons
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('signup-btn').addEventListener('click', handleSignup);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Submit score button
    document.getElementById('submit-score-btn').addEventListener('click', handleSubmitScore);

    // View leaderboard button
    document.getElementById('view-leaderboard-btn').addEventListener('click', () => {
        window.location.href = 'leaderboard.html';
    });
}

// Auth Handler Functions
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Please enter both username and password!');
        return;
    }

    const result = await logIn(username, password);

    if (result.success) {
        // Clear inputs
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        alert('✅ ' + result.message);
    } else {
        alert('❌ ' + result.message);
    }
}

async function handleSignup() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        alert('Please enter both username and password!');
        return;
    }

    if (username.length < 3) {
        alert('Username must be at least 3 characters!');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters!');
        return;
    }

    const result = await signUp(username, password);

    if (result.success) {
        // Clear inputs
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        alert('✅ ' + result.message);
    } else {
        alert('❌ ' + result.message);
    }
}

async function handleLogout() {
    const result = await logOut();
    if (result.success) {
        alert('✅ ' + result.message);
    } else {
        alert('❌ ' + result.message);
    }
}

async function handleSubmitScore() {
    const statusDiv = document.getElementById('score-status');
    const submitBtn = document.getElementById('submit-score-btn');

    // Show loading state
    statusDiv.style.display = 'block';
    statusDiv.style.color = '#ffff00';
    statusDiv.textContent = 'Submitting...';
    submitBtn.disabled = true;

    const result = await submitScore(totalCoins, wavesCompleted);

    if (result.success) {
        statusDiv.style.color = '#00ff00';
        statusDiv.textContent = result.message;
        submitBtn.textContent = '✅ SUBMITTED';
        submitBtn.disabled = true;
    } else {
        statusDiv.style.color = '#ff0000';
        statusDiv.textContent = result.message;
        submitBtn.disabled = false;
    }
}

// Player Class
class Player {
    constructor(isPlayer2 = false) {
        this.isPlayer2 = isPlayer2;

        if (isPlayer2) {
            // Player 2 starts on the right side
            this.x = CANVAS_WIDTH - 100;
            this.y = 100;
        } else {
            this.x = CANVAS_WIDTH / 2;
            this.y = CANVAS_HEIGHT - 100;
        }

        this.width = PLAYER_SIZE;
        this.height = PLAYER_SIZE;

        // Base stats + permanent upgrades (for player 1)
        // In PvP, both players have same stats (no upgrades)
        const pvpStats = isPlayer2 || isPvP;
        this.baseSpeed = 5;
        this.baseHealth = pvpStats ? 30 : 100; // Less health for PvP (30 HP = 3-4 hits)
        this.baseMaxHealth = pvpStats ? 30 : (100 + shipUpgrades.health * 25);
        this.baseFireRate = 500;
        this.baseBulletSpeed = 8;
        this.baseBulletDamage = pvpStats ? 10 : (1 + shipUpgrades.damage); // Higher damage for PvP
        this.baseBulletsPerShot = pvpStats ? 1 : (1 + shipUpgrades.multishot);

        // Current stats (will be modified by buffs)
        this.speed = this.baseSpeed;
        this.health = this.baseHealth;
        this.maxHealth = this.baseMaxHealth;
        this.fireRate = Math.max(50, this.baseFireRate);
        this.bulletSpeed = this.baseBulletSpeed;
        this.bulletDamage = this.baseBulletDamage;
        this.bulletsPerShot = this.baseBulletsPerShot;
        this.spread = this.baseBulletsPerShot > 1 ? 0.3 : 0;

        this.lastShot = 0;
        this.angle = isPlayer2 ? Math.PI / 2 : -Math.PI / 2; // Player 2 faces down
        this.mouseX = this.x;
        this.mouseY = this.y - 100;
        this.color = isPlayer2 ? '#ff00ff' : '#00ffff';
    }

    update() {
        // Apply buffs to get current stats
        this.applyBuffs();

        if (this.isPlayer2) {
            // Player 2 Tank Controls (IJKL)
            // Rotation
            if (keys['j']) this.angle -= 0.05; // Rotate left
            if (keys['l']) this.angle += 0.05; // Rotate right

            // Movement (forward/backward in facing direction)
            if (keys['i']) { // Forward
                this.x += Math.cos(this.angle) * this.speed;
                this.y += Math.sin(this.angle) * this.speed;
            }
            if (keys['k']) { // Backward
                this.x -= Math.cos(this.angle) * this.speed;
                this.y -= Math.sin(this.angle) * this.speed;
            }

            // Shooting with semicolon
            if (keys[';']) {
                this.shoot();
            }
        } else {
            // Player 1 Tank Controls (WASD)
            if (isPvP) {
                // Tank controls for PVP
                if (keys['a']) this.angle -= 0.05; // Rotate left
                if (keys['d']) this.angle += 0.05; // Rotate right

                if (keys['w']) { // Forward
                    this.x += Math.cos(this.angle) * this.speed;
                    this.y += Math.sin(this.angle) * this.speed;
                }
                if (keys['s']) { // Backward
                    this.x -= Math.cos(this.angle) * this.speed;
                    this.y -= Math.sin(this.angle) * this.speed;
                }
            } else {
                // Regular controls for single player
                if (keys['w'] || keys['arrowup']) this.y -= this.speed;
                if (keys['s'] || keys['arrowdown']) this.y += this.speed;
                if (keys['a'] || keys['arrowleft']) this.x -= this.speed;
                if (keys['d'] || keys['arrowright']) this.x += this.speed;

                // Update angle to face mouse
                const dx = this.mouseX - this.x;
                const dy = this.mouseY - this.y;
                this.angle = Math.atan2(dy, dx);
            }

            // Shooting
            if (keys[' ']) {
                this.shoot();
            }
        }

        // Boundaries
        this.x = Math.max(this.width/2, Math.min(CANVAS_WIDTH - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(CANVAS_HEIGHT - this.height/2, this.y));
    }

    applyBuffs() {
        // Reset to base stats
        this.speed = this.baseSpeed;
        this.maxHealth = this.baseMaxHealth;
        this.fireRate = this.baseFireRate;
        this.bulletDamage = this.baseBulletDamage;
        this.bulletsPerShot = this.baseBulletsPerShot;
        this.spread = 0;

        // Apply active buffs
        activeBuffs.forEach(buff => {
            switch(buff.type) {
                case 'speed':
                    this.speed += buff.value;
                    break;
                case 'multishot':
                    this.bulletsPerShot += buff.value;
                    this.spread = 0.3;
                    break;
                case 'firerate':
                    this.fireRate = Math.max(50, this.baseFireRate - buff.value);
                    break;
                case 'shield':
                    this.maxHealth += buff.value;
                    break;
                case 'damage':
                    this.bulletDamage += buff.value;
                    break;
            }
        });

        // Ensure health doesn't exceed max
        if (this.health > this.maxHealth) {
            this.health = this.maxHealth;
        }
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.fireRate) return;
        this.lastShot = now;

        const bulletArray = this.isPlayer2 ? bullets2 : bullets;

        if (this.bulletsPerShot === 1) {
            bulletArray.push(new Bullet(this.x, this.y, this.angle, this.bulletSpeed, this.bulletDamage, this.isPlayer2));
        } else {
            const spreadAngle = this.spread / (this.bulletsPerShot - 1);
            for (let i = 0; i < this.bulletsPerShot; i++) {
                const bulletAngle = this.angle - this.spread/2 + spreadAngle * i;
                bulletArray.push(new Bullet(this.x, this.y, bulletAngle, this.bulletSpeed, this.bulletDamage, this.isPlayer2));
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2); // Rotate to face mouse direction

        // Ship body - blocky pixel style
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Cockpit
        ctx.fillStyle = this.isPlayer2 ? '#00ffff' : '#ff00ff';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);

        // Engine glow
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-this.width/4, this.height/2 - 5, this.width/2, 8);

        ctx.restore();
    }

    takeDamage(amount) {
        console.log('Player taking damage:', amount, 'Health:', this.health, '->', this.health - amount);
        this.health -= amount;
        createParticles(this.x, this.y, '#ff0000', 10);
        if (this.health <= 0) {
            console.log('PLAYER DIED');
            gameOver();
        }
    }
}

// Bullet Class
class Bullet {
    constructor(x, y, angle, speed, damage, isPlayer2Bullet = false) {
        this.x = x;
        this.y = y;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.size = BULLET_SIZE;
        this.isPlayer2Bullet = isPlayer2Bullet;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        ctx.fillStyle = this.isPlayer2Bullet ? '#ff00ff' : '#ffff00';
        ctx.shadowColor = this.isPlayer2Bullet ? '#ff00ff' : '#ffff00';
        ctx.shadowBlur = 10;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.shadowBlur = 0;
    }

    isOffScreen() {
        return this.x < 0 || this.x > CANVAS_WIDTH || this.y < 0 || this.y > CANVAS_HEIGHT;
    }
}

// Enemy Class
class Enemy {
    constructor() {
        // Spawn from random edges (not just top)
        const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
        switch(side) {
            case 0: // Top
                this.x = Math.random() * CANVAS_WIDTH;
                this.y = -ENEMY_SIZE;
                break;
            case 1: // Right
                this.x = CANVAS_WIDTH + ENEMY_SIZE;
                this.y = Math.random() * CANVAS_HEIGHT;
                break;
            case 2: // Bottom
                this.x = Math.random() * CANVAS_WIDTH;
                this.y = CANVAS_HEIGHT + ENEMY_SIZE;
                break;
            case 3: // Left
                this.x = -ENEMY_SIZE;
                this.y = Math.random() * CANVAS_HEIGHT;
                break;
        }

        this.width = ENEMY_SIZE;
        this.height = ENEMY_SIZE;
        this.speed = 1.5 + Math.random() * 1.5;
        this.health = 1 + Math.floor(wave / 3);
        this.maxHealth = this.health;
        this.movePattern = Math.floor(Math.random() * 4);
        this.time = 0;
        this.angle = 0;
    }

    update() {
        this.time += 0.03;

        // Calculate angle to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angleToPlayer = Math.atan2(dy, dx);

        // Movement patterns
        switch(this.movePattern) {
            case 0: // Chase player directly
                this.x += Math.cos(angleToPlayer) * this.speed;
                this.y += Math.sin(angleToPlayer) * this.speed;
                break;
            case 1: // Spiral towards player
                this.angle += 0.05;
                const spiralAngle = angleToPlayer + this.angle;
                this.x += Math.cos(spiralAngle) * this.speed;
                this.y += Math.sin(spiralAngle) * this.speed;
                break;
            case 2: // Zigzag chase
                this.x += Math.cos(angleToPlayer) * this.speed + Math.sin(this.time * 2) * 2;
                this.y += Math.sin(angleToPlayer) * this.speed;
                break;
            case 3: // Dash pattern
                if (Math.floor(this.time) % 3 === 0) {
                    this.x += Math.cos(angleToPlayer) * this.speed * 2;
                    this.y += Math.sin(angleToPlayer) * this.speed * 2;
                } else {
                    this.x += Math.cos(angleToPlayer) * this.speed * 0.3;
                    this.y += Math.sin(angleToPlayer) * this.speed * 0.3;
                }
                break;
        }

        // Bounce off screen edges
        if (this.x < this.width/2) {
            this.x = this.width/2;
            this.vx = Math.abs(this.vx || 0);
        }
        if (this.x > CANVAS_WIDTH - this.width/2) {
            this.x = CANVAS_WIDTH - this.width/2;
            this.vx = -Math.abs(this.vx || 0);
        }
        if (this.y < this.height/2) {
            this.y = this.height/2;
            this.vy = Math.abs(this.vy || 0);
        }
        if (this.y > CANVAS_HEIGHT - this.height/2) {
            this.y = CANVAS_HEIGHT - this.height/2;
            this.vy = -Math.abs(this.vy || 0);
        }
    }

    draw() {
        const era = ERAS[eraIndex % ERAS.length];

        ctx.save();
        ctx.translate(this.x, this.y);

        // Enemy ship - blocky pixel style
        ctx.fillStyle = era.enemyColor;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-this.width/4, -this.height/4, 5, 5);
        ctx.fillRect(this.width/4 - 5, -this.height/4, 5, 5);

        // Glow effect
        ctx.shadowColor = era.enemyColor;
        ctx.shadowBlur = 10;

        // Health bar
        if (this.health < this.maxHealth) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#333';
            ctx.fillRect(-this.width/2, -this.height/2 - 10, this.width, 6);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-this.width/2, -this.height/2 - 10, this.width * (this.health / this.maxHealth), 6);
        }

        ctx.restore();
    }

    isOffScreen() {
        return (this.x < -ENEMY_SIZE * 2 ||
                this.x > CANVAS_WIDTH + ENEMY_SIZE * 2 ||
                this.y < -ENEMY_SIZE * 2 ||
                this.y > CANVAS_HEIGHT + ENEMY_SIZE * 2);
    }
}

// Particle Class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.life = 1;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;
        ctx.fillRect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Boss Class
class Boss {
    constructor(level) {
        this.x = CANVAS_WIDTH / 2;
        this.y = -100;
        this.width = 80;
        this.height = 80;
        this.targetY = 150;
        this.health = Math.floor((20 + level * 15) * 0.8); // 20% less health!
        this.maxHealth = this.health;
        this.phase = 0; // 0: entering, 1: attacking, 2: desperate
        this.attackTimer = 0;
        this.attackPattern = 0;
        this.moveTimer = 0;
        this.level = level;
    }

    update() {
        // Phase 0: Enter screen
        if (this.phase === 0) {
            this.y += 2;
            console.log('Boss entering, y:', this.y);
            if (this.y >= this.targetY) {
                this.phase = 1;
                console.log('Boss phase 1 - attacking!');
            }
            return;
        }

        // Movement
        this.moveTimer += 0.02;
        this.x += Math.sin(this.moveTimer) * 3;

        // Keep on screen
        this.x = Math.max(this.width/2, Math.min(CANVAS_WIDTH - this.width/2, this.x));

        // Attack patterns based on phase
        const healthPercent = this.health / this.maxHealth;

        if (healthPercent < 0.3 && this.phase !== 2) {
            this.phase = 2; // Desperate mode!
        }

        this.attackTimer++;

        // Different attack patterns (slower for level 1)
        const attackSpeed = this.level === 1 ? 100 : 60;
        if (this.attackTimer >= attackSpeed) {
            this.attackTimer = 0;
            this.attackPattern = (this.attackPattern + 1) % 3;

            switch(this.attackPattern) {
                case 0: // Spread shot
                    const numBullets = this.level === 1 ? 4 : 8 + this.level;
                    for (let i = 0; i < numBullets; i++) {
                        const angle = (Math.PI * 2 / numBullets) * i;
                        const bullet = {
                            x: this.x,
                            y: this.y + this.height/2,
                            vx: Math.cos(angle) * 3,
                            vy: Math.sin(angle) * 3,
                            width: 10,
                            height: 10,
                            damage: 10,
                            isBossBullet: true
                        };
                        bullets.push(bullet);
                    }
                    break;
                case 1: // Aimed shot
                    const angle = Math.atan2(player.y - this.y, player.x - this.x);
                    const bullet = {
                        x: this.x,
                        y: this.y + this.height/2,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        width: 15,
                        height: 15,
                        damage: this.level === 1 ? 8 : 15,
                        isBossBullet: true
                    };
                    bullets.push(bullet);
                    break;
                case 2: // Circle burst (phase 2 only)
                    if (this.phase === 2) {
                        for (let i = 0; i < 16; i++) {
                            const angle = (Math.PI * 2 / 16) * i;
                            const bullet = {
                                x: this.x,
                                y: this.y + this.height/2,
                                vx: Math.cos(angle) * 4,
                                vy: Math.sin(angle) * 4,
                                width: 12,
                                height: 12,
                                damage: 12,
                                isBossBullet: true
                            };
                            bullets.push(bullet);
                        }
                    }
                    break;
            }
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Boss body - bigger and menacing
        ctx.fillStyle = '#ff0000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 20;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Boss face
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-this.width/4, -this.height/4, this.width/2, this.height/2);

        // Eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(-this.width/5, -this.height/8, 8, 8);
        ctx.fillRect(this.width/5 - 8, -this.height/8, 8, 8);

        // Health bar
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#333';
        ctx.fillRect(-this.width/2, -this.height/2 - 20, this.width, 15);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-this.width/2, -this.height/2 - 20, this.width * (this.health / this.maxHealth), 15);

        ctx.restore();
    }

    takeDamage(amount) {
        try {
            console.log('Boss taking damage:', amount, 'Health:', this.health, '->', this.health - amount);
            this.health -= amount;
            createParticles(this.x, this.y, '#ff0000', 5);

            if (this.health <= 0) {
                console.log('Boss died! Calling levelComplete...');
                createParticles(this.x, this.y, '#ff0000', 50);
                levelComplete();
            }
        } catch (error) {
            console.error('Error in boss.takeDamage:', error);
        }
    }
}

// Powerup Class
class Powerup {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.vy = 1.5;
        this.type = this.randomType();
        this.time = 0;
    }

    randomType() {
        const types = ['health', 'speed', 'multishot', 'firerate', 'shield', 'damage'];
        return types[Math.floor(Math.random() * types.length)];
    }

    update() {
        this.y += this.vy;
        this.time += 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        const colors = {
            health: '#ff0000',
            speed: '#00ff00',
            multishot: '#ff00ff',
            firerate: '#ffff00',
            shield: '#00ffff',
            damage: '#ff8800'
        };

        const symbols = {
            health: '+',
            speed: '⚡',
            multishot: '✦',
            firerate: '◉',
            shield: '○',
            damage: '↑'
        };

        const color = colors[this.type];

        // Glowing box
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);

        // Symbol
        ctx.fillStyle = color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbols[this.type], 0, 0);

        ctx.restore();
    }

    isOffScreen() {
        return this.y > CANVAS_HEIGHT + this.height;
    }

    collect() {
        // Health is instant, others are temporary buffs
        if (this.type === 'health') {
            player.health = Math.min(player.health + 30, player.maxHealth);
        } else {
            const buffDurations = {
                speed: 15000,      // 15 seconds
                multishot: 12000,  // 12 seconds
                firerate: 10000,   // 10 seconds
                shield: 20000,     // 20 seconds
                damage: 15000      // 15 seconds
            };

            const buffValues = {
                speed: 2,
                multishot: 2,
                firerate: 100,
                shield: 50,
                damage: 2
            };

            activeBuffs.push({
                type: this.type,
                endTime: Date.now() + buffDurations[this.type],
                value: buffValues[this.type]
            });
        }

        createParticles(this.x, this.y, '#ffffff', 20);
    }
}

// Game Functions
function startGame(level) {
    currentLevel = level;
    player = new Player();
    bullets = [];
    enemies = [];
    particles = [];
    powerups = [];
    coins = 0;
    wave = 1;
    eraIndex = 0;
    enemiesKilled = 0;
    enemiesSpawned = 0;
    lastEnemyTime = Date.now();
    wavesCompleted = 0;
    activeBuffs = [];
    bossActive = false;
    boss = null;

    const levelData = LEVELS[currentLevel - 1];
    enemiesPerWave = 3 + currentLevel * 2;

    gameState = 'playing';
    hideAllScreens();
    updateHUD();
}

function showUpgradeShop() {
    showScreen('upgrade-screen');
    document.getElementById('upgrade-coins').textContent = totalCoins;
    generateUpgradeItems();
}

function showLevelSelect() {
    showScreen('level-screen');
    generateLevelItems();
}

function generateUpgradeItems() {
    const container = document.getElementById('upgrade-items');
    container.innerHTML = '';

    const upgrades = [
        { name: 'Speed Boost', desc: '+1 movement speed', price: 50, stat: 'speed' },
        { name: 'Health Boost', desc: '+25 max health', price: 75, stat: 'health' },
        { name: 'Damage Boost', desc: '+1 bullet damage', price: 100, stat: 'damage' },
        { name: 'Fire Rate Boost', desc: 'Shoot faster', price: 125, stat: 'firerate' },
        { name: 'Multi-Shot', desc: '+1 bullet per shot', price: 200, stat: 'multishot' }
    ];

    upgrades.forEach(upgrade => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>${upgrade.desc}</p>
            <p class="owned">Level: ${shipUpgrades[upgrade.stat]}</p>
            <div class="price">💰 ${upgrade.price}</div>
        `;
        div.onclick = () => {
            if (totalCoins >= upgrade.price) {
                totalCoins -= upgrade.price;
                shipUpgrades[upgrade.stat]++;
                localStorage.setItem('spacetime_coins', totalCoins);
                localStorage.setItem('spacetime_upgrades', JSON.stringify(shipUpgrades));
                document.getElementById('upgrade-coins').textContent = totalCoins;
                document.getElementById('total-coins').textContent = totalCoins;
                generateUpgradeItems();
            }
        };
        container.appendChild(div);
    });
}

function generateLevelItems() {
    const container = document.getElementById('level-items');
    container.innerHTML = '';

    LEVELS.forEach(level => {
        const div = document.createElement('div');
        const unlocked = level.id <= unlockedLevels;

        div.className = 'level-item' + (unlocked ? '' : ' locked');
        div.innerHTML = `
            <h3>${level.name}</h3>
            <p>Waves: ${level.waves}</p>
            ${unlocked ? `<p>Difficulty: ${'★'.repeat(level.id)}</p>` : '<p class="locked-text">🔒 LOCKED</p>'}
        `;

        if (unlocked) {
            div.onclick = () => startGame(level.id);
        }

        container.appendChild(div);
    });
}

function updateMainMenu() {
    document.getElementById('total-coins').textContent = totalCoins;
}

function startPvP() {
    isPvP = true;
    player = new Player(false);
    player2 = new Player(true);
    bullets = [];
    bullets2 = [];
    enemies = [];
    particles = [];
    powerups = [];
    activeBuffs = [];
    bossActive = false;
    boss = null;

    gameState = 'playing';
    hideAllScreens();
}

function nextWave() {
    wave++;
    eraIndex = Math.floor((wave - 1) / 3);
    enemiesKilled = 0;
    enemiesSpawned = 0;
    lastEnemyTime = Date.now();
    const levelData = LEVELS[currentLevel - 1];
    enemiesPerWave = 3 + currentLevel * 2;
    bullets = [];
    particles = [];

    gameState = 'playing';
    hideAllScreens();
    updateHUD();
}

function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-wave').textContent = wavesCompleted;
    document.getElementById('final-coins').textContent = totalCoins;
    showScreen('game-over-screen');

    // Reset submit button state
    const submitBtn = document.getElementById('submit-score-btn');
    const statusDiv = document.getElementById('score-status');
    statusDiv.style.display = 'none';
    submitBtn.textContent = 'SUBMIT SCORE';

    // Update auth UI to enable/disable submit button
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'pause';
        showScreen('pause-screen');
    } else if (gameState === 'pause') {
        gameState = 'playing';
        hideAllScreens();
    }
}

function showScreen(id) {
    hideAllScreens();
    document.getElementById(id).classList.remove('hidden');
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
}

function updateHUD() {
    const level = LEVELS[currentLevel - 1];
    document.getElementById('wave').textContent = `${Math.min(wavesCompleted + 1, level.waves)}/${level.waves}`;
    document.getElementById('era').textContent = LEVELS[currentLevel - 1].name;
    document.getElementById('coins').textContent = coins;

    const healthPercent = (player.health / player.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';

    // Show/hide and update player 2 health bar
    const p2Container = document.getElementById('p2-health-container');
    const pvpControls = document.getElementById('pvp-controls-display');

    if (isPvP && player2) {
        p2Container.style.display = 'flex';
        pvpControls.style.display = 'block';
        const p2HealthPercent = (player2.health / player2.maxHealth) * 100;
        document.getElementById('health-fill-2').style.width = p2HealthPercent + '%';
    } else {
        p2Container.style.display = 'none';
        pvpControls.style.display = 'none';
    }
}

function spawnEnemy() {
    if (bossActive) return; // Don't spawn regular enemies during boss

    const level = LEVELS[currentLevel - 1];
    if (enemiesSpawned < enemiesPerWave) {
        // Always spawn eventually - faster spawn rate
        if (Math.random() < level.spawnRate + wave * 0.01) {
            enemies.push(new Enemy());
            enemiesSpawned++;
            lastEnemyTime = Date.now();
        }
    }
}

function checkCollisions() {
    // PVP mode
    if (isPvP && player2) {
        // Player 1 bullets vs Player 2
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (distance(b.x, b.y, player2.x, player2.y) < (b.size + player2.width/2)) {
                player2.takeDamage(b.damage);
                bullets.splice(i, 1);
                updateHUD();

                if (player2.health <= 0) {
                    pvpGameOver(1);
                    return;
                }
            }
        }

        // Player 2 bullets vs Player 1
        for (let i = bullets2.length - 1; i >= 0; i--) {
            const b = bullets2[i];
            if (distance(b.x, b.y, player.x, player.y) < (b.size + player.width/2)) {
                player.takeDamage(b.damage);
                bullets2.splice(i, 1);
                updateHUD();

                if (player.health <= 0) {
                    pvpGameOver(2);
                    return;
                }
            }
        }

        // Players collide with each other
        if (distance(player.x, player.y, player2.x, player2.y) < (player.width/2 + player2.width/2)) {
            const now = Date.now();
            if (now - lastDamageTime > 500) {
                player.takeDamage(5);
                player2.takeDamage(5);
                lastDamageTime = now;
                updateHUD();
            }
        }

        return;
    }

    // Player bullets vs Enemies & Boss
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (b.isBossBullet) continue; // Skip boss bullets

        // vs regular enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            const e = enemies[j];

            if (b && e && distance(b.x, b.y, e.x, e.y) < (b.size + e.width/2)) {
                e.health -= b.damage;
                bullets.splice(i, 1);

                if (e.health <= 0) {
                    createParticles(e.x, e.y, ERAS[eraIndex % ERAS.length].enemyColor, 15);
                    if (Math.random() < 0.2) {
                        powerups.push(new Powerup(e.x, e.y));
                    }
                    enemies.splice(j, 1);
                    coins += 1 + Math.floor(wave / 2);
                    enemiesKilled++;
                    updateHUD();
                }
                break;
            }
        }

        // vs boss
        if (boss && b && !b.isBossBullet) {
            if (distance(b.x, b.y, boss.x, boss.y) < (b.size + boss.width/2)) {
                boss.takeDamage(b.damage);
                bullets.splice(i, 1);
                updateHUD();
            }
        }
    }

    // Boss bullets vs Player
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        if (!b.isBossBullet) continue;

        if (distance(b.x, b.y, player.x, player.y) < (b.width + player.width/2)) {
            player.takeDamage(b.damage);
            bullets.splice(i, 1);
            updateHUD();
        }
    }

    // Enemies vs Player
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (distance(e.x, e.y, player.x, player.y) < (e.width/2 + player.width/2)) {
            const now = Date.now();
            if (now - lastDamageTime > 500) {
                player.takeDamage(20);
                lastDamageTime = now;
                createParticles(e.x, e.y, '#ff0000', 10);
                enemies.splice(i, 1);
                updateHUD();
            }
        }
    }

    // Boss vs Player (body slam)
    if (boss && distance(boss.x, boss.y, player.x, player.y) < (boss.width/2 + player.width/2)) {
        const now = Date.now();
        if (now - lastDamageTime > 500) { // 500ms cooldown (half a second)
            console.log('Boss hit player! Player health:', player.health);
            player.takeDamage(10);
            lastDamageTime = now;
            updateHUD();
        }
    }

    // Player vs Powerups
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        if (distance(p.x, p.y, player.x, player.y) < (p.width/2 + player.width/2)) {
            p.collect();
            powerups.splice(i, 1);
            updateHUD();
        }
    }
}

function pvpGameOver(winner) {
    const winnerName = winner === 1 ? 'PLAYER 1' : 'PLAYER 2';
    alert(`🎮 ${winnerName} WINS!\n\nGood game!`);

    isPvP = false;
    player2 = null;
    bullets2 = [];
    gameState = 'start';
    showScreen('start-screen');
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}

function updateBuffs() {
    const now = Date.now();
    activeBuffs = activeBuffs.filter(buff => {
        if (now >= buff.endTime) {
            // Buff expired
            return false;
        }
        return true;
    });
}

function checkWaveComplete() {
    if (bossActive) return; // Don't check during boss fight

    // Debug logging
    console.log(`Wave check: enemies=${enemies.length}, spawned=${enemiesSpawned}/${enemiesPerWave}, wavesCompleted=${wavesCompleted}`);

    // Auto-complete if no enemies for 5 seconds and we've spawned some
    if (enemies.length === 0 && enemiesSpawned > 0 && Date.now() - lastEnemyTime > 5000) {
        console.log('Auto-completing wave (timer)');
        enemiesSpawned = enemiesPerWave; // Force complete
    }

    // Also auto-complete if no enemies and we've spawned at least half
    if (enemies.length === 0 && enemiesSpawned >= enemiesPerWave / 2 && enemiesSpawned < enemiesPerWave) {
        console.log('Auto-completing wave (half spawned)');
        enemiesSpawned = enemiesPerWave;
    }

    if (enemiesSpawned >= enemiesPerWave && enemies.length === 0) {
        console.log('Wave complete! Showing shop...');
        wavesCompleted++;
        const level = LEVELS[currentLevel - 1];

        // Clear all enemies just to be safe
        enemies = [];
        enemiesSpawned = enemiesPerWave + 1; // Prevent any more spawning

        if (wavesCompleted >= level.waves) {
            // Time for boss!
            console.log('Spawning boss!');
            spawnBoss();
        } else {
            // Next wave
            console.log('Going to shop');
            gameState = 'shop';
            showShop();
        }
    }
}

function spawnBoss() {
    console.log('=== SPAWNING BOSS ===');
    bossActive = true;
    const level = LEVELS[currentLevel - 1];
    boss = new Boss(currentLevel);
    console.log('Boss created:', boss);
    enemiesKilled = 0;
    enemiesSpawned = 0;
    enemiesPerWave = 1; // Boss is the only target
    console.log('bossActive:', bossActive);
}

function levelComplete() {
    try {
        console.log('=== LEVEL COMPLETE ===');
        // Save progress
        totalCoins += coins;
        localStorage.setItem('spacetime_coins', totalCoins);
        console.log('Saved coins:', totalCoins);

        if (currentLevel >= unlockedLevels && currentLevel < LEVELS.length) {
            unlockedLevels = currentLevel + 1;
            localStorage.setItem('spacetime_levels', unlockedLevels);
            console.log('Unlocked level:', unlockedLevels);
        }

        bossActive = false;
        boss = null;

        // Show level complete screen
        alert(`🎉 LEVEL ${currentLevel} COMPLETE!\n\nCoins earned: ${coins}\nTotal coins: ${totalCoins}\n\nLevel ${unlockedLevels} unlocked!`);

        gameState = 'start';
        showScreen('start-screen');
        updateMainMenu();
        console.log('Level complete finished');
    } catch (error) {
        console.error('Error in levelComplete:', error);
        alert('Error completing level: ' + error.message);
    }
}

function showShop() {
    showScreen('shop-screen');
    document.getElementById('shop-coin-display').textContent = coins;
    generateShopItems();
}

function generateShopItems() {
    const shopContainer = document.getElementById('shop-items');
    shopContainer.innerHTML = '';

    const upgrades = [
        { name: 'Health Boost', desc: '+25 max health', price: 10 + wave * 2, action: () => { player.maxHealth += 25; player.health = Math.min(player.health + 25, player.maxHealth); }},
        { name: 'Speed Boost', desc: '+1 movement speed', price: 15 + wave * 2, action: () => { player.speed += 1; }},
        { name: 'Fire Rate', desc: 'Shoot faster', price: 20 + wave * 3, action: () => { player.fireRate = Math.max(50, player.fireRate - 30); }},
        { name: 'Bullet Damage', desc: '+1 damage', price: 25 + wave * 3, action: () => { player.bulletDamage += 1; }},
        { name: 'Multi-Shot', desc: '+1 bullet per shot', price: 40 + wave * 5, action: () => { player.bulletsPerShot += 1; player.spread += 0.2; }},
        { name: 'Bullet Speed', desc: '+2 bullet speed', price: 15 + wave * 2, action: () => { player.bulletSpeed += 2; }},
        { name: 'Heal', desc: 'Restore 50 health', price: 10 + wave, action: () => { player.health = Math.min(player.health + 50, player.maxHealth); }},
    ];

    // Pick 3 random upgrades
    const shuffled = upgrades.sort(() => Math.random() - 0.5).slice(0, 3);

    shuffled.forEach((upgrade, index) => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        div.innerHTML = `
            <h3>${upgrade.name}</h3>
            <p>${upgrade.desc}</p>
            <div class="price">💰 ${upgrade.price}</div>
        `;
        div.onclick = () => {
            if (coins >= upgrade.price) {
                coins -= upgrade.price;
                upgrade.action();
                updateHUD();
                document.getElementById('shop-coin-display').textContent = coins;
                div.classList.add('purchased');
                div.innerHTML += '<div class="owned">OWNED</div>';
            }
        };
        shopContainer.appendChild(div);
    });
}

// Game Loop
function gameLoop() {
    // Clear canvas
    const era = ERAS[eraIndex % ERAS.length];
    ctx.fillStyle = era.bgColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw stars - pixelated & colorful
    const starColors = ['#ffffff', '#ff00ff', '#00ffff', '#ffff00', '#00ff00'];
    for (let i = 0; i < 80; i++) {
        ctx.fillStyle = starColors[i % starColors.length];
        const x = (i * 17) % CANVAS_WIDTH;
        const y = (i * 23 + Date.now() * 0.02) % CANVAS_HEIGHT;
        const size = (i % 3) + 1; // Varying star sizes
        ctx.fillRect(x, y, size, size);
    }

    if (gameState === 'playing') {
        // Update buffs
        updateBuffs();

        // Spawn enemies
        spawnEnemy();

        // Update
        player.update();
        if (player2) player2.update();

        bullets.forEach(b => {
            if (b.isBossBullet) {
                b.x += b.vx;
                b.y += b.vy;
            } else {
                b.update();
            }
        });

        // Update player 2's bullets
        if (isPvP) {
            bullets2.forEach(b => b.update());
        }

        enemies.forEach(e => e.update());
        particles.forEach(p => p.update());
        powerups.forEach(p => p.update());

        // Update boss
        if (boss && bossActive) {
            boss.update();
        }

        // Remove off-screen bullets
        bullets = bullets.filter(b => {
            if (b.isBossBullet) {
                return b.x > -50 && b.x < CANVAS_WIDTH + 50 && b.y > -50 && b.y < CANVAS_HEIGHT + 50;
            }
            return !b.isOffScreen();
        });

        // Remove off-screen player 2 bullets
        if (isPvP) {
            bullets2 = bullets2.filter(b => !b.isOffScreen());
        }

        // Remove off-screen enemies
        enemies = enemies.filter(e => !e.isOffScreen());

        // Remove off-screen powerups
        powerups = powerups.filter(p => !p.isOffScreen());

        // Remove dead particles
        particles = particles.filter(p => p.life > 0);

        // Check collisions
        checkCollisions();

        // Check wave complete
        checkWaveComplete();
    }

    // Draw everything
    bullets.forEach(b => {
        if (b.isBossBullet) {
            ctx.fillStyle = '#ff00ff';
            ctx.shadowColor = '#ff00ff';
            ctx.shadowBlur = 10;
            ctx.fillRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
        } else {
            b.draw();
        }
    });

    // Draw player 2's bullets
    if (isPvP) {
        bullets2.forEach(b => b.draw());
    }

    enemies.forEach(e => e.draw());
    powerups.forEach(p => p.draw());
    particles.forEach(p => p.draw());

    if (gameState === 'playing' || gameState === 'shop' || gameState === 'pause') {
        player.draw();
        if (player2) player2.draw();
    }

    // Draw boss
    if (boss && bossActive) {
        boss.draw();
    }

    // Draw active buff indicators
    drawBuffs();

    requestAnimationFrame(gameLoop);
}

function drawBuffs() {
    if (activeBuffs.length === 0) return;

    const buffIcons = {
        speed: { symbol: '⚡', color: '#00ff00', name: 'Speed' },
        multishot: { symbol: '✦', color: '#ff00ff', name: 'Multi-Shot' },
        firerate: { symbol: '◉', color: '#ffff00', name: 'Fire Rate' },
        shield: { symbol: '○', color: '#00ffff', name: 'Shield' },
        damage: { symbol: '↑', color: '#ff8800', name: 'Damage' }
    };

    const now = Date.now();
    let x = 10;
    const y = CANVAS_HEIGHT - 40;

    activeBuffs.forEach(buff => {
        const icon = buffIcons[buff.type];
        const timeLeft = Math.max(0, Math.ceil((buff.endTime - now) / 1000));

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y - 20, 70, 30);

        // Icon
        ctx.fillStyle = icon.color;
        ctx.shadowColor = icon.color;
        ctx.shadowBlur = 10;
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(icon.symbol, x + 5, y);

        // Time
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.font = 'bold 12px Arial';
        ctx.fillText(timeLeft + 's', x + 25, y);

        x += 75;
    });
}

// Load broadcast message from admin
async function loadBroadcastMessage() {
    try {
        const message = await getBroadcastMessage();
        if (message) {
            const broadcastDiv = document.getElementById('broadcast-display');
            broadcastDiv.textContent = '📢 ' + message;
            broadcastDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Failed to load broadcast:', error);
    }
}

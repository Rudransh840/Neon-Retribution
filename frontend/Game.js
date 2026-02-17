// Game.js - UPDATED WITH STAGE-BASED PLAYER DRAWING

// Game Configuration
/* ============================= */
/* ===== GLOBAL CONFIG FIX ===== */
/* ============================= */

const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://neon-retribution-backend.onrender.com";
const Config = {
    PLAYER: {
        SIZE: 30,
        SPEED: 7,
        HEALTH: 100,
        BLINK_DURATION: 1000
    },
    WEAPONS: {
        PULSE_PISTOL: {
            NAME: "Pulse Pistol",
            COOLDOWN: 200,
            DAMAGE: 15,
            SPEED: 12,
            COLOR: "#00ffff",
            SPREAD: 0.05
        },
        SHOTGUN: {
            NAME: "Shotgun",
            COOLDOWN: 500,
            DAMAGE: 30,
            SPEED: 10,
            COLOR: "#ff9900",
            SPREAD: 0.5,
            PELLETS: 8
        },
        AK47: {
            NAME: "Assault rifle",
            COOLDOWN: 250,
            BURST_COUNT: 3,
            BURST_DELAY: 50,
            DAMAGE: 20,
            SPEED: 20,
            COLOR: "#ff00ff",
            SPREAD: 0.05,
            PELLETS: 1
        }
    },
    ENEMIES: {
        DRONE: {
            SIZE: 15,
            SPEED: 2,
            HEALTH: 30,
            COLOR: "#ff00ff",
            SCORE: 10
        },
        TANK: {
            SIZE: 25,
            SPEED: 1,
            HEALTH: 100,
            COLOR: "#ff3300",
            SCORE: 30
        },
        BOSS: {
            SIZE: 50,
            SPEED: 0.5,
            HEALTH: 5000,
            COLOR: "#ff0000",
            SCORE: 1000
        }
    },
    ORBS: {
        SIZE: 10,
        HEAL: 20,
        SPAWN_RATE: 600
    },
    GAME: {
        WAVE_SPAWN_RATE: 60,
        DIFFICULTY_INCREASE: 0.1,
        STAGE_DURATION: 6000,
        MAX_ENEMIES: 20
    },
    STAGES: {
        1: { NAME: "Training Ground", ENEMY_MODIFIER: 0.3, SPAWN_RATE: 0.3, DIFFICULTY: 0 },
        2: { NAME: "Combat Zone", ENEMY_MODIFIER: 1.3, SPAWN_RATE: 1.0, DIFFICULTY: 1 },
        3: { NAME: "Advanced Warfare", ENEMY_MODIFIER: 1.6, SPAWN_RATE: 1.2, DIFFICULTY: 2 },
        4: { NAME: "Final Boss", ENEMY_MODIFIER: 2.0, SPAWN_RATE: 0.2, DIFFICULTY: 3 }
    }
};

// Game State
const Game = {
    canvas: null,
    ctx: null,
    player: {
        x: 0,
        y: 0,
        health: Config.PLAYER.HEALTH,
        score: 0,
        lastHit: 0,
        currentWeapon: 'PULSE_PISTOL',
        unlockedWeapons: ['PULSE_PISTOL'],
        lastShot: 0
    },
    mouse: { x: 0, y: 0 },
    bullets: [],
    enemies: [],
    orbs: [],
    keys: {},
    wave: 1,
    frameCount: 0,
    difficulty: 1,
    running: false,
    assets: {
        images: {},
        sounds: {},
        loaded: 0,
        total: 0
    },
    currentStage: 1,
    stageStartTime: 0,
    performanceMetrics: {
        totalShotsFired: 0,
        totalHits: 0,
        totalKills: 0,
        totalDamageTaken: 0
    },
    stageNotification: { show: false, message: "", timer: 0 },
    bossSpawned: false
};

// Initialize Game
function init() {
    Game.canvas = document.getElementById('gameCanvas');
    Game.ctx = Game.canvas.getContext('2d');

    document.getElementById('loading-screen').style.display = 'flex';

    loadAssets().then(() => {
        document.getElementById('loading-screen').style.display = 'none';
        setupGame();
    });

    document.addEventListener('keydown', (e) => {
        Game.keys[e.key.toLowerCase()] = true;

        if (e.key === '1' && Game.player.unlockedWeapons.includes('PULSE_PISTOL')) switchWeapon('PULSE_PISTOL');
        if (e.key === '2' && Game.player.unlockedWeapons.includes('AK47')) switchWeapon('AK47');
        if (e.key === '3' && Game.player.unlockedWeapons.includes('SHOTGUN')) switchWeapon('SHOTGUN');

        if (e.key.toLowerCase() === 'p' || e.key === 'Escape' || e.key === ' ') {
            e.preventDefault();
            togglePause();
        }
    });

    document.addEventListener('keyup', (e) => {
        Game.keys[e.key.toLowerCase()] = false;
    });

    Game.canvas.addEventListener('mousemove', updateMousePosition);
    Game.canvas.addEventListener('click', handleShoot);

    document.getElementById('start-btn').addEventListener('click', startGame);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    requestAnimationFrame(gameLoop);

    document.getElementById("auth-overlay").style.display = "flex";
    document.getElementById("start-screen").style.display = "none";
    
    renderLeaderboard();
}

// Asset Loading
function loadAssets() {
    const images = [
        { name: 'Player', path: 'assets/images/Player.png' },
        { name: 'Enemy', path: 'assets/images/Enemy.png' },
        { name: 'Bullet', path: 'assets/images/Bullet.png' },
        { name: 'Orb', path: 'assets/images/Orb.png' }
    ];

    const sounds = [
        { name: 'Shoot', path: 'assets/sounds/Shoot.mp3' },
        { name: 'Explosion', path: 'assets/sounds/Explosion.mp3' },
        { name: 'Heal', path: 'assets/sounds/Heal.mp3' },
        { name: 'StageComplete', path: 'assets/sounds/StageComplete.mp3' },
        { name: 'WeaponUnlock', path: 'assets/sounds/WeaponUnlock.mp3' }
    ];

    Game.assets.total = images.length + sounds.length;

    const loadPromises = [
        ...images.map(img => loadImage(img)),
        ...sounds.map(snd => loadSound(snd))
    ];

    return Promise.all(loadPromises);
}

function loadImage({name, path}) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            Game.assets.images[name] = img;
            Game.assets.loaded++;
            updateLoadingProgress();
            resolve();
        };
        img.onerror = () => resolve();
    });
}

function loadSound({name, path}) {
    return new Promise(resolve => {
        const sound = new Audio();
        sound.src = path;
        sound.addEventListener('canplaythrough', () => {
            Game.assets.sounds[name] = sound;
            Game.assets.loaded++;
            updateLoadingProgress();
            resolve();
        }, { once: true });
        sound.onerror = () => resolve();
    });
}

function setupGame() {
    Game.player.x = Game.canvas.width / 2;
    Game.player.y = Game.canvas.height / 2;
    updateUI();
}

async function authenticatePlayer() {
    const email = document.getElementById("auth-email").value;
    const city = document.getElementById("auth-city").value;

    if (!email || !city) {
        alert("Please enter email and city");
        return;
    }

    try {
        const res = await fetch(`${BASE_URL}/api/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password: "game_default",
                city
            })
        });

        if (!res.ok) throw new Error("Signup failed");

        const data = await res.json();

        localStorage.setItem("playerId", data.playerId);
        localStorage.setItem("city", data.city);

    } catch (err) {
        console.error("Auth failed → continuing without backend", err);
    }

    document.getElementById("auth-overlay").style.display = "none";
    document.getElementById("start-screen").style.display = "flex";
    renderLeaderboard();
}


function startGame() {
    Game.running = true;
    Game.player = {
        x: Game.canvas.width / 2,
        y: Game.canvas.height / 2,
        health: Config.PLAYER.HEALTH,
        score: 0,
        lastHit: 0,
        currentWeapon: 'PULSE_PISTOL',
        unlockedWeapons: ['PULSE_PISTOL'],
        lastShot: 0
    };
    Game.bullets = [];
    Game.enemies = [];
    Game.orbs = [];
    Game.wave = 1;
    Game.difficulty = 1;
    Game.frameCount = 0;
    Game.currentStage = 1;
    Game.stageStartTime = Date.now();
    Game.performanceMetrics = {
        totalShotsFired: 0,
        totalHits: 0,
        totalKills: 0,
        totalDamageTaken: 0
    };
    Game.bossSpawned = false;

    if (window.difficultyManager && window.difficultyManager.setStage) {
        window.difficultyManager.setStage(1);
    }

    showStageNotification(Config.STAGES[Game.currentStage].NAME.toUpperCase());

    document.getElementById('start-screen').style.display = 'none';
    spawnWave();
    updateUI();
}

function gameLoop(timestamp) {
    if (Game.running) {
        update();
        render();
    }
    requestAnimationFrame(gameLoop);
}

function update() {
    if (Game.stageNotification.show) {
        Game.stageNotification.timer--;
        if (Game.stageNotification.timer <= 0) {
            Game.stageNotification.show = false;
        }
    }

    checkStageCompletion();
    if (window.difficultyManager && window.difficultyManager.calculateDifficulty) {
        updateDifficulty();
    }

    // Player movement - FIXED: Allow full screen movement
    if (Game.keys['w'] || Game.keys['arrowup']) Game.player.y -= Config.PLAYER.SPEED;
    if (Game.keys['s'] || Game.keys['arrowdown']) Game.player.y += Config.PLAYER.SPEED;
    if (Game.keys['a'] || Game.keys['arrowleft']) Game.player.x -= Config.PLAYER.SPEED;
    if (Game.keys['d'] || Game.keys['arrowright']) Game.player.x += Config.PLAYER.SPEED;

    // FIXED: Proper boundary check - allow player to go to the edges of the canvas
    Game.player.x = Math.max(Config.PLAYER.SIZE, Math.min(Game.canvas.width - Config.PLAYER.SIZE, Game.player.x));
    Game.player.y = Math.max(Config.PLAYER.SIZE, Math.min(Game.canvas.height - Config.PLAYER.SIZE, Game.player.y));

    // Update bullets
    for (let i = Game.bullets.length - 1; i >= 0; i--) {
        const bullet = Game.bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        if (bullet.x < 0 || bullet.x > Game.canvas.width ||
            bullet.y < 0 || bullet.y > Game.canvas.height) {
            Game.bullets.splice(i, 1);
            continue;
        }

        // Check enemy collisions
        for (let j = Game.enemies.length - 1; j >= 0; j--) {
            const enemy = Game.enemies[j];
            const enemyType = Config.ENEMIES[enemy.type];
            const dist = Math.sqrt(
                Math.pow(bullet.x - enemy.x, 2) +
                Math.pow(bullet.y - enemy.y, 2)
            );

            if (dist < enemyType.SIZE + 5) {
                enemy.health -= bullet.damage;
                Game.performanceMetrics.totalHits++;

                if (enemy.health <= 0) {
                    Game.player.score += enemyType.SCORE;
                    Game.performanceMetrics.totalKills++;
                    Game.enemies.splice(j, 1);
                    playSound('Explosion');

                    if (enemy.type === 'BOSS') {
                        checkStageCompletion();
                    }
                }

                Game.bullets.splice(i, 1);
                break;
            }
        }
    }

    // Spawn enemies
    Game.frameCount++;
    const stageSpawnRate = Math.floor(Config.GAME.WAVE_SPAWN_RATE / (Game.difficulty.spawnRate || 1));

    if (Game.currentStage <= 3 && Game.frameCount % stageSpawnRate === 0) {
        spawnEnemy();
    } else if (Game.currentStage === 4 && Game.bossSpawned && Game.frameCount % (stageSpawnRate * 3) === 0) {
        spawnEnemy('DRONE');
    }

    // Spawn health orbs
    if (Game.frameCount % Config.ORBS.SPAWN_RATE === 0) {
        spawnHealthOrb();
    }

    // Update enemies
    for (let i = Game.enemies.length - 1; i >= 0; i--) {
        const enemy = Game.enemies[i];

        if (enemy.update) {
            enemy.update(16, Game.player.x, Game.player.y, Game.bullets, Game.difficulty);
        } else {
            const dx = Game.player.x - enemy.x;
            const dy = Game.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const enemyType = Config.ENEMIES[enemy.type];

            const speedModifier = 1 + (Game.currentStage - 1) * 0.20;
            const currentSpeed = enemyType.SPEED * speedModifier;

            if (dist > 0) {
                enemy.x += (dx / dist) * currentSpeed;
                enemy.y += (dy / dist) * currentSpeed;
            }
        }
        
        // Check player collision
        const enemyType = Config.ENEMIES[enemy.type];
        const distToPlayer = Math.sqrt(
            Math.pow(Game.player.x - enemy.x, 2) +
            Math.pow(Game.player.y - enemy.y, 2)
        );

        if (distToPlayer < Config.PLAYER.SIZE + enemyType.SIZE) {
            if (Date.now() - Game.player.lastHit > Config.PLAYER.BLINK_DURATION) {
                const damage = Game.currentStage === 1 ? 5 : 10;
                Game.player.health -= damage;
                Game.performanceMetrics.totalDamageTaken += damage;
                Game.player.lastHit = Date.now();
                updateUI();

                if (Game.player.health <= 0) {
                    gameOver();
                }
            }
        }
    }

    // Update orbs
    for (let i = Game.orbs.length - 1; i >= 0; i--) {
        const orb = Game.orbs[i];
        const dx = Game.player.x - orb.x;
        const dy = Game.player.y - orb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < Config.PLAYER.SIZE + Config.ORBS.SIZE) {
            Game.player.health = Math.min(Config.PLAYER.HEALTH,
                Game.player.health + Config.ORBS.HEAL);
            Game.orbs.splice(i, 1);
            playSound('Heal');
            updateUI();
        }
    }

    updateWeaponCooldown();

    if (Game.currentStage <= 3 && Game.frameCount % 3000 === 0) {
        Game.wave++;
        spawnWave();
        updateUI();
    }
}

function updateDifficulty() {
    if (!window.difficultyManager || !window.difficultyManager.calculateDifficulty) return;
    
    const gameState = {
        timeElapsed: Date.now() - Game.stageStartTime,
        score: Game.player.score,
        totalShotsFired: Game.performanceMetrics.totalShotsFired,
        totalHits: Game.performanceMetrics.totalHits,
        totalKills: Game.performanceMetrics.totalKills,
        totalDamageTaken: Game.performanceMetrics.totalDamageTaken,
        playerMovement: calculatePlayerMovement()
    };

    const difficultySettings = window.difficultyManager.calculateDifficulty(gameState);
    Game.difficulty = difficultySettings;

    if (window.difficultyManager.getDifficultyPercentage) {
        updateDifficultyMeter();
    }
}

function calculatePlayerMovement() {
    const keysPressed = Object.values(Game.keys).filter(Boolean).length;
    return Math.min(2, 1 + (keysPressed * 0.3));
}

function updateDifficultyMeter() {
    if (!window.difficultyManager || !window.difficultyManager.getDifficultyPercentage) return;
    
    const difficultyFill = document.getElementById('difficulty-fill');
    const difficultyText = document.getElementById('difficulty-text');
    const percentage = window.difficultyManager.getDifficultyPercentage();

    if (difficultyFill) {
        difficultyFill.style.width = `${Math.min(100, percentage)}%`;
    }
    if (difficultyText) {
        difficultyText.textContent = `Difficulty: ${percentage}%`;
    }
}

function updateWeaponCooldown() {
    const now = Date.now();
    const weapon = Config.WEAPONS[Game.player.currentWeapon];
    const cooldownProgress = Math.min(1, (now - Game.player.lastShot) / weapon.COOLDOWN);

    const cooldownFill = document.getElementById('weapon-cooldown-fill');
    if (cooldownFill) {
        cooldownFill.style.width = `${cooldownProgress * 100}%`;
    }
}

function checkStageCompletion() {
    if (Game.currentStage <= 3) {
        const elapsed = Date.now() - Game.stageStartTime;
        if (elapsed >= Config.GAME.STAGE_DURATION) {
            completeStage();
        }
    } else if (Game.currentStage === 4) {
        const bossAlive = Game.enemies.some(e => e.type === 'BOSS');
        if (Game.bossSpawned && !bossAlive) {
            completeStage();
        }
    }
}

function completeStage() {
    Game.running = false;
    playSound('StageComplete');

    const stageCompleteScreen = document.getElementById('stage-complete-notification');
    if (!stageCompleteScreen) return;

    stageCompleteScreen.classList.add('show');

    let countdown = 3;
    const countdownElement = stageCompleteScreen.querySelector('.countdown');

    if (Game.currentStage === 4) {
        if (countdownElement) countdownElement.textContent = "VICTORY";
        countdown = 1;
    } else {
        if (countdownElement) countdownElement.textContent = countdown;
    }

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown > 0 ? countdown : '';
        }

        if (countdown <= 0) {
            clearInterval(countdownInterval);
            stageCompleteScreen.classList.remove('show');
            startNextStage();
        }
    }, 1000);
}

function startNextStage() {
    Game.currentStage++;

    if (Game.currentStage > Object.keys(Config.STAGES).length) {
        victory();
        return;
    }

    Game.stageStartTime = Date.now();
    if (window.difficultyManager && window.difficultyManager.setStage) {
        window.difficultyManager.setStage(Game.currentStage);
    }

    Game.wave = 1;
    Game.bossSpawned = false;

    Game.enemies = [];
    Game.orbs = [];

    unlockWeaponsForStage(Game.currentStage);
    showStageNotification(Config.STAGES[Game.currentStage].NAME.toUpperCase());

    Game.running = true;

    if (Game.currentStage === 4) {
        spawnBoss();
    } else {
        spawnWave();
    }
}

function spawnBoss() {
    if (typeof Drone === 'undefined') return;
    
    const enemy = new Drone(Game.canvas.width / 2, 100, 'BOSS', Game.currentStage);
    Game.enemies.push(enemy);
    Game.bossSpawned = true;

    setTimeout(() => {
        spawnEnemy('DRONE');
    }, 10000);
}

function spawnEnemy(typeOverride) {
    if (Game.enemies.length >= Config.GAME.MAX_ENEMIES) {
        return;
    }

    let type = typeOverride || 'DRONE';

    if (!typeOverride) {
        if (Game.currentStage === 4) {
            type = Math.random() < 0.8 ? 'DRONE' : 'TANK';
        } else if (Game.currentStage >= 2 && Math.random() > 0.7) {
            type = 'TANK';
        }

        if (Game.currentStage >= 3 && Math.random() > 0.9) {
            type = Math.random() > 0.5 ? 'TANK' : 'DRONE';
        }
    }

    let x, y;
    if (Math.random() > 0.5) {
        x = Math.random() > 0.5 ? -50 : Game.canvas.width + 50;
        y = Math.random() * Game.canvas.height;
    } else {
        x = Math.random() * Game.canvas.width;
        y = Math.random() > 0.5 ? -50 : Game.canvas.height + 50;
    }

    if (typeof Drone !== 'undefined') {
        const enemy = new Drone(x, y, type, Game.currentStage);
        Game.enemies.push(enemy);
    }
}

function spawnWave() {
    if (Game.enemies.length >= Config.GAME.MAX_ENEMIES) {
        return;
    }

    for (let i = 0; i < 5 * Game.wave; i++) {
        setTimeout(spawnEnemy, i * 500);
    }
}

function spawnHealthOrb() {
    Game.orbs.push({
        x: Math.random() * (Game.canvas.width - Config.ORBS.SIZE * 2) + Config.ORBS.SIZE,
        y: Math.random() * (Game.canvas.height - Config.ORBS.SIZE * 2) + Config.ORBS.SIZE
    });
}

function unlockWeaponsForStage(stage) {
    let newWeapons = [];

    switch(stage) {
        case 2:
            newWeapons = ['AK47'];
            break;
        case 3:
            newWeapons = ['SHOTGUN'];
            break;
    }

    newWeapons.forEach(weapon => {
        if (!Game.player.unlockedWeapons.includes(weapon)) {
            Game.player.unlockedWeapons.push(weapon);
            showWeaponNotification(weapon);
            playSound('WeaponUnlock');
        }
    });
}

function showStageNotification(stageName) {
    const notification = document.getElementById('stage-start-notification');
    const stageTitle = document.getElementById('stage-title');
    const extraInfoElement = notification.querySelector('.extra-info');

    if (!notification || !stageTitle) return;

    stageTitle.textContent = stageName;

    if (Game.currentStage === 1) {
        if (extraInfoElement) {
            extraInfoElement.textContent = 'Easy Mode: Learn the controls!';
            extraInfoElement.style.display = 'block';
        }
    } else if (Game.currentStage === 4) {
        if (extraInfoElement) {
            extraInfoElement.textContent = 'WARNING: FINAL BOSS ENCOUNTER!';
            extraInfoElement.style.display = 'block';
        }
    } else {
        if (extraInfoElement) {
            extraInfoElement.style.display = 'none';
        }
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showWeaponNotification(weapon) {
    const notification = document.getElementById('weapon-unlock-notification');
    if (!notification) return;

    const weaponName = notification.querySelector('.weapon-name');
    const weaponIcon = notification.querySelector('.weapon-icon');
    const weaponDesc = notification.querySelector('.weapon-desc');

    let weaponKey = '';
    if (weapon === 'AK47') {
        weaponKey = '2';
    } else if (weapon === 'SHOTGUN') {
        weaponKey = '3';
    }

    if (weaponDesc && weaponKey) {
        weaponDesc.textContent = `Press [${weaponKey}] to equip`;
    }

    if (weaponName) {
        weaponName.textContent = Config.WEAPONS[weapon].NAME;
    }

    if (weaponIcon) {
        if (weapon === 'SHOTGUN') {
            weaponIcon.textContent = '🔫';
        } else if (weapon === 'AK47') {
            weaponIcon.textContent = '🎯';
        }
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function handleShoot() {
    if (!Game.running) return;

    const now = Date.now();
    const weapon = Config.WEAPONS[Game.player.currentWeapon];

    if (now - Game.player.lastShot < weapon.COOLDOWN) return;

    Game.player.lastShot = now;

    const dx = Game.mouse.x - Game.player.x;
    const dy = Game.mouse.y - Game.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    if (weapon.BURST_COUNT) {
        let shotsFiredInBurst = 0;
        const totalBullets = weapon.BURST_COUNT;

        const fireSingleBurstShot = () => {
            if (shotsFiredInBurst < totalBullets) {
                const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * weapon.SPREAD;

                Game.bullets.push({
                    x: Game.player.x,
                    y: Game.player.y,
                    dx: Math.cos(angle) * weapon.SPEED,
                    dy: Math.sin(angle) * weapon.SPEED,
                    damage: weapon.DAMAGE,
                    type: Game.player.currentWeapon
                });

                playSound('Shoot');
                shotsFiredInBurst++;

                setTimeout(fireSingleBurstShot, weapon.BURST_DELAY);
            }
        };

        fireSingleBurstShot();
        Game.performanceMetrics.totalShotsFired++;

    } else if (weapon.PELLETS && weapon.PELLETS > 1) {
        for (let i = 0; i < weapon.PELLETS; i++) {
            const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * weapon.SPREAD;
            Game.bullets.push({
                x: Game.player.x,
                y: Game.player.y,
                dx: Math.cos(angle) * weapon.SPEED,
                dy: Math.sin(angle) * weapon.SPEED,
                damage: weapon.DAMAGE,
                type: Game.player.currentWeapon
            });
        }
        playSound('Shoot');
        Game.performanceMetrics.totalShotsFired++;
    } else {
        Game.bullets.push({
            x: Game.player.x,
            y: Game.player.y,
            dx: (dx / dist) * weapon.SPEED,
            dy: (dy / dist) * weapon.SPEED,
            damage: weapon.DAMAGE,
            type: Game.player.currentWeapon
        });
        playSound('Shoot');
        Game.performanceMetrics.totalShotsFired++;
    }
}

function render() {
    if (!Game.ctx) return;
    
    Game.ctx.fillStyle = '#0a0a1a';
    Game.ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

    // Draw grid
    Game.ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    Game.ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < Game.canvas.width; x += gridSize) {
        Game.ctx.beginPath();
        Game.ctx.moveTo(x, 0);
        Game.ctx.lineTo(x, Game.canvas.height);
        Game.ctx.stroke();
    }
    for (let y = 0; y < Game.canvas.height; y += gridSize) {
        Game.ctx.beginPath();
        Game.ctx.moveTo(0, y);
        Game.ctx.lineTo(Game.canvas.width, y);
        Game.ctx.stroke();
    }

    // Draw stage info
    const timeLeft = Math.max(0, Config.GAME.STAGE_DURATION - (Date.now() - Game.stageStartTime));
    const minutes = Math.floor(timeLeft / 1000);
    const seconds = Math.floor((timeLeft % 1000) / 1000);

    const stageElement = document.getElementById('stage');
    if (stageElement) {
        stageElement.textContent = `Stage: ${Game.currentStage} - ${Config.STAGES[Game.currentStage].NAME}`;
    }

    const timerElement = document.getElementById('stage-timer');
    if (timerElement) {
        if (Game.currentStage <= 3) {
            timerElement.innerHTML = `<span class="timer-icon">⏱</span><span class="timer-text">Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}</span>`;
        } else {
            timerElement.innerHTML = `<span class="timer-icon">⚡</span><span class="timer-text">BOSS FIGHT!</span>`;
        }
    }

    // Draw orbs
    Game.orbs.forEach(orb => {
        if (Game.assets.images.Orb) {
            Game.ctx.drawImage(
                Game.assets.images.Orb,
                orb.x - Config.ORBS.SIZE,
                orb.y - Config.ORBS.SIZE,
                Config.ORBS.SIZE * 2,
                Config.ORBS.SIZE * 2
            );
        } else {
            Game.ctx.fillStyle = '#00ff00';
            Game.ctx.beginPath();
            Game.ctx.arc(orb.x, orb.y, Config.ORBS.SIZE, 0, Math.PI * 2);
            Game.ctx.fill();
        }
    });

    // Draw enemies
    Game.enemies.forEach(enemy => {
        if (enemy.draw) {
            enemy.draw(Game.ctx);
        } else {
            const enemyType = Config.ENEMIES[enemy.type];
            Game.ctx.fillStyle = enemyType.COLOR;
            Game.ctx.beginPath();
            Game.ctx.arc(enemy.x, enemy.y, enemyType.SIZE, 0, Math.PI * 2);
            Game.ctx.fill();

            Game.ctx.fillStyle = '#ff0000';
            Game.ctx.fillRect(
                enemy.x - enemyType.SIZE,
                enemy.y - enemyType.SIZE - 8,
                (enemyType.SIZE * 2) * (enemy.health / Config.ENEMIES[enemy.type].HEALTH),
                3
            );
        }
    });

    // Draw bullets
    Game.bullets.forEach(bullet => {
        const weapon = Config.WEAPONS[bullet.type];
        Game.ctx.fillStyle = weapon.COLOR;
        Game.ctx.beginPath();
        Game.ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
        Game.ctx.fill();
    });

    // --- DRAW PLAYER AS FUTURISTIC DISC (STAGE-BASED) ---
    Game.ctx.save();
    
    // Apply blink effect if hit
    if (Date.now() - Game.player.lastHit < Config.PLAYER.BLINK_DURATION) {
        Game.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
    }

    const P = Config.PLAYER.SIZE;
    const x = Game.player.x;
    const y = Game.player.y;
    let neonBlue = '#00ffff';
    let neonGlow = 'rgba(0, 255, 255, 0.8)';
    const timeFactor = Date.now() / 1000;
    
    // Calculate rotation towards the mouse
    const dx = Game.mouse.x - x;
    const dy = Game.mouse.y - y;
    const angle = Math.atan2(dy, dx); 
    
    Game.ctx.translate(x, y);
    // STAGE 4 uses a slower rotation to signify stability/max power
    Game.ctx.rotate(angle + (Game.currentStage === 4 ? timeFactor * 0.2 : timeFactor * 0.5)); 
    
    // Outer Glow Effect
    Game.ctx.shadowBlur = Game.currentStage * 5 + 10;
    Game.ctx.shadowColor = neonGlow;
    
    Game.ctx.strokeStyle = neonBlue;
    Game.ctx.lineWidth = 3;

    // --- CORE DRAWING (Always present) ---
    const innerRadius = P * 0.5;
    const coreSize = P * 0.3;

    // Draw Central Core (Solid glowing circle)
    Game.ctx.fillStyle = neonBlue;
    Game.ctx.shadowBlur = 20;
    Game.ctx.beginPath();
    Game.ctx.arc(0, 0, coreSize, 0, Math.PI * 2);
    Game.ctx.fill();
    
    // Reset shadow for cleaner outline
    Game.ctx.shadowBlur = Game.currentStage * 5 + 10; 

    // --- STAGE-SPECIFIC BODY DRAWING ---
    
    if (Game.currentStage === 1) {
        // Stage 1 Design (Basic Segments)
        const segmentCount = 6;
        const outerRadius = P * 0.9;
        const gapAngle = 0.1;

        for (let i = 0; i < segmentCount; i++) {
            const start = i * (Math.PI * 2 / segmentCount) + gapAngle;
            const end = (i + 1) * (Math.PI * 2 / segmentCount) - gapAngle;
            
            Game.ctx.beginPath();
            Game.ctx.arc(0, 0, outerRadius, start, end);
            Game.ctx.stroke();
        }
        
        Game.ctx.beginPath();
        Game.ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        Game.ctx.stroke();

        Game.ctx.lineWidth = 2;
        Game.ctx.shadowBlur = 10;
        for (let i = 0; i < 4; i++) {
            const detailAngle = i * (Math.PI / 2) + Math.PI / 4;
            Game.ctx.beginPath();
            Game.ctx.moveTo(
                Math.cos(detailAngle) * innerRadius,
                Math.sin(detailAngle) * innerRadius
            );
            Game.ctx.lineTo(
                Math.cos(detailAngle) * outerRadius,
                Math.sin(detailAngle) * outerRadius
            );
            Game.ctx.stroke();
        }

    } else if (Game.currentStage === 2) {
        // Stage 2 Design (Original - Spiked Design)
        const outerRadius = P * 1.0;
        const spikeCount = 8;
        Game.ctx.lineWidth = 2.5;

        // Draw multiple rings for complexity
        for (let r = 0; r < 3; r++) {
            const ringRadius = coreSize + (r + 1) * 8;
            Game.ctx.beginPath();
            Game.ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
            Game.ctx.stroke();
        }

        // Draw spikes around the perimeter
        for (let i = 0; i < spikeCount; i++) {
            const spikeAngle = i * (Math.PI * 2 / spikeCount);
            const innerSpikeRadius = P * 0.6;
            const outerSpikeRadius = P * 1.2;

            Game.ctx.beginPath();
            Game.ctx.moveTo(
                Math.cos(spikeAngle - 0.15) * innerSpikeRadius,
                Math.sin(spikeAngle - 0.15) * innerSpikeRadius
            );
            Game.ctx.lineTo(
                Math.cos(spikeAngle) * outerSpikeRadius,
                Math.sin(spikeAngle) * outerSpikeRadius
            );
            Game.ctx.lineTo(
                Math.cos(spikeAngle + 0.15) * innerSpikeRadius,
                Math.sin(spikeAngle + 0.15) * innerSpikeRadius
            );
            Game.ctx.closePath();
            Game.ctx.stroke();
        }

        // Add connecting lines between rings
        for (let i = 0; i < 4; i++) {
            const connectAngle = i * (Math.PI / 2);
            Game.ctx.beginPath();
            Game.ctx.moveTo(
                Math.cos(connectAngle) * (coreSize + 8),
                Math.sin(connectAngle) * (coreSize + 8)
            );
            Game.ctx.lineTo(
                Math.cos(connectAngle) * (P * 0.8),
                Math.sin(connectAngle) * (P * 0.8)
            );
            Game.ctx.stroke();
        }

    } else if (Game.currentStage === 3) {
        // Stage 3 Design (Complex Outer Maze Ring)
        
        const outerRingRadius = P * 1.2;
        const mazeSegments = 12;

        Game.ctx.lineWidth = 3;
        
        // Draw the complete outer ring first
        Game.ctx.beginPath();
        Game.ctx.arc(0, 0, outerRingRadius, 0, Math.PI * 2);
        Game.ctx.stroke();

        // Draw inner circle
        Game.ctx.beginPath();
        Game.ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
        Game.ctx.stroke();

        // Maze paths
        for (let i = 0; i < mazeSegments; i++) {
            const angle = i * (Math.PI * 2 / mazeSegments);
            const midRadius = innerRadius + (outerRingRadius - innerRadius) / 2;

            // Radial line
            Game.ctx.beginPath();
            Game.ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
            Game.ctx.lineTo(Math.cos(angle) * midRadius, Math.sin(angle) * midRadius);
            Game.ctx.stroke();

            // Tangential block
            if (i % 3 === 1) {
                 Game.ctx.beginPath();
                 Game.ctx.moveTo(
                     Math.cos(angle) * midRadius,
                     Math.sin(angle) * midRadius
                 );
                 Game.ctx.lineTo(
                     Math.cos(angle + Math.PI / mazeSegments) * midRadius,
                     Math.sin(angle + Math.PI / mazeSegments) * midRadius
                 );
                 Game.ctx.stroke();
            }
        }

    } else if (Game.currentStage === 4) {
        // Stage 4 Design (Max Power: Spikes + Maze)
        
        neonBlue = '#ff00ff';
        neonGlow = 'rgba(255, 0, 255, 0.8)'; 
        Game.ctx.strokeStyle = neonBlue;
        Game.ctx.shadowColor = neonGlow;
        
        // Outer Spikes
        const spikeCount = 6;
        const spikeLength = P * 1.5;
        Game.ctx.lineWidth = 4;

        for (let i = 0; i < spikeCount; i++) {
            const angle = i * (Math.PI * 2 / spikeCount);
            const spokeInner = P * 0.8;

            Game.ctx.beginPath();
            Game.ctx.moveTo(
                Math.cos(angle + 0.1) * spokeInner,
                Math.sin(angle + 0.1) * spokeInner
            );
            Game.ctx.lineTo(
                Math.cos(angle) * spikeLength,
                Math.sin(angle) * spikeLength
            );
             Game.ctx.lineTo(
                Math.cos(angle - 0.1) * spokeInner,
                Math.sin(angle - 0.1) * spokeInner
            );
            Game.ctx.closePath();
            Game.ctx.stroke();
        }
        
        // Inner Maze Ring
        const outerMazeRadius = P * 0.9;
        const innerMazeRadius = P * 0.5;
        const mazeSegments = 8;
        Game.ctx.lineWidth = 3;

        for (let i = 0; i < mazeSegments; i++) {
            const startAngle = i * (Math.PI * 2 / mazeSegments);
            const endAngle = (i + 1) * (Math.PI * 2 / mazeSegments);

            Game.ctx.beginPath();
            Game.ctx.arc(0, 0, outerMazeRadius, startAngle, endAngle);
            Game.ctx.stroke();

            Game.ctx.beginPath();
            Game.ctx.arc(0, 0, innerMazeRadius, startAngle, endAngle);
            Game.ctx.stroke();
            
            if (i % 2 === 0) {
                 Game.ctx.beginPath();
                 Game.ctx.moveTo(
                     Math.cos(startAngle + 0.1) * outerMazeRadius,
                     Math.sin(startAngle + 0.1) * outerMazeRadius
                 );
                 Game.ctx.lineTo(
                     Math.cos(startAngle + 0.1) * innerMazeRadius,
                     Math.sin(startAngle + 0.1) * innerMazeRadius
                 );
                 Game.ctx.stroke();
            }
        }
    }

    Game.ctx.shadowBlur = 0;
    Game.ctx.shadowColor = 'transparent';
    Game.ctx.globalAlpha = 1;
    Game.ctx.restore();

    // Draw health bar
    Game.ctx.fillStyle = '#ff0000';
    Game.ctx.fillRect(
        20,
        Game.canvas.height - 30,
        200 * (Game.player.health / Config.PLAYER.HEALTH),
        20
    );
    Game.ctx.strokeStyle = '#ffffff';
    Game.ctx.strokeRect(20, Game.canvas.height - 30, 200, 20);
}

function togglePause() {
    if (Game.player.health <= 0) return; 

    Game.running = !Game.running; 
    
    const pauseScreen = document.getElementById('pause-screen');
    if (pauseScreen) {
        if (Game.running) {
            pauseScreen.classList.remove('show');
        } else {
            pauseScreen.classList.add('show');
        }
    }
}

function switchWeapon(weapon) {
    if (Game.player.unlockedWeapons.includes(weapon)) {
        Game.player.currentWeapon = weapon;
        const weaponElement = document.getElementById('weapon');
        if (weaponElement) {
            weaponElement.innerHTML = `<span class="weapon-icon">🎯</span><span class="weapon-text">${Config.WEAPONS[weapon].NAME}</span>`;
        }
        updateWeaponCooldown();
    }
}

function updateMousePosition(e) {
    const rect = Game.canvas.getBoundingClientRect();
    Game.mouse.x = e.clientX - rect.left;
    Game.mouse.y = e.clientY - rect.top;
}

function playSound(name) {
    if (Game.assets.sounds[name]) {
        const sound = Game.assets.sounds[name].cloneNode();
        sound.volume = 0.7;
        sound.play().catch(e => console.log('Audio play failed:', e));
    }
}

function updateUI() {
    const scoreElement = document.getElementById('score');
    const healthElement = document.getElementById('health');
    const waveElement = document.getElementById('wave');
    const weaponElement = document.getElementById('weapon');

    if (scoreElement) scoreElement.textContent = Game.player.score;
    if (healthElement) healthElement.textContent = `${Math.round(Game.player.health)}%`;
    if (waveElement) waveElement.textContent = Game.wave;
    if (weaponElement) {
        weaponElement.innerHTML = `<span class="weapon-icon">🎯</span><span class="weapon-text">${Config.WEAPONS[Game.player.currentWeapon].NAME}</span>`;
    }
}

function gameOver() {
    Game.running = false;

    const playerId = localStorage.getItem("playerId");
    const city = localStorage.getItem("city");

    // Save game result to backend (production safe)
    if (playerId && city) {
        fetch(`${BASE_URL}/api/game/finish`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                playerId,
                city,
                score: Game.player.score,
                stage: Game.currentStage,
                accuracy:
                    Game.performanceMetrics.totalHits /
                    (Game.performanceMetrics.totalShotsFired || 1) * 100
            })
        })
        .then(res => {
            if (!res.ok) throw new Error("Failed to save score");
        })
        .catch(err => console.error("Failed to save game:", err));
    }

    const gameOverScreen = document.getElementById('game-over-screen');
    const finalStage = document.getElementById('final-stage');
    const finalScore = document.getElementById('final-score');
    const totalKills = document.getElementById('total-kills');

    if (finalStage) finalStage.textContent = Game.currentStage;
    if (finalScore) finalScore.textContent = Game.player.score;
    if (totalKills) totalKills.textContent = Game.performanceMetrics.totalKills;

    if (gameOverScreen) {
        gameOverScreen.classList.add('show');
    }

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            gameOverScreen.classList.remove('show');
            startGame();
        }, { once: true });
    }
}

function victory() {
    Game.running = false;
    const victoryScreen = document.getElementById('victory-screen');
    const victoryScore = document.getElementById('victory-score');

    if (victoryScore) {
        victoryScore.textContent = Game.player.score;
    }

    if (victoryScreen) {
        victoryScreen.classList.add('show');
    }

    const restartBtn = document.getElementById('victory-restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            victoryScreen.classList.remove('show');
            startGame();
        }, { once: true });
    }
}

function updateLoadingProgress() {
    const percent = Math.floor((Game.assets.loaded / Game.assets.total) * 100);
    const loadingPercent = document.getElementById('loading-percent');
    const loadingBar = document.getElementById('loading-bar');

    if (loadingPercent) loadingPercent.textContent = percent;
    if (loadingBar) loadingBar.style.width = `${percent}%`;
}

function resizeCanvas() {
    Game.canvas.width = window.innerWidth;
    Game.canvas.height = window.innerHeight;

    if (!Game.running) {
        Game.player.x = Game.canvas.width / 2;
        Game.player.y = Game.canvas.height / 2;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const authBtn = document.getElementById("auth-btn");
    if (authBtn) {
        authBtn.addEventListener("click", authenticatePlayer);
    }
});

window.addEventListener('load', init);

/* =============================== */
/* ===== LEADERBOARD SYSTEM ====== */
/* =============================== */

// Generate realistic fake data
function generateFakeLeaderboard(count = 8) {
    const prefixes = ["Shadow", "Neon", "Cyber", "Nova", "Ghost", "Quantum", "Iron", "Phantom"];
    const suffixes = ["X", "Hunter", "Strike", "Byte", "Ace", "Wolf", "Rogue", "Storm"];

    const players = [];

    for (let i = 0; i < count; i++) {
        const name =
            prefixes[Math.floor(Math.random() * prefixes.length)] +
            suffixes[Math.floor(Math.random() * suffixes.length)] +
            Math.floor(Math.random() * 99);

        players.push({
            name,
            score: Math.floor(Math.random() * 15000) + 3000,
            stage: Math.floor(Math.random() * 4) + 1
        });
    }

    players.sort((a, b) => b.score - a.score);
    return players;
}

// Updated leaderboard render
async function renderLeaderboard() {
    const list = document.getElementById("leaderboard-list");
    if (!list) return;

    list.innerHTML = "";

    let leaderboardData = [];
    const city = localStorage.getItem("city");

    if (city) {
        try {
            const res = await fetch(`${BASE_URL}/api/leaderboard/${city}`);

            if (res.ok) {
                const data = await res.json();

                if (Array.isArray(data) && data.length > 0) {
                    leaderboardData = data.map(player => ({
                        name: player.email
                            ? player.email.split("@")[0]
                            : "Player",
                        score: player.bestScore || 0,
                        stage: player.maxStage || 1
                    }));
                }
            }

        } catch (err) {
            console.log("Backend unavailable → using fake leaderboard");
        }
    }

    // Fallback to fake data if backend empty
    if (leaderboardData.length === 0) {
        leaderboardData = generateFakeLeaderboard();
    }

    leaderboardData.sort((a, b) => b.score - a.score);

    leaderboardData.forEach((player, index) => {
        const li = document.createElement("li");

        let medal = "";
        if (index === 0) medal = "🥇 ";
        else if (index === 1) medal = "🥈 ";
        else if (index === 2) medal = "🥉 ";

        li.innerHTML = `
            <span>${medal}${player.name}</span>
            <span>${player.score} | S${player.stage}</span>
        `;

        list.appendChild(li);
    });
}

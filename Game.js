// Game Configuration
const Config = {
    PLAYER: {
        SIZE: 20,
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
            NAME: "AK-47",
            COOLDOWN: 250,
            BURST_COUNT: 3, // NEW: Number of bullets per burst
            BURST_DELAY: 50, // NEW: Delay between burst shots (ms)
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
        // Boss definition for Stage 4
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
        STAGE_DURATION: 6000, // 1 minutes in milliseconds
        // NEW: Maximum number of enemies allowed on screen
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
        if (e.key === '3' && Game.player.unlockedWeapons.includes('SHOTGUN')) switchWeapon('SHOTGUN');
        if (e.key === '2' && Game.player.unlockedWeapons.includes('AK47')) switchWeapon('AK47');
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
}

// Asset Loading (no change needed here)
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

// Game Functions
function setupGame() {
    Game.player.x = Game.canvas.width / 2;
    Game.player.y = Game.canvas.height / 2;
    updateUI();
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

    window.difficultyManager.setStage(1);

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
    updateDifficulty();

    // Player movement
    if (Game.keys['w'] || Game.keys['arrowup']) Game.player.y -= Config.PLAYER.SPEED;
    if (Game.keys['s'] || Game.keys['arrowdown']) Game.player.y += Config.PLAYER.SPEED;
    if (Game.keys['a'] || Game.keys['arrowleft']) Game.player.x -= Config.PLAYER.SPEED;
    if (Game.keys['d'] || Game.keys['arrowright']) Game.player.x += Config.PLAYER.SPEED;

    // Boundary check
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

                    // Check for immediate stage completion if it was the boss
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
    const stageSpawnRate = Math.floor(Config.GAME.WAVE_SPAWN_RATE / Game.difficulty.spawnRate);

    // Only spawn regular enemies during survival stages (Stage 1-3)
    if (Game.currentStage <= 3 && Game.frameCount % stageSpawnRate === 0) {
        spawnEnemy();
    }
    // Spawn supporting drones during boss fight (Stage 4) slowly
    else if (Game.currentStage === 4 && Game.bossSpawned && Game.frameCount % (stageSpawnRate * 3) === 0) {
        spawnEnemy('DRONE');
    }

    // Spawn health orbs
    if (Game.frameCount % Config.ORBS.SPAWN_RATE === 0) {
        spawnHealthOrb();
    }

    // Update enemies
    for (let i = Game.enemies.length - 1; i >= 0; i--) {
        const enemy = Game.enemies[i];

        // Pass the entire difficulty object
        if (enemy.update) {
            enemy.update(16, Game.player.x, Game.player.y, Game.bullets, Game.difficulty);
        } else {
            // Fallback movement logic
            const dx = Game.player.x - enemy.x;
            const dy = Game.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const enemyType = Config.ENEMIES[enemy.type];

            // =============================================
            // ===== THIS IS THE MODIFIED SECTION ==========
            // =============================================
            // Calculate a speed modifier that INCREASES with each stage.
            // Stage 1: 100% speed, Stage 2: 120%, Stage 3: 140%, Stage 4: 160%
            const speedModifier = 1 + (Game.currentStage - 1) * 0.20;
            const currentSpeed = enemyType.SPEED * speedModifier;
            // =============================================

            if (dist > 0) {
                // Apply the stage-adjusted speed
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

    // Update weapon cooldown display
    updateWeaponCooldown();

    // Increase wave count on a timer (only for survival stages)
    if (Game.currentStage <= 3 && Game.frameCount % 3000 === 0) {
        Game.wave++;
        spawnWave();
        updateUI();
    }
}

function updateDifficulty() {
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

    updateDifficultyMeter();
}

function calculatePlayerMovement() {
    const keysPressed = Object.values(Game.keys).filter(Boolean).length;
    return Math.min(2, 1 + (keysPressed * 0.3));
}

function updateDifficultyMeter() {
    const difficultyFill = document.getElementById('difficulty-fill');
    const difficultyText = document.getElementById('difficulty-text');
    const percentage = window.difficultyManager.getDifficultyPercentage();

    difficultyFill.style.width = `${Math.min(100, percentage)}%`;
    difficultyText.textContent = `Difficulty: ${percentage}%`;
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
    // Stage 1-3 completion is based on time (3 minutes)
    if (Game.currentStage <= 3) {
        const elapsed = Date.now() - Game.stageStartTime;
        if (elapsed >= Config.GAME.STAGE_DURATION) {
            completeStage();
        }
    }
    // Stage 4 completion is based on boss kill
    else if (Game.currentStage === 4) {
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
    const reward = window.difficultyManager.getStageRewards(Game.currentStage);

    stageCompleteScreen.querySelector('.stage-reward').textContent = reward.message;
    stageCompleteScreen.classList.add('show');

    let countdown = 3;
    const countdownElement = stageCompleteScreen.querySelector('.countdown');

    // Handle Stage 4 victory notification differently
    if (Game.currentStage === 4) {
        countdownElement.textContent = "VICTORY";
        countdown = 1;
    } else {
        countdownElement.textContent = countdown;
    }

    const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown > 0 ? countdown : '';

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
    window.difficultyManager.setStage(Game.currentStage);

    Game.wave = 1;
    Game.bossSpawned = false;

    Game.enemies = [];
    Game.orbs = [];

    unlockWeaponsForStage(Game.currentStage);
    showStageNotification(Config.STAGES[Game.currentStage].NAME.toUpperCase());

    Game.running = true;

    // Spawn Boss immediately for Stage 4
    if (Game.currentStage === 4) {
        spawnBoss();
    } else {
        spawnWave();
    }
}

function spawnBoss() {
    // Boss ignores the MAX_ENEMIES limit as it's a unique entity
    // Spawns the boss enemy at the top center
    const enemy = new Drone(Game.canvas.width / 2, 100, 'BOSS', Game.currentStage);
    Game.enemies.push(enemy);
    Game.bossSpawned = true;

    // Spawn supportive drones after a delay
    setTimeout(() => {
        spawnEnemy('DRONE');
    }, 10000);
}

function spawnEnemy(typeOverride) {
    // 👇 MODIFICATION: Check for enemy limit before spawning
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

    const enemy = new Drone(x, y, type, Game.currentStage);
    Game.enemies.push(enemy);
}

function spawnWave() {
    // 👇 MODIFICATION: Only start the wave if the current enemy count is low enough
    if (Game.enemies.length >= Config.GAME.MAX_ENEMIES) {
        return;
    }

    for (let i = 0; i < 5 * Game.wave; i++) {
        // The individual spawnEnemy call also checks the limit, ensuring no overshoot
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
    let message = "";

    switch(stage) {
        case 2:
            newWeapons = ['AK47'];
            message = "AK47 Rifle Unlocked!";
            break;
        case 3:
            newWeapons = ['SHOTGUN'];
            message = "Shotgun Unlocked!";
            break;
        case 4:
            newWeapons = [];
            message = "All Weapons Mastered!";
            break;
    }

    newWeapons.forEach(weapon => {
        if (!Game.player.unlockedWeapons.includes(weapon)) {
            Game.player.unlockedWeapons.push(weapon);
            showWeaponNotification(message, weapon);
            playSound('WeaponUnlock');
        }
    });
}

function showStageNotification(stageName) {
    const notification = document.getElementById('stage-start-notification');
    const stageTitle = document.getElementById('stage-title');
    const extraInfoElement = notification.querySelector('.extra-info');

    stageTitle.textContent = stageName;

    // Set extra message based on stage
    if (Game.currentStage === 1) {
        extraInfoElement.textContent = 'Easy Mode: Learn the controls!';
        extraInfoElement.style.display = 'block';
    } else if (Game.currentStage === 4) {
        extraInfoElement.textContent = 'WARNING: FINAL BOSS ENCOUNTER!';
        extraInfoElement.style.display = 'block';
    } else {
        extraInfoElement.style.display = 'none';
    }

    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function showWeaponNotification(message, weapon) {
    const notification = document.getElementById('weapon-unlock-notification');
    const weaponName = notification.querySelector('.weapon-name');
    const weaponIcon = notification.querySelector('.weapon-icon');
    const weaponDesc = notification.querySelector('.weapon-desc');

    let weaponKey = '';
    // Determine the correct key based on the weapon name
    if (weapon === 'AK47') {
        weaponKey = '2';
    } else if (weapon === 'SHOTGUN') {
        weaponKey = '3';
    }

    // Dynamically set the text content
    if (weaponKey) {
        weaponDesc.textContent = `Press [${weaponKey}] to equip`;
    }

    weaponName.textContent = Config.WEAPONS[weapon].NAME;
    weaponName.setAttribute('data-weapon', weapon);

    if (weapon === 'SHOTGUN') {
        weaponIcon.textContent = '🔫';
    } else if (weapon === 'AK47') {
        weaponIcon.textContent = '🎯';
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

    // 1. Cooldown check: Prevents firing a new burst/shot before the weapon is ready
    if (now - Game.player.lastShot < weapon.COOLDOWN) return;

    // Set the cooldown timer immediately upon starting the fire sequence
    Game.player.lastShot = now;

    const dx = Game.mouse.x - Game.player.x;
    const dy = Game.mouse.y - Game.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) return;

    // 2. AK-47 Burst Fire Logic (Checked by BURST_COUNT property)
    if (weapon.BURST_COUNT) {
        let shotsFiredInBurst = 0;
        const totalBullets = weapon.BURST_COUNT;

        const fireSingleBurstShot = () => {
            if (shotsFiredInBurst < totalBullets) {
                // Fire one bullet with slight spread
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

                // Continue the burst sequence with a delay
                setTimeout(fireSingleBurstShot, weapon.BURST_DELAY);
            }
        };

        // Start the burst sequence
        fireSingleBurstShot();

        // Count the entire burst sequence as one trigger for performance tracking
        Game.performanceMetrics.totalShotsFired++;

    }
    // 3. Shotgun/Spread Fire Logic (Checked by PELLETS property > 1)
    else if (weapon.PELLETS && weapon.PELLETS > 1) {
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
    }
    // 4. Pulse Pistol/Single Shot Logic (Default case)
    else {
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
    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);

    document.getElementById('stage').textContent = `Stage: ${Game.currentStage} - ${Config.STAGES[Game.currentStage].NAME}`;
    // Display Time Left only for survival stages (1-3)
    if (Game.currentStage <= 3) {
        document.getElementById('stage-timer').textContent = `Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        document.getElementById('stage-timer').textContent = `BOSS FIGHT!`;
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

            // Basic health bar 
            Game.ctx.fillStyle = '#ff0000';
            ctx.fillRect(
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

    // Draw player
    if (Game.assets.images.Player) {
        Game.ctx.save();
        if (Date.now() - Game.player.lastHit < Config.PLAYER.BLINK_DURATION) {
            Game.ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        }
        Game.ctx.drawImage(
            Game.assets.images.Player,
            Game.player.x - Config.PLAYER.SIZE,
            Game.player.y - Config.PLAYER.SIZE,
            Config.PLAYER.SIZE * 2,
            Config.PLAYER.SIZE * 2
        );
        Game.ctx.restore();
    } else {
        Game.ctx.fillStyle = '#00ffff';
        Game.ctx.beginPath();
        Game.ctx.arc(Game.player.x, Game.player.y, Config.PLAYER.SIZE, 0, Math.PI * 2);
        Game.ctx.fill();
    }

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

// Function already exists, consolidating to match user's context better
function spawnEnemy(typeOverride) {
    // 👇 MAX ENEMIES CHECK APPLIED HERE
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

    const enemy = new Drone(x, y, type, Game.currentStage);
    Game.enemies.push(enemy);
}

function spawnWave() {
    // 👇 MAX ENEMIES CHECK APPLIED HERE
    if (Game.enemies.length >= Config.GAME.MAX_ENEMIES) {
        return;
    }

    for (let i = 0; i < 5 * Game.wave; i++) {
        // The individual spawnEnemy call also checks the limit, which is essential
        setTimeout(spawnEnemy, i * 500);
    }
}

function spawnHealthOrb() {
    Game.orbs.push({
        x: Math.random() * (Game.canvas.width - Config.ORBS.SIZE * 2) + Config.ORBS.SIZE,
        y: Math.random() * (Game.canvas.height - Config.ORBS.SIZE * 2) + Config.ORBS.SIZE
    });
}

function switchWeapon(weapon) {
    if (Game.player.unlockedWeapons.includes(weapon)) {
        Game.player.currentWeapon = weapon;
        document.getElementById('weapon').textContent = `Weapon: ${Config.WEAPONS[weapon].NAME}`;
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
    document.getElementById('score').textContent = `Score: ${Game.player.score}`;
    document.getElementById('health').textContent = `Health: ${Math.round(Game.player.health)}%`;
    document.getElementById('wave').textContent = `Wave: ${Game.wave}`;
    document.getElementById('weapon').textContent = `Weapon: ${Config.WEAPONS[Game.player.currentWeapon].NAME}`;
}

function gameOver() {
    Game.running = false;
    const gameOverScreen = document.getElementById('game-over-screen');
    const finalStage = document.getElementById('final-stage');
    const finalScore = document.getElementById('final-score');
    const totalKills = document.getElementById('total-kills');

    finalStage.textContent = Game.currentStage;
    finalScore.textContent = Game.player.score;
    totalKills.textContent = Game.performanceMetrics.totalKills;
    gameOverScreen.classList.add('show');

    document.getElementById('restart-btn').addEventListener('click', () => {
        gameOverScreen.classList.remove('show');
        startGame();
    }, { once: true });
}

function victory() {
    Game.running = false;
    const victoryScreen = document.getElementById('victory-screen');
    const victoryScore = document.getElementById('victory-score');

    victoryScore.textContent = Game.player.score;
    victoryScreen.classList.add('show');

    document.getElementById('victory-restart-btn').addEventListener('click', () => {
        victoryScreen.classList.remove('show');
        startGame();
    }, { once: true });
}

function updateLoadingProgress() {
    const percent = Math.floor((Game.assets.loaded / Game.assets.total) * 100);
    document.getElementById('loading-percent').textContent = percent;
    document.getElementById('loading-bar').style.width = `${percent}%`;
}

function resizeCanvas() {
    Game.canvas.width = window.innerWidth;
    Game.canvas.height = window.innerHeight;

    if (!Game.running) {
        Game.player.x = Game.canvas.width / 2;
        Game.player.y = Game.canvas.height / 2;
    }
}

window.addEventListener('load', init);
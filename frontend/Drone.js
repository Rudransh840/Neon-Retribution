class Drone {
    constructor(x, y, type = 'DRONE', stage = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.stage = stage;

        const enemyType = Config.ENEMIES[type];

        // Health scaling
        this.maxHealth = this.type === 'BOSS'
            ? enemyType.HEALTH
            : enemyType.HEALTH * (1 + stage * 0.4);

        this.health = this.maxHealth;

        this.size = enemyType.SIZE;
        this.color = enemyType.COLOR;

        // ✅ NEW SPEED SYSTEM
        this.baseSpeed = this.getBaseSpeed(enemyType.SPEED);
        this.currentMove = { x: 0, y: 0 };

        this.attackCooldown = 0;
        this.lastHitTime = 0;
    }

    // 🔥 CONTROLLED SPEED PER STAGE
    getBaseSpeed(defaultSpeed) {

        if (this.type === 'BOSS') {
            return 0.6; // Boss always slow heavy movement
        }

        switch (this.stage) {
            case 1: return 0.8;
            case 2: return 1.2;
            case 3: return 1.6;
            case 4: return 2.2;
            default: return defaultSpeed;
        }
    }

    update(deltaTime, playerX, playerY, bullets, difficulty) {

        if (!window.difficultyManager || !window.difficultyManager.getEnemyMovement) return;

        const move = window.difficultyManager.getEnemyMovement(
            this,
            { x: playerX, y: playerY },
            bullets,
            difficulty?.ai
        );

        // Smooth movement
        this.currentMove.x = move.x;
        this.currentMove.y = move.y;

        const magnitude = Math.sqrt(this.currentMove.x ** 2 + this.currentMove.y ** 2);
        if (magnitude > 0) {
            this.currentMove.x /= magnitude;
            this.currentMove.y /= magnitude;
        }

        // ✅ FINAL SPEED (controlled)
        const difficultyBoost = difficulty?.enemySpeed || 1;
        const finalSpeed = this.baseSpeed * difficultyBoost;

        this.x += this.currentMove.x * finalSpeed;
        this.y += this.currentMove.y * finalSpeed;

        // Keep inside canvas
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            this.x = Math.max(this.size / 2, Math.min(canvas.width - this.size / 2, this.x));
            this.y = Math.max(this.size / 2, Math.min(canvas.height - this.size / 2, this.y));
        }
    }

    draw(ctx) {
        const isBoss = this.type === 'BOSS';

        // 🔥 BOSS DESIGN
        if (isBoss) {

            const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.005);

            // Aura
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
            ctx.fillStyle = 'rgba(255,0,0,0.4)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 2 * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Body
            ctx.fillStyle = '#8b0000';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // 🔥 BOSS HEALTH BAR (TOP CENTER)
            const barWidth = 500;
            const barHeight = 25;
            const healthRatio = this.health / this.maxHealth;

            ctx.fillStyle = '#111';
            ctx.fillRect(ctx.canvas.width / 2 - barWidth / 2, 40, barWidth, barHeight);

            ctx.fillStyle = '#ff0033';
            ctx.fillRect(ctx.canvas.width / 2 - barWidth / 2, 40, barWidth * healthRatio, barHeight);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(ctx.canvas.width / 2 - barWidth / 2, 40, barWidth, barHeight);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText("FINAL BOSS", ctx.canvas.width / 2, 32);

            return;
        }

        // NORMAL DRONES
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Small health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(
            this.x - this.size,
            this.y - this.size - 8,
            (this.size * 2) * (this.health / this.maxHealth),
            3
        );
    }

    upgradeToStage(newStage) {
        if (this.type === 'BOSS') return;

        this.stage = newStage;
        this.baseSpeed = this.getBaseSpeed(Config.ENEMIES[this.type].SPEED);
        this.maxHealth = Config.ENEMIES[this.type].HEALTH * (1 + newStage * 0.4);
        this.health = this.maxHealth;
    }
}

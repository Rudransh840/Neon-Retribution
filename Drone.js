// Drone class for enemy AI with stage-based behaviors
class Drone {
    constructor(x, y, type = 'DRONE', stage = 1) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.stage = stage;
        
        const enemyType = Config.ENEMIES[type];
        
        // Calculate max health: use fixed BOSS health, otherwise use stage scaling
        this.maxHealth = this.type === 'BOSS' 
            ? enemyType.HEALTH 
            : enemyType.HEALTH * this.getStageHealthMultiplier();
            
        this.health = this.maxHealth;
        this.speed = enemyType.SPEED * this.getStageSpeedMultiplier();
        this.size = enemyType.SIZE;
        this.color = this.getStageBasedColor(enemyType.COLOR);
        this.lastDirectionChange = 0;
        this.directionChangeCooldown = 1000 - (stage * 150);
        this.currentMove = { x: 0, y: 0 };
        this.attackCooldown = 0;
        this.hasSpecialAbility = stage >= 3;
    }

    // Stage-based scaling methods
    getStageHealthMultiplier() {
        return 0.1;
    }

    getStageSpeedMultiplier() {
        // Drastically reduced base speed for Stage 1 (0.1 * Config.ENEMIES.DRONE.SPEED)
        return 0.1;
    }

    getStageBasedColor(baseColor) {
        const colorVariants = {
            '#ff00ff': ['#cc00cc', '#ff00ff', '#ff33cc', '#ff66cc'],
            '#ff3300': ['#cc2200', '#ff3300', '#ff6633', '#ff9966'],
            '#ff0000': ['#ff0000'] // Boss color
        };
        
        return colorVariants[baseColor] 
            ? colorVariants[baseColor][Math.min(this.stage - 1, colorVariants[baseColor].length - 1)]
            : baseColor;
    }

    update(deltaTime, playerX, playerY, bullets, difficulty) {
        // Get AI movement from difficulty manager
        const move = window.difficultyManager.getEnemyMovement(
            this,
            { x: playerX, y: playerY },
            bullets,
            difficulty.ai
        );

        // Apply movement with smoothing
        const smoothFactor = this.stage === 1 ? 0.05 : 0.1 + (this.stage * 0.02);
        this.currentMove.x = this.currentMove.x * (1 - smoothFactor) + move.x * smoothFactor;
        this.currentMove.y = this.currentMove.y * (1 - smoothFactor) + move.y * smoothFactor;
        
        // Normalize
        const magnitude = Math.sqrt(this.currentMove.x ** 2 + this.currentMove.y ** 2);
        if (magnitude > 0) {
            this.currentMove.x /= magnitude;
            this.currentMove.y /= magnitude;
        }

        // Apply dynamic speed factor from DifficultyManager
        const speedFactor = difficulty.enemySpeed || 1; 
        this.x += this.currentMove.x * this.speed * deltaTime * speedFactor;
        this.y += this.currentMove.y * this.speed * deltaTime * speedFactor;

        // Special abilities only for non-bosses or stage 3+
        if (this.hasSpecialAbility && this.stage > 1) {
            this.updateSpecialAbilities(deltaTime, playerX, playerY);
        }

        // Update attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
        }

        // Keep in bounds
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            this.x = Math.max(this.size/2, Math.min(canvas.width - this.size/2, this.x));
            this.y = Math.max(this.size/2, Math.min(canvas.height - this.size/2, this.y));
        }
    }

    updateSpecialAbilities(deltaTime, playerX, playerY) {
        // Stage 3+ enemies have special abilities
        if (this.stage >= 3) {
            // Occasionally dash toward player
            if (Math.random() < 0.001 * this.stage && this.attackCooldown <= 0) {
                const dx = playerX - this.x;
                const dy = playerY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 100) {
                    this.currentMove.x = (dx / dist) * 3;
                    this.currentMove.y = (dy / dist) * 3;
                    this.attackCooldown = 2000;
                }
            }
        }

        // Stage 4+ enemies can occasionally evade
        if (this.stage >= 4 && Math.random() < 0.005) {
            this.currentMove.x = (Math.random() - 0.5) * 2;
            this.currentMove.y = (Math.random() - 0.5) * 2;
        }
    }

    draw(ctx) {
        const isBoss = this.type === 'BOSS';
        
        // Draw drone body with stage-based appearance
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw drone details
        ctx.strokeStyle = isBoss ? '#FFFF00' : (this.stage >= 3 ? '#FFFF00' : '#FFFFFF');
        ctx.lineWidth = isBoss ? 5 : (this.stage >= 4 ? 3 : 2);
        ctx.stroke();
        
        // Draw drone "eyes"
        const eyeColor = isBoss ? '#00FFFF' : (this.stage >= 4 ? '#00FF00' : (this.stage >= 3 ? '#FFFF00' : '#FF0000'));
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(this.x - 3, this.y - 2, isBoss ? 6 : (this.stage >= 4 ? 3 : 2), 0, Math.PI * 2);
        ctx.arc(this.x + 3, this.y - 2, isBoss ? 6 : (this.stage >= 4 ? 3 : 2), 0, Math.PI * 2);
        ctx.fill();
        
        // Draw propulsion effect
        const propulsionSize = 3 + (this.stage * 0.5);
        ctx.fillStyle = isBoss ? '#FF66FF' : (this.stage >= 4 ? '#00FF00' : '#00FFFF');
        ctx.beginPath();
        ctx.ellipse(this.x, this.y + this.size/2 + 2, propulsionSize, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw stage indicator for advanced enemies
        if (this.stage >= 3 && !isBoss) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Lvl ${this.stage}`, this.x, this.y - this.size - 5);
        }
        
        // --- Health Bar Drawing ---
        if (isBoss) {
             // Display massive, centered health bar for the boss
             const barWidth = 400;
             const barHeight = 25;
             const healthRatio = this.health / this.maxHealth;
             
             ctx.fillStyle = '#111111';
             ctx.fillRect(ctx.canvas.width/2 - barWidth/2, 40, barWidth, barHeight);
             
             ctx.fillStyle = '#ff0000';
             ctx.fillRect(ctx.canvas.width/2 - barWidth/2, 40, barWidth * healthRatio, barHeight);

             ctx.strokeStyle = '#ffffff';
             ctx.lineWidth = 2;
             ctx.strokeRect(ctx.canvas.width/2 - barWidth/2, 40, barWidth, barHeight);
             
             ctx.fillStyle = '#ffffff';
             ctx.font = 'bold 16px Courier New';
             ctx.textAlign = 'center';
             ctx.fillText('BOSS HEALTH', ctx.canvas.width/2, 35);
        } else {
            // Standard enemy health bar
            const enemyType = Config.ENEMIES[this.type];
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(
                this.x - enemyType.SIZE,
                this.y - enemyType.SIZE - 8,
                (enemyType.SIZE * 2) * (this.health / this.maxHealth),
                3
            );
        }
    }

    // Method to handle stage transitions
    upgradeToStage(newStage) {
        // Don't upgrade boss health, only regular enemies
        if (this.type === 'BOSS') return; 

        const originalHealthPercent = this.health / this.maxHealth;
        this.stage = newStage;
        
        // Update properties based on new stage
        this.maxHealth = Config.ENEMIES[this.type].HEALTH * this.getStageHealthMultiplier();
        this.health = this.maxHealth * originalHealthPercent;
        this.speed = Config.ENEMIES[this.type].SPEED * this.getStageSpeedMultiplier();
        this.color = this.getStageBasedColor(Config.ENEMIES[this.type].COLOR);
        this.directionChangeCooldown = 1000 - (newStage * 150);
        this.hasSpecialAbility = newStage >= 3;
    }
}
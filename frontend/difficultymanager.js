class DifficultyManager {

    constructor() {
        this.baseDifficulty = 1;
        this.performanceMetrics = {
            accuracy: 1,
            killRate: 1,
            damageTaken: 1,
            movement: 1
        };
        this.historySize = 10;
        this.performanceHistory = [];
        this.currentStage = 1;
        this.stageStartTime = 0;
        this.stageDuration = 180000;

        // CORRECTED TARGETS for smoother progression and requested percentages
        this.stageDifficultyTargets = {
            // Stage 1: Base 7% (min 5%, max 10%) - Display will be fixed at 10%
            1: { base: 0.07, min: 0.05, max: 0.10 }, 
            // Stage 2: Base 0.25 (25%) - Scales up to 0.30 (30%) based on performance
            2: { base: 0.25, min: 0.20, max: 0.30 }, 
            // Stage 3: Base 0.30 (30%) - Scales up to 0.45 (45%) based on performance
            3: { base: 0.30, min: 0.25, max: 0.45 }, 
            // Stage 4: Boss fight (fixed 100% difficulty)
            4: { base: 1.5, min: 1.5, max: 1.5 }
        };
    }

    setStage(stage) {
        this.currentStage = stage;
        this.stageStartTime = Date.now();
    }

    getStageProgress() {
        const elapsed = Date.now() - this.stageStartTime;
        return Math.min(1, elapsed / this.stageDuration);
    }

    isStageComplete() {
        // Stage 4 (Boss Stage) completion is defined by killing the boss, not time.
        if (this.currentStage === 4) {
            return false;
        }
        return (Date.now() - this.stageStartTime) >= this.stageDuration;
    }

    updateMetrics(gameState) {
        const accuracy = gameState.totalShotsFired > 0
            ? Math.min(1, gameState.totalHits / gameState.totalShotsFired)
            : 0.7;

        const killRate = gameState.timeElapsed > 60000
            ? Math.min(2, gameState.totalKills / (gameState.timeElapsed / 60000))
            : 1;

        const damageTaken = gameState.timeElapsed > 60000
            ? Math.min(2, 2 - (gameState.totalDamageTaken / (gameState.timeElapsed / 60000) * 0.5))
            : 1;

        this.performanceMetrics.accuracy = Math.min(2, Math.max(0.3, accuracy * 3));
        this.performanceMetrics.killRate = Math.min(2, Math.max(0.3, killRate * 0.8));
        this.performanceMetrics.damageTaken = Math.min(2, Math.max(0.3, damageTaken));
        this.performanceMetrics.movement = Math.min(2, Math.max(0.3, gameState.playerMovement || 1));

        this.performanceHistory.push({...this.performanceMetrics});
        if (this.performanceHistory.length > this.historySize) {
            this.performanceHistory.shift();
        }
    }

    calculatePerformanceAdjustment() {
        if (this.performanceHistory.length < 3) return 1;

        let totalWeight = 0;
        let weightedPerformance = {
            accuracy: 0,
            killRate: 0,
            damageTaken: 0,
            movement: 0
        };

        this.performanceHistory.forEach((metrics, index) => {
            const weight = (index + 1) / this.performanceHistory.length;
            totalWeight += weight;

            weightedPerformance.accuracy += metrics.accuracy * weight;
            weightedPerformance.killRate += metrics.killRate * weight;
            weightedPerformance.damageTaken += metrics.damageTaken * weight;
            weightedPerformance.movement += metrics.movement * weight;
        });

        weightedPerformance.accuracy /= totalWeight;
        weightedPerformance.killRate /= totalWeight;
        weightedPerformance.damageTaken /= totalWeight;
        weightedPerformance.movement /= totalWeight;

        const performanceScore = (weightedPerformance.accuracy + weightedPerformance.killRate +
                                 weightedPerformance.damageTaken + weightedPerformance.movement) / 4;

        // Less aggressive adjustment in the early stages (Stages 1-2)
        if (this.currentStage <= 2) {
            return Math.min(1.1, Math.max(0.9, 0.9 + (performanceScore - 0.7) * 1.5));
        } else {
            return Math.min(1.2, Math.max(0.8, performanceScore));
        }
    }

    calculateDifficulty(gameState) {
        this.updateMetrics(gameState);

        const timeFactor = Math.log10(gameState.timeElapsed / 60000 + 1);
        const scoreFactor = gameState.score / 5000;

        let target = this.stageDifficultyTargets[this.currentStage];
        let stageBaseDifficulty;

        if (this.currentStage === 4) {
             // Fixed difficulty for boss fight
             stageBaseDifficulty = target.base;
        } else if (this.currentStage === 1) {
             stageBaseDifficulty = target.base;
        } else {
            // Smoother scaling for Stage 2/3
            stageBaseDifficulty = target.base + timeFactor * 0.03 + scoreFactor * 0.005;
        }

        this.baseDifficulty = stageBaseDifficulty;

        // No dynamic adjustment for boss stage (Stage 4)
        const adjustment = (this.currentStage === 4) ? 1 : this.calculatePerformanceAdjustment();
        let dynamicDifficulty = this.baseDifficulty * adjustment;

        // Apply clamping based on stage targets
        dynamicDifficulty = Math.max(target.min, Math.min(target.max, dynamicDifficulty));

        return {
            baseDifficulty: dynamicDifficulty,
            spawnRate: this.calculateSpawnRate(dynamicDifficulty),
            enemySpeed: this.calculateEnemySpeed(dynamicDifficulty),
            enemyHealth: this.calculateEnemyHealth(dynamicDifficulty),

            ai: {
                // Boss AI level is max
                level: this.currentStage === 4 ? 5 : Math.min(5, Math.floor(dynamicDifficulty * (this.currentStage === 1 ? 2 : 1))),
                flankChance: this.calculateFlankChance(dynamicDifficulty),
                dodgeChance: this.calculateDodgeChance(dynamicDifficulty),
                stage: this.currentStage
            }
        };
    }

    calculateSpawnRate(difficulty) {
        if (this.currentStage === 4) {
            // Boss stage: very slow spawn rate for supporting enemies
            return 3;
        }
        if (this.currentStage === 1) {
            // Slowest spawn rate for training
            return Math.max(1.6, 2 - difficulty * 4);
        }
        // ADJUSTED: Slower spawn rate increase for Stage 2/3
        return Math.max(0.3, 1.2 - difficulty * 1.5);
    }

    calculateEnemySpeed(difficulty) {
        if (this.currentStage === 1) {
            // Very slow initial speed
            return Math.min(0.8, 0.3 + difficulty * 5);
        }
        // ADJUSTED: Slower speed increase for Stage 2/3/4
        return Math.min(2.0, 0.8 + difficulty * 1.5);
    }

    calculateEnemyHealth(difficulty) {
        if (this.currentStage === 4) {
             // For the boss stage, enemy health factor is 1; the BOSS enemy type defines the massive health.
             return 1;
        }
        if (this.currentStage === 1) {
            return Math.min(1.2, 0.8 + difficulty * 1.5);
        }
        // ADJUSTED: Slower health increase for Stage 2/3
        return Math.min(2, 1 + difficulty * 1.0);
    }

    calculateFlankChance(difficulty) {
        if (this.currentStage === 1) {
            return Math.min(0.1, difficulty * 0.3);
        }
        return Math.min(0.5, difficulty * 0.1 * this.currentStage);
    }

    calculateDodgeChance(difficulty) {
        if (this.currentStage === 1) {
            return 0;
        }
        return Math.min(0.6, difficulty * 0.15 * this.currentStage);
    }

    getEnemyMovement(enemy, playerPos, bullets, aiParams) {
        const baseMove = {
            x: playerPos.x - enemy.x,
            y: playerPos.y - enemy.y
        };
        const distToPlayer = Math.sqrt(baseMove.x**2 + baseMove.y**2);

        if (distToPlayer > 0) {
            baseMove.x /= distToPlayer;
            baseMove.y /= distToPlayer;
        }

        const aiMove = { ...baseMove };

        if ((enemy.type === 'TANK' || enemy.type === 'BOSS' || aiParams.level >= 3) &&
            Math.random() < aiParams.flankChance && this.currentStage > 1) {
            const flankAngle = Math.atan2(baseMove.y, baseMove.x) +
                            (Math.PI/2) * (Math.random() > 0.5 ? 1 : -1);
            aiMove.x += Math.cos(flankAngle) * 0.7;
            aiMove.y += Math.sin(flankAngle) * 0.7;
        }

        if (this.currentStage > 1 && aiParams.level >= 2 && bullets.length > 0 &&
            Math.random() < aiParams.dodgeChance) {
            bullets.forEach(bullet => {
                const dx = bullet.x - enemy.x;
                const dy = bullet.y - enemy.y;
                const dist = Math.sqrt(dx**2 + dy**2);

                if (dist < 100) {
                    const pushForce = 1.5 * (1 - dist/100) * (aiParams.stage * 0.2);
                    aiMove.x -= (dx/dist) * pushForce;
                    aiMove.y -= (dy/dist) * pushForce;
                }
            });
        }

        const moveDist = Math.sqrt(aiMove.x**2 + aiMove.y**2);
        if (moveDist > 0) {
            aiMove.x /= moveDist;
            aiMove.y /= moveDist;
        }

        return aiMove;
    }

    getStageRewards(stage) {
        const rewards = {
            1: { weapons: ['PULSE_PISTOL'], message: "Training Ground: Basic pistol unlocked" },
            2: { weapons: ['PULSE_PISTOL', 'SHOTGUN'], message: "Stage 2 Complete: Shotgun unlocked!" },
            3: { weapons: ['PULSE_PISTOL', 'SHOTGUN', 'SNIPER'], message: "Stage 3 Complete: Sniper unlocked!" },
            4: { weapons: ['PULSE_PISTOL', 'SHOTGUN', 'SNIPER'], message: "FINAL BOSS DEFEATED!" }
        };

        return rewards[stage] || rewards[1];
    }

    getDifficultyPercentage() {
        let target = this.stageDifficultyTargets[this.currentStage];
        let difficulty = this.baseDifficulty * (this.currentStage === 4 ? 1 : this.calculatePerformanceAdjustment());
        let clampedDifficulty = Math.max(target.min, Math.min(target.max, difficulty));

        if (this.currentStage === 4) {
            return 100; // Display 100% for the boss fight
        }

        // For Stages 1, 2, and 3, simply return the clamped value multiplied by 100.
        // This naturally gives 10%, 25-30%, and 30-45% ranges.
        return Math.round(clampedDifficulty * 100);
    }
}

window.difficultyManager = new DifficultyManager();
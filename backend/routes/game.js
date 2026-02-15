const express = require("express");
const Player = require("../models/Player");

const router = express.Router();

// SAVE GAME RESULT
router.post("/finish", async (req, res) => {
  try {
    const { playerId, city, score, stage, accuracy } = req.body;

    if (!playerId || !city) {
      return res.status(400).json({ message: "Missing player data" });
    }

    let player = await Player.findOne({ playerId });

    if (!player) {
      player = await Player.create({
        playerId,
        city,
        bestScore: score || 0,
        maxStage: stage || 1,
        gamesPlayed: 1,
        avgAccuracy: accuracy || 0
      });
    } else {
      player.bestScore = Math.max(player.bestScore, score || 0);
      player.maxStage = Math.max(player.maxStage, stage || 1);
      player.gamesPlayed += 1;

      if (accuracy !== undefined) {
        player.avgAccuracy =
          (player.avgAccuracy * (player.gamesPlayed - 1) + accuracy) /
          player.gamesPlayed;
      }

      await player.save();
    }

    res.json({ message: "Game result saved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save game result" });
  }
});

module.exports = router;

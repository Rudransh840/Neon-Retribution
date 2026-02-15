const express = require("express");
const Player = require("../models/Player");

const router = express.Router();

// CITY LEADERBOARD
router.get("/:city", async (req, res) => {
  try {
    const { city } = req.params;

    const topPlayers = await Player.find({ city })
      .sort({ bestScore: -1 })
      .limit(10)
      .select("playerId bestScore maxStage");

    res.json(topPlayers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch leaderboard" });
  }
});

module.exports = router;

const mongoose = require("mongoose");

const PlayerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    unique: true,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  bestScore: {
    type: Number,
    default: 0
  },
  maxStage: {
    type: Number,
    default: 1
  },
  gamesPlayed: {
    type: Number,
    default: 0
  },
  avgAccuracy: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model("Player", PlayerSchema);

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  playerId: {
    type: String,
    required: true,
    unique: true
  }
});

module.exports = mongoose.model("User", UserSchema);

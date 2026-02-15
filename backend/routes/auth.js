const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

// SIGN UP
router.post("/signup", async (req, res) => {
  try {
    const { email, password, city } = req.body;

    if (!email || !password || !city) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const playerId = crypto.randomUUID();

    const user = await User.create({
      email,
      passwordHash,
      city,
      playerId
    });

    const token = jwt.sign(
      { playerId: user.playerId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, playerId, city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { playerId: user.playerId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, playerId: user.playerId, city: user.city });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;

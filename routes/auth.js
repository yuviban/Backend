const express = require("express");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const router = express.Router();

// Login route
router.post(
  "/login",
  [
    body("email", "Please enter a valid email").isEmail(),
    body("password", "Password is required").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      // Check user exists
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ errors: [{ msg: "Invalid Email or password" }] });
      }

      // Compare password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ errors: [{ msg: "Invalid Email or password" }] });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET || "mysecretkey", 
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login successful",
        token, 
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);



// Signup Route
router.post(
  "/signup",
  [
    body("firstName", "First name is required").trim().notEmpty(),
    body("lastName", "Last name is required").trim().notEmpty(),
    body("username", "Username must be at least 3 characters long")
      .trim()
      .isLength({ min: 3 }),
    body("email", "Please enter a valid email").isEmail().normalizeEmail(),
    body("password", "Password must be at least 6 characters long").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { firstName, lastName, username, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        return res.status(400).json({
          errors: [{ msg: "Email or Username already exists" }]
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user
      const newUser = new User({
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword
      });

      await newUser.save();
      res.status(201).json({
        message: "User registered successfully",
        user: { id: newUser._id, email: newUser.email, username: newUser.username }
      });
    } catch (err) {
      res.status(500).json({ errors: [{ msg: err.message }] });
    }
  }


);



module.exports = router;

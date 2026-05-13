import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
import mysql from "mysql2/promise";
import { JWT_SECRET, verifyToken } from "./authMiddleware.js";

export const authRouter = express.Router();

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "dashuser",
  password: process.env.DB_PASSWORD || "mypassword",
  database: process.env.DB_NAME || "vid",
});

// POST /auth/login
// Body: { username, password }
// Returns: { token, user: { id, username, role } }
authRouter.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};

  if (!username || !password)
    return res.status(400).json({ error: "Username and password required" });

  try {
    const [rows] = await db.query(
      "SELECT id, username, password, role FROM users WHERE username = ?",
      [username],
    );

    const user = rows[0];

    // Use a constant-time compare to prevent timing attacks.
    // We call bcrypt.compare even when the user doesn't exist (with a dummy
    // hash) so the response time doesn't leak whether the username is valid.
    const dummyHash =
      "$2b$12$invalidhashpaddingtomatchlength000000000000000000000000";
    const match = await bcrypt.compare(password, user?.password ?? dummyHash);

    if (!user || !match) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me  — lets the frontend re-validate a stored token on page load
authRouter.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

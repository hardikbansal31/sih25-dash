// Run once to create initial users:  node src/seed.js
// Add more users by copying the pattern below and re-running.

import bcrypt from "bcrypt";
import "dotenv/config";
import mysql from "mysql2/promise";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "dashuser",
  password: process.env.DB_PASSWORD || "mypassword",
  database: process.env.DB_NAME || "vid",
});

const SALT_ROUNDS = 12;

const users = [
  { username: "teacher1", password: "changeme123", role: "teacher" },
  { username: "student1", password: "changeme123", role: "student" },
];

for (const user of users) {
  const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
  await db.query(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = role",
    [user.username, hash, user.role],
  );
  console.log(
    `✓ ${user.role.padEnd(8)} "${user.username}" created (or already exists)`,
  );
}

await db.end();
console.log("\nDone. Change these passwords before deploying.");

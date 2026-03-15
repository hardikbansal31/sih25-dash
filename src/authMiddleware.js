import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET ?? "dev_secret_change_in_prod";

// Verifies the Bearer token and attaches req.user = { id, username, role }.
// Returns 401 if missing or invalid, 403 if expired.
export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError")
      return res
        .status(403)
        .json({ error: "Token expired, please log in again" });
    return res.status(401).json({ error: "Invalid token" });
  }
}

// Factory that returns a middleware enforcing a specific role.
// Usage:  router.post("/upload", verifyToken, requireRole("teacher"), handler)
export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `Requires role: ${role}` });
    }
    next();
  };
}

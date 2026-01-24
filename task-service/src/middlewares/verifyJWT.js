const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.SECRET_KEY || "change_me";

function verifyJWT(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // has userId, userType, etc.
    return next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid token" });
  }
}

module.exports = verifyJWT;

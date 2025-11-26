// backend-js/auth.js

const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const USERS_DB = path.join(__dirname, "users.json");
const SECRET = "EGPAYDCX_SECRET_KEY"; // baad me .env me le ja sakte hain

// -----------------------------
// Helper: Load / Save Users
// -----------------------------
function loadUsers() {
  try {
    const raw = fs.readFileSync(USERS_DB, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    // agar file nahi mili to empty array
    return [];
  }
}

function saveUsers(data) {
  fs.writeFileSync(USERS_DB, JSON.stringify(data, null, 2));
}

// -----------------------------
// Signup Controller
// -----------------------------
async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  let users = loadUsers();

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const newUser = {
    id: Date.now(),
    name,
    email,
    // backward compatibility ke liye dono field me same hash rakh rahe:
    passwordHash: hashed,
    password: hashed,
    isAdmin: false, // default: normal user
  };

  users.push(newUser);
  saveUsers(users);

  res.json({ success: true, message: "User registered successfully" });
}

// -----------------------------
// Login Controller
// -----------------------------
async function login(req, res) {
  const { email, password } = req.body;

  let users = loadUsers();
  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  // yahan purane / naye dono type ke users ke liye support:
  const storedHash = user.passwordHash || user.password;
  if (!storedHash) {
    return res
      .status(500)
      .json({ error: "User record corrupted (no password hash)" });
  }

  const match = await bcrypt.compare(password, storedHash);
  if (!match) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || false,
    },
    SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    isAdmin: user.isAdmin || false,
  });
}

// -----------------------------
// Middleware: Verify Token (normal user)
// -----------------------------
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token invalid" });
    req.user = user;
    next();
  });
}

// -----------------------------
// Middleware: Verify Admin
// -----------------------------
function verifyAdmin(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" });
    }

    if (!decoded.isAdmin) {
      return res.status(403).json({ error: "Admin access only" });
    }

    req.user = decoded;
    next();
  });
}

module.exports = {
  signup,
  login,
  verifyToken,
  verifyAdmin,
  loadUsers,
  saveUsers,
};
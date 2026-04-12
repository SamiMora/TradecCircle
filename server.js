const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const SERVICES_FILE = path.join(__dirname, "data.json");
const USERS_FILE = path.join(__dirname, "users.json");
const BUSINESSES_FILE = path.join(__dirname, "businesses.json");

const SECRET_KEY = "supersecretkey";

console.log("🚀 SERVER STARTED");

// ================= ROOT =================
app.get("/", (req, res) => {
  res.send("TradeCircle API is running 🚀");
});

// ================= USERS =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!role || (role !== "business" && role !== "customer")) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (!(await fs.pathExists(USERS_FILE))) {
      await fs.writeJson(USERS_FILE, []);
    }

    const users = await fs.readJson(USERS_FILE);

    const userExists = users.find(u => u.email === email);
    if (userExists) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: Date.now(),
      email,
      password: hashedPassword,
      role // ✅ NEW
    };

    users.push(newUser);
    await fs.writeJson(USERS_FILE, users);

    res.json({ message: "Signup successful ✅" });

  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    if (!(await fs.pathExists(USERS_FILE))) {
      return res.status(400).json({ error: "No users exist" });
    }

    const { email, password } = req.body;
    const users = await fs.readJson(USERS_FILE);

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

const token = jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  SECRET_KEY,
  { expiresIn: "7d" } 
);

    res.json({ token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= AUTH =================

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied" });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// ================= BUSINESS PROFILE =================

// CREATE or UPDATE business profile
app.post("/business-profile", authenticateToken, async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    if (!req.user || req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses allowed" });
    }

    const { name, description, contact, image } = req.body;

    if (!name || !contact || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!(await fs.pathExists(BUSINESSES_FILE))) {
      await fs.writeJson(BUSINESSES_FILE, []);
    }

    let businesses = [];

try {
  businesses = await fs.readJson(BUSINESSES_FILE);
} catch (err) {
  console.log("⚠️ Fixing corrupted businesses.json");
  businesses = [];
  await fs.writeJson(BUSINESSES_FILE, businesses);
}

    const existing = businesses.find(b => b.userId === req.user.id);

    if (existing) {
      businesses = businesses.map(b =>
        b.userId === req.user.id
          ? { ...b, name, description, contact, image }
          : b
      );
    } else {
      businesses.push({
        userId: req.user.id,
        name,
        description,
        contact,
        image
      });
    }

    await fs.writeJson(BUSINESSES_FILE, businesses);

    res.json({ message: "Profile saved ✅" });

  } catch (err) {
    console.error("PROFILE ERROR:", err);
    res.status(500).json({ error: "Profile failed" });
  }
});

// GET all business profiles
app.get("/business-profiles", async (req, res) => {
  try {
    if (!(await fs.pathExists(BUSINESSES_FILE))) {
      await fs.writeJson(BUSINESSES_FILE, []); // ✅ FIX
    }

    const data = await fs.readJson(BUSINESSES_FILE);
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: "Failed to load profiles" });
  }
});



// ================= SERVICES =================

// GET (public)
app.get("/services", async (req, res) => {
  try {
    if (!(await fs.pathExists(SERVICES_FILE))) {
      await fs.writeJson(SERVICES_FILE, []);
    }

    const data = await fs.readJson(SERVICES_FILE);

    // 👇 check if user wants ONLY their services
    const userId = req.query.userId;

    if (userId) {
      const filtered = data.filter(s => String(s.userId) === String(userId));
      return res.json(filtered);
    }

    // default = all services
    res.json(data);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// POST service (business only)
app.post("/services", authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses can post services" });
    }

    if (!(await fs.pathExists(SERVICES_FILE))) {
      await fs.writeJson(SERVICES_FILE, []);
    }

    const data = await fs.readJson(SERVICES_FILE);

    const { name, price, category, image } = req.body;

    const newService = {
      id: Date.now(),
      name,
      price,
      category,
      image,
      userId: req.user.id
    };

    data.push(newService);
    await fs.writeJson(SERVICES_FILE, data);

    res.json(newService);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE (owner only)
app.delete("/services/:id", authenticateToken, async (req, res) => {
  try {
        // ✅ SAFETY CHECK GOES RIGHT HERE
    if (!(await fs.pathExists(SERVICES_FILE))) {
      return res.status(404).json({ error: "No data file found" });
    }

    const id = parseInt(req.params.id);

    let data = await fs.readJson(SERVICES_FILE);

    const service = data.find(s => s.id === id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    if (service.userId !== req.user.id) {
      return res.status(403).json({ error: "Not authorized ❌" });
    }

    data = data.filter(s => s.id !== id);

    await fs.writeJson(SERVICES_FILE, data);

    res.json({ message: "Deleted ✅" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= START SERVER =================

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
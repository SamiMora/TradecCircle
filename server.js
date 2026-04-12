const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

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

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    users.push({
      id: Date.now(),
      email,
      password: hashedPassword,
      role
    });

    await fs.writeJson(USERS_FILE, users);

    res.json({ message: "Signup successful ✅" });

  } catch {
    res.status(500).json({ error: "Signup failed" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const users = await fs.readJson(USERS_FILE);

    const user = users.find(u => u.email === req.body.email);
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(req.body.password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign(user, SECRET_KEY, { expiresIn: "7d" });

    res.json({ token });

  } catch {
    res.status(500).json({ error: "Login failed" });
  }
});

// ================= BUSINESS =================

app.post("/business-profile", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses allowed" });
    }

    if (!(await fs.pathExists(BUSINESSES_FILE))) {
      await fs.writeJson(BUSINESSES_FILE, []);
    }

    let businesses;
    try {
      businesses = await fs.readJson(BUSINESSES_FILE);
    } catch {
      businesses = [];
      await fs.writeJson(BUSINESSES_FILE, []);
    }

    const { name, contact, description, image } = req.body;

    const existing = businesses.find(b => b.userId === req.user.id);

    if (existing) {
      businesses = businesses.map(b =>
        b.userId === req.user.id
          ? { ...b, name, contact, description, image }
          : b
      );
    } else {
      businesses.push({
        userId: req.user.id,
        name,
        contact,
        description,
        image
      });
    }

    await fs.writeJson(BUSINESSES_FILE, businesses);

    res.json({ message: "Profile saved ✅" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Profile failed" });
  }
});

app.get("/business-profiles", async (req, res) => {
  try {
    if (!(await fs.pathExists(BUSINESSES_FILE))) {
      await fs.writeJson(BUSINESSES_FILE, []);
    }

    const data = await fs.readJson(BUSINESSES_FILE);
    res.json(data);

  } catch {
    res.status(500).json({ error: "Failed to load profiles" });
  }
});

// ================= SERVICES =================

app.get("/services", async (req, res) => {
  try {
    if (!(await fs.pathExists(SERVICES_FILE))) {
      await fs.writeJson(SERVICES_FILE, []);
    }

    const data = await fs.readJson(SERVICES_FILE);

    if (req.query.userId) {
      return res.json(
        data.filter(s => String(s.userId) === req.query.userId)
      );
    }

    res.json(data);

  } catch {
    res.status(500).json({ error: "Failed to read data" });
  }
});

app.post("/services", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "business") {
      return res.status(403).json({ error: "Only businesses allowed" });
    }

    const data = await fs.readJson(SERVICES_FILE);

    const newService = {
      id: Date.now(),
      ...req.body,
      rating: 5,
      userId: req.user.id
    };

    data.push(newService);
    await fs.writeJson(SERVICES_FILE, data);

    res.json(newService);

  } catch {
    res.status(500).json({ error: "Failed to save" });
  }
});

app.put("/services/:id", authenticateToken, async (req, res) => {
  try {
    let data = await fs.readJson(SERVICES_FILE);
    const id = parseInt(req.params.id);

    data = data.map(s =>
      s.id === id && s.userId === req.user.id
        ? { ...s, ...req.body }
        : s
    );

    await fs.writeJson(SERVICES_FILE, data);

    res.json({ message: "Updated ✅" });

  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/services/:id", authenticateToken, async (req, res) => {
  try {
    let data = await fs.readJson(SERVICES_FILE);
    const id = parseInt(req.params.id);

    data = data.filter(s => !(s.id === id && s.userId === req.user.id));

    await fs.writeJson(SERVICES_FILE, data);

    res.json({ message: "Deleted ✅" });

  } catch {
    res.status(500).json({ error: "Delete failed" });
  }
});

// ================= START =================

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
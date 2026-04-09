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

const SECRET_KEY = "supersecretkey"; // later we secure this

console.log("🚀 SERVER STARTED");


// ================= USERS =================

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

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
      password: hashedPassword
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

    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);

    res.json({ token });

  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});


// ================= SERVICES =================

// GET services
app.get("/services", async (req, res) => {
  try {
    if (!(await fs.pathExists(SERVICES_FILE))) {
      await fs.writeJson(SERVICES_FILE, []);
    }

    const data = await fs.readJson(SERVICES_FILE);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read data" });
  }
});

// POST service
app.post("/services", async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    const data = await fs.readJson(SERVICES_FILE);

    const newService = {
      id: Date.now(),
      name,
      price,
      category,
      image
    };

    data.push(newService);
    await fs.writeJson(SERVICES_FILE, data);

    res.json(newService);
  } catch (error) {
    res.status(500).json({ error: "Failed to save" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
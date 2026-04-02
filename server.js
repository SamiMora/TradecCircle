const express = require("express");
const fs = require("fs-extra");
const path = require("path");

console.log("🚀 SERVER STARTED");

const app = express();

// ✅ MANUAL CORS FIX (THIS IS THE KEY)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// ✅ BODY LIMIT (for images)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// ROOT
app.get("/", (req, res) => {
  res.send("TradeCircle API is running 🚀");
});

// GET
app.get("/services", async (req, res) => {
  try {
    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJson(DATA_FILE, []);
    }

    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch (err) {
    console.error("READ ERROR:", err);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// POST
app.post("/services", async (req, res) => {
  try {
    const { name, price, category, image } = req.body;

    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJson(DATA_FILE, []);
    }

    const data = await fs.readJson(DATA_FILE);

    const newService = {
      id: Date.now(),
      name,
      price,
      category,
      image
    };

    data.push(newService);
    await fs.writeJson(DATA_FILE, data);

    res.json(newService);
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE
app.delete("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    let data = await fs.readJson(DATA_FILE);
    data = data.filter(s => s.id !== id);

    await fs.writeJson(DATA_FILE, data);

    res.json({ message: "Deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Failed to delete" });
  }
});

// PUT
app.put("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = req.body;

    let data = await fs.readJson(DATA_FILE);

    data = data.map(s =>
      s.id === id ? { ...s, ...updated } : s
    );

    await fs.writeJson(DATA_FILE, data);

    res.json({ message: "Updated" });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
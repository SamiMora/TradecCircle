const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

console.log("🚀 SERVER FILE LOADED");

const app = express();

// ✅ CORS (FIXES Netlify → Render connection)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// ✅ Body size limit (fixes image upload 413 error)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ✅ Port (Render uses this)
const PORT = process.env.PORT || 3000;

// ✅ Correct file path (VERY IMPORTANT for Render)
const DATA_FILE = path.join(__dirname, "data.json");


// =======================
// ROOT ROUTE
// =======================
app.get("/", (req, res) => {
  res.send("TradeCircle API is running 🚀");
});


// =======================
// TEST ROUTE (DEBUG)
// =======================
app.get("/test", (req, res) => {
  res.send("TEST ROUTE WORKS ✅");
});


// =======================
// GET SERVICES
// =======================
app.get("/services", async (req, res) => {
  console.log("📦 /services route hit");

  try {
    // create file if missing
    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJson(DATA_FILE, []);
    }

    const data = await fs.readJson(DATA_FILE);
    res.json(data);

  } catch (error) {
    console.error("❌ READ ERROR:", error);
    res.status(500).json({ error: "Failed to read data" });
  }
});


// =======================
// POST SERVICE
// =======================
app.post("/services", async (req, res) => {
  console.log("➕ POST /services hit");

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

  } catch (error) {
    console.error("❌ SAVE ERROR:", error);
    res.status(500).json({ error: "Failed to save" });
  }
});


// =======================
// DELETE SERVICE
// =======================
app.delete("/services/:id", async (req, res) => {
  console.log("🗑 DELETE /services hit");

  try {
    const id = parseInt(req.params.id);

    let data = await fs.readJson(DATA_FILE);

    data = data.filter(service => service.id !== id);

    await fs.writeJson(DATA_FILE, data);

    res.json({ message: "Deleted successfully ❌" });

  } catch (error) {
    console.error("❌ DELETE ERROR:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});


// =======================
// UPDATE SERVICE
// =======================
app.put("/services/:id", async (req, res) => {
  console.log("✏️ PUT /services hit");

  try {
    const id = parseInt(req.params.id);
    const updatedData = req.body;

    let data = await fs.readJson(DATA_FILE);

    data = data.map(service =>
      service.id === id ? { ...service, ...updatedData } : service
    );

    await fs.writeJson(DATA_FILE, data);

    res.json({ message: "Updated successfully ✏️" });

  } catch (error) {
    console.error("❌ UPDATE ERROR:", error);
    res.status(500).json({ error: "Failed to update" });
  }
});


// =======================
// START SERVER
// =======================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
console.log("🚀 SERVER STARTING...");

const app = express();
app.use(cors({
  origin: "*"
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = process.env.PORT || 3000;
const path = require("path");
const DATA_FILE = path.join(__dirname, "data.json");

// ROOT ROUTE
app.get("/", (req, res) => {
  res.send("TradeCircle API is running 🚀");
});

// GET services
app.get("/services", async (req, res) => {
  try {
    if (!(await fs.pathExists(DATA_FILE))) {
      await fs.writeJson(DATA_FILE, []); // create file if missing
    }

    const data = await fs.readJson(DATA_FILE);
    res.json(data);
  } catch (error) {
    console.error("READ ERROR:", error);
    res.status(500).json({ error: "Failed to read data" });
  }
});

// POST service
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
  } catch (error) {
    console.error("SAVE ERROR:", error);
    res.status(500).json({ error: "Failed to save" });
  }
});

// DELETE service
app.delete("/services/:id", async (req, res) => {
  const id = parseInt(req.params.id);

  let data = await fs.readJson(DATA_FILE);

  data = data.filter(service => service.id !== id);

  await fs.writeJson(DATA_FILE, data);

  res.json({ message: "Deleted successfully ❌" });
});

app.put("/services/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updatedData = req.body;

  let data = await fs.readJson(DATA_FILE);

  data = data.map(service =>
    service.id === id ? { ...service, ...updatedData } : service
  );

  await fs.writeJson(DATA_FILE, data);

  res.json({ message: "Updated successfully ✏️" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");

const app = express();
app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

const PORT = 3000;
const DATA_FILE = "./data.json";

// GET services
app.get("/services", async (req, res) => {
  const data = await fs.readJson(DATA_FILE);
  res.json(data);
});

// POST new service
app.post("/services", async (req, res) => {
  const { name, price, category, image } = req.body;

  const newService = {
    id: Date.now(), // 🔥 UNIQUE ID
    name,
    price,
    category,
    image
  };

  const data = await fs.readJson(DATA_FILE);
  data.push(newService);

  await fs.writeJson(DATA_FILE, data);

  res.json({ message: "Saved ✅", data: newService });
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
  console.log(`Server running on http://localhost:${PORT}`);
});
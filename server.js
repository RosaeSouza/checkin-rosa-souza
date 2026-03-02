require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("Banco conectado"))
.catch(err => console.log("Erro ao conectar:", err));

const CheckinSchema = new mongoose.Schema({
  estudio: String,
  checkin: Date,
  checkout: Date,
  hospedes: Array,
  criadoEm: { type: Date, default: Date.now }
});

const Checkin = mongoose.model("Checkin", CheckinSchema);

app.post("/checkin", async (req, res) => {
  try {
    const novo = new Checkin(req.body);
    await novo.save();
    res.json({ status: "salvo com sucesso" });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao salvar" });
  }
});

app.get("/admin", async (req, res) => {
  const dados = await Checkin.find().sort({ criadoEm: -1 });
  res.json(dados);
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

/* ===============================
   CONEXÃO MONGODB
================================= */

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("Banco conectado"))
  .catch(err => console.log("Erro ao conectar:", err));

/* ===============================
   CLOUDINARY
================================= */

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "documentos_checkin",
    resource_type: "auto"
  }
});

const upload = multer({ storage });

/* ===============================
   SCHEMA
================================= */

const CheckinSchema = new mongoose.Schema({
  estudio: String,
  checkin: Date,
  checkout: Date,
  hospedes: [{
    nome: String,
    cep: String,
    endereco: String,
    celular: String,
    cpf: String,
    passaporte: String,
    pais: String,
    documentoUrl: String,
    documentoPublicId: String
  }],
  criadoEm: { type: Date, default: Date.now }
});

const Checkin = mongoose.model("Checkin", CheckinSchema);

/* ===============================
   LOGIN ADMIN
================================= */

app.post("/admin-login", (req, res) => {
  const { password } = req.body;

  if(password === process.env.ADMIN_PASSWORD){
    return res.json({ autorizado: true });
  }

  res.status(401).json({ autorizado: false });
});

/* ===============================
   ROTAS
================================= */

app.post("/checkin", upload.any(), async (req, res) => {
  try {
    const hospedes = JSON.parse(req.body.hospedes);

    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        if (hospedes[index]) {
          hospedes[index].documentoUrl = file.path;
          hospedes[index].documentoPublicId = file.filename;
        }
      });
    }

    const novo = new Checkin({
      estudio: req.body.estudio,
      checkin: req.body.checkin,
      checkout: req.body.checkout,
      hospedes
    });

    await novo.save();
    res.json({ status: "salvo com sucesso" });

  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get("/admin", async (req, res) => {
  const dados = await Checkin.find().sort({ checkout: 1 });
  res.json(dados);
});

app.delete("/checkin/:id", async (req, res) => {
  const checkin = await Checkin.findById(req.params.id);

  for (const hospede of checkin.hospedes) {
    if (hospede.documentoPublicId) {
      await cloudinary.uploader.destroy(
        hospede.documentoPublicId,
        { resource_type: "auto" }
      );
    }
  }

  await Checkin.findByIdAndDelete(req.params.id);
  res.json({ status: "Excluído" });
});

/* ===============================
   SERVIDOR
================================= */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando");
});
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
   CONFIGURAÇÃO CLOUDINARY
================================= */

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {

    let resourceType = "image";

    if (file.mimetype === "application/pdf") {
      resourceType = "raw";
    }

    return {
      folder: "documentos_checkin",
      resource_type: resourceType,
      allowed_formats: ["jpg", "jpeg", "png", "pdf"]
    };
  }
});

const upload = multer({ storage });

/* ===============================
   SCHEMA MONGOOSE
================================= */

const CheckinSchema = new mongoose.Schema({
  estudio: String,
  checkin: Date,
  checkout: Date,
  hospedes: [
    {
      nome: String,
      cep: String,
      endereco: String,
      celular: String,
      cpf: String,
      documentoUrl: String
    }
  ],
  criadoEm: { type: Date, default: Date.now }
});

const Checkin = mongoose.model("Checkin", CheckinSchema);

/* ===============================
   ROTA CHECKIN COM UPLOAD
================================= */

app.post("/checkin", upload.any(), async (req, res) => {
  try {

    const estudio = req.body.estudio;
    const checkin = req.body.checkin;
    const checkout = req.body.checkout;

    const hospedes = JSON.parse(req.body.hospedes);

    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        if (hospedes[index]) {
          hospedes[index].documentoUrl = file.path;
        }
      });
    }

    const novo = new Checkin({
      estudio,
      checkin,
      checkout,
      hospedes
    });

    await novo.save();

    res.json({ status: "salvo com sucesso" });

  } catch (err) {
    console.error("ERRO AO SALVAR:", err);
    res.status(500).json({ erro: err.message });
  }
});

/* ===============================
   ROTA ADMIN (JSON)
================================= */

app.get("/admin", async (req, res) => {
  const dados = await Checkin.find().sort({ criadoEm: -1 });
  res.json(dados);
});

/* ===============================
   SERVIDOR
================================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando na porta " + PORT);
});
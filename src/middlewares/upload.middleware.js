const multer = require("multer");

// Configurar multer para usar memória (buffer) ao invés de salvar no disco
const storage = multer.memoryStorage();

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Tipo de arquivo inválido. Apenas imagens (JPEG, PNG, WEBP, GIF) são permitidas."
      ),
      false
    );
  }
};

// Configuração do multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
});

module.exports = upload;

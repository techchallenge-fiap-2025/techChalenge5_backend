const multer = require("multer");

// Configurar multer para usar memória (buffer) ao invés de salvar no disco
const storage = multer.memoryStorage();

// Filtro para aceitar imagens e vídeos
const fileFilter = (req, file, cb) => {
  // Se não há mimetype ou o campo não é um arquivo, permitir (é um campo de texto)
  if (!file || !file.mimetype) {
    return cb(null, true);
  }

  // Verificar se o campo é realmente um arquivo (capa ou vídeo)
  // Campos de texto como "titulo", "descricao", "capitulos" não devem passar por aqui
  const isFileField =
    file.fieldname === "capa" || file.fieldname.startsWith("video_");

  // Se não é um campo de arquivo esperado, permitir (pode ser um campo de texto sendo processado incorretamente)
  if (!isFileField) {
    return cb(null, true);
  }

  const allowedMimes = [
    // Imagens
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    // Vídeos
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/wmv",
    "video/flv",
    "video/webm",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Tipo de arquivo inválido: ${file.mimetype}. Apenas imagens (JPEG, PNG, WEBP, GIF) e vídeos (MP4, MOV, AVI, WMV, FLV, WEBM) são permitidos.`,
      ),
      false,
    );
  }
};

// Configuração do multer para múltiplos arquivos
const uploadCurso = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB máximo para vídeos
    files: 50, // Máximo de 50 arquivos (capa + vídeos)
  },
});

module.exports = uploadCurso;

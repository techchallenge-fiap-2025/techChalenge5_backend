const cloudinary = require("cloudinary").v2;
const env = require("./env");

// Validar configuração do Cloudinary
if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
  console.warn("⚠️ Configuração do Cloudinary incompleta. Upload de imagens pode não funcionar.");
}

cloudinary.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
});

module.exports = cloudinary;

require("dotenv").config();

// Sanitizar cloud_name removendo espaços e caracteres inválidos
const sanitizeCloudName = (cloudName) => {
  if (!cloudName) return cloudName;
  // Remove espaços, aspas e caracteres especiais, mantendo apenas letras, números e hífens
  return cloudName.trim().replace(/[\s"']/g, "").toLowerCase();
};

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  mongoUrl: process.env.MONGO_URL,
  jwtSecret: process.env.JWT_SECRET,
  cloudinaryCloudName: sanitizeCloudName(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
};

module.exports = env;

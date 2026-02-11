const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

class UploadService {
  /**
   * Faz upload de uma imagem para o Cloudinary
   * @param {Buffer} fileBuffer - Buffer do arquivo
   * @param {String} folder - Pasta no Cloudinary (ex: 'profiles', 'uploads')
   * @param {Object} options - Opções adicionais (width, height, crop, etc)
   * @returns {Promise<Object>} - Resultado do upload com URL e public_id
   */
  async uploadImage(fileBuffer, folder = "uploads", options = {}) {
    return new Promise((resolve, reject) => {
      // Se folder já começa com "plataforma-edc/", não adicionar novamente
      const finalFolder = folder.startsWith("plataforma-edc/")
        ? folder
        : `plataforma-edc/${folder}`;
      const uploadOptions = {
        folder: finalFolder,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
        transformation: [
          {
            width: options.width || 800,
            height: options.height || 800,
            crop: options.crop || "limit",
            quality: options.quality || "auto",
            fetch_format: options.format || "auto",
          },
        ],
        ...options,
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        },
      );

      // Converter buffer para stream
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  /**
   * Faz upload de uma imagem de perfil (otimizada para avatares)
   * @param {Buffer} fileBuffer - Buffer do arquivo
   * @param {String} userId - ID do usuário
   * @returns {Promise<Object>} - Resultado do upload
   */
  async uploadProfileImage(fileBuffer, userId) {
    return this.uploadImage(fileBuffer, "profiles", {
      width: 400,
      height: 400,
      crop: "fill",
      gravity: "face", // Foca no rosto se detectado
      quality: "auto",
      format: "auto",
      public_id: `profile_${userId}_${Date.now()}`,
    });
  }

  /**
   * Deleta uma imagem do Cloudinary
   * @param {String} publicId - Public ID da imagem no Cloudinary
   * @returns {Promise<Object>} - Resultado da deleção
   */
  async deleteImage(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      });
    });
  }

  /**
   * Deleta um vídeo do Cloudinary
   * @param {String} publicId - Public ID do vídeo no Cloudinary
   * @returns {Promise<Object>} - Resultado da deleção
   */
  async deleteVideo(publicId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: "video" },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        },
      );
    });
  }

  /**
   * Extrai o publicId de uma URL do Cloudinary
   * @param {String} url - URL do Cloudinary
   * @returns {String|null} - Public ID ou null se não conseguir extrair
   */
  extractPublicIdFromUrl(url) {
    if (!url || typeof url !== "string") return null;

    try {
      // Formato Cloudinary: https://res.cloudinary.com/{cloud_name}/video/upload/v{version}/{public_id}.{format}
      // ou: https://res.cloudinary.com/{cloud_name}/video/upload/{public_id}.{format}
      // ou com transformações: .../upload/{transformations}/{public_id}.{format}

      // Padrão principal: buscar após /video/upload/
      const videoMatch = url.match(
        /\/video\/upload\/(?:v\d+\/)?(?:[^\/]+\/)?(.+?)(?:\.[^.]+)?$/,
      );
      if (videoMatch && videoMatch[1]) {
        // Remover extensão se houver e retornar
        let publicId = videoMatch[1].replace(/\.[^.]+$/, "");
        // Se não começa com plataforma-edc, adicionar
        if (!publicId.startsWith("plataforma-edc/")) {
          // Tentar extrair a parte após upload
          const folderMatch = url.match(
            /\/video\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/,
          );
          if (folderMatch && folderMatch[1]) {
            publicId = folderMatch[1].replace(/\.[^.]+$/, "");
          }
        }
        return publicId;
      }

      // Tentar formato alternativo para imagens também
      const imageMatch = url.match(
        /\/image\/upload\/(?:v\d+\/)?(?:[^\/]+\/)?(.+?)(?:\.[^.]+)?$/,
      );
      if (imageMatch && imageMatch[1]) {
        return imageMatch[1].replace(/\.[^.]+$/, "");
      }

      return null;
    } catch (error) {
      console.error("Erro ao extrair publicId da URL:", error);
      return null;
    }
  }

  /**
   * Faz upload de um vídeo para o Cloudinary
   * @param {Buffer} fileBuffer - Buffer do arquivo
   * @param {String} folder - Pasta no Cloudinary
   * @param {String} publicId - Public ID customizado (opcional)
   * @returns {Promise<Object>} - Resultado do upload com URL e public_id
   */
  async uploadVideo(fileBuffer, folder = "uploads", publicId = null) {
    return new Promise((resolve, reject) => {
      // Se folder já começa com "plataforma-edc/", não adicionar novamente
      const finalFolder = folder.startsWith("plataforma-edc/")
        ? folder
        : `plataforma-edc/${folder}`;
      const uploadOptions = {
        folder: finalFolder,
        resource_type: "video",
        allowed_formats: ["mp4", "mov", "avi", "wmv", "flv", "webm"],
        ...(publicId && { public_id: publicId }),
      };

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            duration: result.duration,
            bytes: result.bytes,
            format: result.format,
          });
        },
      );

      // Converter buffer para stream
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  }

  /**
   * Atualiza uma imagem (deleta a antiga e faz upload da nova)
   * @param {Buffer} fileBuffer - Buffer do novo arquivo
   * @param {String} oldPublicId - Public ID da imagem antiga
   * @param {String} folder - Pasta no Cloudinary
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resultado do upload
   */
  async updateImage(fileBuffer, oldPublicId, folder = "uploads", options = {}) {
    try {
      // Deletar imagem antiga se existir
      if (oldPublicId) {
        await this.deleteImage(oldPublicId);
      }
      // Fazer upload da nova imagem
      return await this.uploadImage(fileBuffer, folder, options);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new UploadService();

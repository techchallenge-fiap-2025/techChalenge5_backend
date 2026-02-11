# Configuração do Cloudinary

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

## Como obter as credenciais do Cloudinary

1. Acesse [https://cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita (se ainda não tiver)
3. Após criar a conta, você será redirecionado para o Dashboard
4. No Dashboard, você encontrará:
   - **Cloud Name**: Nome da sua conta
   - **API Key**: Chave de API
   - **API Secret**: Segredo da API (clique em "Reveal" para ver)

## Estrutura de Pastas no Cloudinary

As imagens serão organizadas nas seguintes pastas:

- `plataforma-edc/profiles/` - Fotos de perfil dos usuários
- `plataforma-edc/uploads/` - Outras imagens gerais

## Endpoints Disponíveis

### POST `/api/upload/profile`
Upload de foto de perfil do usuário autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `image`: Arquivo de imagem (máximo 5MB)

**Resposta:**
```json
{
  "success": true,
  "message": "Foto de perfil atualizada com sucesso",
  "data": {
    "fotoPerfil": {
      "url": "https://res.cloudinary.com/...",
      "publicId": "plataforma-edc/profiles/profile_..."
    }
  }
}
```

### POST `/api/upload/image`
Upload de imagem genérica.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body:**
- `image`: Arquivo de imagem (máximo 5MB)
- `folder`: (opcional) Nome da pasta no Cloudinary
- `width`: (opcional) Largura desejada
- `height`: (opcional) Altura desejada
- `crop`: (opcional) Tipo de crop (fill, limit, etc)

### DELETE `/api/upload/:publicId`
Deleta uma imagem do Cloudinary.

**Headers:**
```
Authorization: Bearer <token>
```

**Parâmetros:**
- `publicId`: Public ID da imagem no Cloudinary

## Limites e Restrições

- Tamanho máximo do arquivo: 5MB
- Formatos aceitos: JPEG, JPG, PNG, WEBP, GIF
- Fotos de perfil são automaticamente redimensionadas para 400x400px
- A foto antiga é automaticamente deletada quando uma nova é enviada

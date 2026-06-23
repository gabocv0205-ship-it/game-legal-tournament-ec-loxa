const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Formato no permitido. Usa JPG, JPEG, PNG o WEBP.");
  }
}

export function previewImage(file: File): Promise<string> {
  validateImageFile(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo preparar la vista previa."));
    reader.readAsDataURL(file);
  });
}

export function compressImage(file: File, options: { maxWidth?: number; quality?: number; prefix?: string } = {}): Promise<File> {
  validateImageFile(file);
  const maxWidth = options.maxWidth || 640;
  const quality = options.quality || 0.72;
  const prefix = options.prefix || "imagen";

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = event => {
      const image = new Image();
      image.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      image.onload = () => {
        const scale = image.width > maxWidth ? maxWidth / image.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (!blob) return reject(new Error("No se pudo comprimir la imagen."));
          resolve(new File([blob], `${prefix}-${Date.now()}.webp`, { type: "image/webp" }));
        }, "image/webp", quality);
      };
      image.src = String(event.target?.result || "");
    };
    reader.readAsDataURL(file);
  });
}

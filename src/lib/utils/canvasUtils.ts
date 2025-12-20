export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Necesario para evitar problemas de CORS
    image.src = url;
  });

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No se pudo crear el contexto del canvas");
  }

  // Configurar el canvas al tamaño del recorte
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Dibujar la imagen recortada
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Convertir a Blob y luego a File
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("El canvas está vacío"));
          return;
        }
        // Creamos un archivo nuevo con el recorte
        const file = new File([blob], "recorte.jpg", { type: "image/jpeg" });
        resolve(file);
      },
      "image/jpeg",
      0.95
    ); // Calidad JPG 95%
  });
}

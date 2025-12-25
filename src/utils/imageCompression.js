const DEFAULT_MAX_SIZE = 1024;
const DEFAULT_QUALITY = 0.8;

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const buildCompressedFileName = (fileName, mimeType) => {
  const baseName = fileName?.replace(/\.[^/.]+$/, '') || `imagem-${Date.now()}`;
  if (mimeType === 'image/png') return `${baseName}.png`;
  if (mimeType === 'image/webp') return `${baseName}.webp`;
  return `${baseName}.jpg`;
};

export async function compressImage(
  file,
  { maxSize = DEFAULT_MAX_SIZE, quality = DEFAULT_QUALITY } = {}
) {
  if (!file?.type?.startsWith('image/')) {
    return file;
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(image, 0, 0, width, height);

  const outputType = ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
    ? file.type
    : 'image/jpeg';
  const outputQuality = outputType === 'image/png' ? undefined : quality;

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputType, outputQuality)
  );

  if (!blob) return file;

  return new File([blob], buildCompressedFileName(file.name, outputType), {
    type: outputType,
  });
}

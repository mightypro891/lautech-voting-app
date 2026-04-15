export async function resizeImageFile(file: File, size = 512): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode image.'));
    img.src = dataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  const ratio = Math.max(size / image.width, size / image.height);
  const width = image.width * ratio;
  const height = image.height * ratio;
  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(image, x, y, width, height);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Image export failed.'));
    }, 'image/jpeg', 0.92);
  });
}

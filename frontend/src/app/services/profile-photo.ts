/** Resize locally before upload; never send the original phone photo. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  // Some phones/exporters label JPEGs as application/octet-stream or image/pjpeg.
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47;
  const detectedType = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : file.type;
  if (detectedType && !detectedType.startsWith('image/')) throw new Error('Elegí una imagen JPG, JPEG, PNG o WebP.');
  const source = detectedType !== file.type ? new Blob([file], { type: detectedType }) : file;
  const url = URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No pudimos abrir esta imagen. Probá con otra foto JPG o JPEG.'));
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('La imagen no se pudo leer. Elegí otra foto.');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar tu foto. Intentá con otro navegador.');
    let longest = Math.min(1280, Math.max(image.naturalWidth, image.naturalHeight));
    for (let attempt = 0; attempt < 5; attempt++) {
      const scale = Math.min(1, longest / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.75, 0.6]) {
        const result = canvas.toDataURL('image/jpeg', quality);
        if (result.length <= 650000) return result;
      }
      longest = Math.max(128, Math.floor(longest * 0.7));
    }
    throw new Error('No pudimos procesar esta foto. Probá con otra de tu galería.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

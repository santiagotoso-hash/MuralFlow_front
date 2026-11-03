/**
 * Reduz a foto no próprio aparelho antes de enviar: fotos de celular têm
 * vários MB, e a ficha só precisa de ~640 px. Sai um JPEG leve (~60–120 KB).
 */
export async function reduzirFoto(arquivo: File, maiorLado = 640, qualidade = 0.82): Promise<string> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Escolha uma imagem (foto).");
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, falha) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => falha(new Error("Não foi possível abrir essa imagem. Tente uma foto em JPG ou PNG."));
      i.src = url;
    });
    const escala = Math.min(1, maiorLado / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext("2d")!;
    // Fundo branco: PNG com transparência não fica preto no JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", qualidade);
  } finally {
    URL.revokeObjectURL(url);
  }
}

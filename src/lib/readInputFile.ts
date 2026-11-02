/**
 * Lee un archivo cargado por el usuario como texto para los prompts. Antes se leía todo con
 * `readAsText`, de modo que un PDF o un Word llegaba al modelo como bytes ilegibles.
 */

export const INPUT_FILE_ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.csv,.json';

export async function readInputFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  let text: string;
  if (name.endsWith('.pdf') || name.endsWith('.docx')) {
    // Carga diferida: pdf.js y mammoth solo se descargan cuando alguien sube un archivo.
    const { extractTextFromDocx, extractTextFromPdf } = await import('@/lib/extractDocumentText');
    const buffer = await file.arrayBuffer();
    text = name.endsWith('.pdf') ? await extractTextFromPdf(buffer) : await extractTextFromDocx(buffer);
  } else if (name.endsWith('.doc')) {
    throw new Error('El formato .doc antiguo no se puede leer: guárdalo como .docx o PDF.');
  } else {
    text = await file.text();
  }
  if (!text.trim()) {
    throw new Error(`No se pudo extraer texto de «${file.name}». Si es un PDF escaneado, conviértelo primero a texto.`);
  }
  return text.trim();
}

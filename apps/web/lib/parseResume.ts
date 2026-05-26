import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const name = fileName.toLowerCase()

  // DOCX
  if (
    name.endsWith('.docx') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return cleanText(result.value)
  }

  // DOC (older Word format — mammoth handles it too)
  if (name.endsWith('.doc') || mimeType === 'application/msword') {
    const result = await mammoth.extractRawText({ buffer })
    return cleanText(result.value)
  }

  // PDF
  if (name.endsWith('.pdf') || mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return cleanText(result.text)
  }

  throw new Error(`Unsupported file type: ${fileName}`)
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .trim()
}

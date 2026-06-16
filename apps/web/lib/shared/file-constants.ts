// Client-safe upload constants & validation — NO node-only deps (pdf-parse,
// mammoth, Anthropic). Safe to import from client components. The heavy parsing
// implementation lives in ./file-parsing (server-only) and re-exports these.

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
// Image extensions are accepted because image-based resumes (scanned, photo,
// screenshot) are OCR'd via Claude vision in file-parsing.extractTextFromFile.
export const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.txt', '.png', '.jpg', '.jpeg', '.webp'] as const
// For <input accept="…">
export const FILE_ACCEPT_ATTR = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.webp'

export function isSupportedFile(fileName: string): boolean {
  const name = fileName.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

/**
 * Validate an uploaded file's size and type. Returns an error message string
 * for the caller to surface, or null when the file is acceptable.
 */
export function validateUpload(fileName: string, size: number): string | null {
  if (!isSupportedFile(fileName)) {
    return `Unsupported file type: ${fileName}. Accepted: PDF, Word (.docx/.doc), .txt, or image (PNG/JPG/WEBP)`
  }
  if (size > MAX_FILE_SIZE) {
    return `File too large: ${(size / 1024 / 1024).toFixed(1)}MB (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
  }
  if (size === 0) return 'File is empty'
  return null
}

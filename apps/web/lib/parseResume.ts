// Back-compat shim. The canonical implementation now lives in the shared
// module used by both products. Existing Interviews imports of
// `@/lib/parseResume` continue to work unchanged.
export { extractTextFromFile } from '@/lib/shared/file-parsing'

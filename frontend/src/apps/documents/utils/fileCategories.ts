import { Image, Film, Music, FileText, File } from 'lucide-react'

export type FileCategory = 'all' | 'images' | 'videos' | 'music' | 'documents' | 'other'

export const FILE_CATEGORIES: Record<Exclude<FileCategory, 'all' | 'other'>, string[]> = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'ico', 'tiff'],
  videos: ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v', 'wmv', 'flv'],
  music: ['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf', 'csv']
}

export const CATEGORY_INFO: Record<FileCategory, { label: string; icon: typeof Image; color: string }> = {
  all: { label: 'Alle Dateien', icon: File, color: 'text-gray-500' },
  images: { label: 'Bilder', icon: Image, color: 'text-pink-500' },
  videos: { label: 'Videos', icon: Film, color: 'text-purple-500' },
  music: { label: 'Musik', icon: Music, color: 'text-green-500' },
  documents: { label: 'Dokumente', icon: FileText, color: 'text-lavender-500' },
  other: { label: 'Sonstige', icon: File, color: 'text-gray-400' }
}

export function getCategoryFromFileName(fileName: string): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category as FileCategory
    }
  }

  return 'other'
}

export function getCategoryFromFileType(fileType: string): FileCategory {
  const type = fileType.toLowerCase()

  // Check MIME types
  if (type.startsWith('image/')) return 'images'
  if (type.startsWith('video/')) return 'videos'
  if (type.startsWith('audio/')) return 'music'
  if (type.includes('pdf') || type.includes('document') || type.includes('spreadsheet') || type.includes('presentation') || type.includes('text/')) {
    return 'documents'
  }

  // Check if it's just an extension (fallback)
  for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
    if (extensions.includes(type)) {
      return category as FileCategory
    }
  }

  return 'other'
}

export function getExtensionsForCategory(category: FileCategory): string[] {
  if (category === 'all' || category === 'other') return []
  return FILE_CATEGORIES[category] || []
}

export function filterDocumentsByCategory<T extends { name: string; file_type?: string }>(
  documents: T[],
  category: FileCategory
): T[] {
  if (category === 'all') return documents

  return documents.filter(doc => {
    const docCategory = doc.file_type
      ? getCategoryFromFileType(doc.file_type)
      : getCategoryFromFileName(doc.name)
    return docCategory === category
  })
}

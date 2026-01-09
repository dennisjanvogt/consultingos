import type { VideoProject, MediaAsset } from '../types'

const DB_NAME = 'video-editor-db'
const DB_VERSION = 1
const PROJECTS_STORE = 'projects'
const MEDIA_STORE = 'media'

let db: IDBDatabase | null = null

// Initialize IndexedDB
export async function initDB(): Promise<IDBDatabase> {
  if (db) return db

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result

      // Projects store
      if (!database.objectStoreNames.contains(PROJECTS_STORE)) {
        const projectStore = database.createObjectStore(PROJECTS_STORE, { keyPath: 'id' })
        projectStore.createIndex('updatedAt', 'updatedAt', { unique: false })
        projectStore.createIndex('name', 'name', { unique: false })
      }

      // Media store for large blobs
      if (!database.objectStoreNames.contains(MEDIA_STORE)) {
        const mediaStore = database.createObjectStore(MEDIA_STORE, { keyPath: 'id' })
        mediaStore.createIndex('projectId', 'projectId', { unique: false })
        mediaStore.createIndex('type', 'type', { unique: false })
      }
    }
  })
}

// Save a project to IndexedDB
export async function saveProjectToDB(project: VideoProject): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE], 'readwrite')
    const store = transaction.objectStore(PROJECTS_STORE)

    // Create a copy without blob data (blobs are stored separately)
    const projectData = {
      ...project,
      updatedAt: Date.now(),
    }

    const request = store.put(projectData)

    request.onerror = () => {
      console.error('Failed to save project:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

// Load a project from IndexedDB
export async function loadProjectFromDB(projectId: string): Promise<VideoProject | null> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE], 'readonly')
    const store = transaction.objectStore(PROJECTS_STORE)
    const request = store.get(projectId)

    request.onerror = () => {
      console.error('Failed to load project:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result || null)
    }
  })
}

// Get all project summaries
export async function getAllProjectSummaries(): Promise<{ id: string; name: string; updatedAt: number; thumbnailUrl?: string }[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE], 'readonly')
    const store = transaction.objectStore(PROJECTS_STORE)
    const index = store.index('updatedAt')
    const request = index.openCursor(null, 'prev') // Sort by updatedAt descending

    const summaries: { id: string; name: string; updatedAt: number; thumbnailUrl?: string }[] = []

    request.onerror = () => {
      console.error('Failed to get project summaries:', request.error)
      reject(request.error)
    }

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        const project = cursor.value as VideoProject
        summaries.push({
          id: project.id,
          name: project.name,
          updatedAt: project.updatedAt,
          thumbnailUrl: project.thumbnailUrl,
        })
        cursor.continue()
      } else {
        resolve(summaries)
      }
    }
  })
}

// Delete a project from IndexedDB
export async function deleteProjectFromDB(projectId: string): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE, MEDIA_STORE], 'readwrite')

    // Delete project
    const projectStore = transaction.objectStore(PROJECTS_STORE)
    projectStore.delete(projectId)

    // Delete associated media
    const mediaStore = transaction.objectStore(MEDIA_STORE)
    const mediaIndex = mediaStore.index('projectId')
    const mediaRequest = mediaIndex.openCursor(IDBKeyRange.only(projectId))

    mediaRequest.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    transaction.onerror = () => {
      console.error('Failed to delete project:', transaction.error)
      reject(transaction.error)
    }

    transaction.oncomplete = () => {
      resolve()
    }
  })
}

// Save media asset to IndexedDB
export async function saveMediaAssetToDB(
  projectId: string,
  asset: MediaAsset
): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readwrite')
    const store = transaction.objectStore(MEDIA_STORE)

    const mediaData = {
      ...asset,
      projectId,
    }

    const request = store.put(mediaData)

    request.onerror = () => {
      console.error('Failed to save media asset:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

// Load media assets for a project
export async function loadMediaAssetsFromDB(projectId: string): Promise<MediaAsset[]> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readonly')
    const store = transaction.objectStore(MEDIA_STORE)
    const index = store.index('projectId')
    const request = index.getAll(projectId)

    request.onerror = () => {
      console.error('Failed to load media assets:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result || [])
    }
  })
}

// Delete a media asset from IndexedDB
export async function deleteMediaAssetFromDB(assetId: string): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([MEDIA_STORE], 'readwrite')
    const store = transaction.objectStore(MEDIA_STORE)
    const request = store.delete(assetId)

    request.onerror = () => {
      console.error('Failed to delete media asset:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve()
    }
  })
}

// Export a project as JSON (for backup/sharing)
export async function exportProjectAsJSON(projectId: string): Promise<string> {
  const project = await loadProjectFromDB(projectId)
  if (!project) {
    throw new Error('Project not found')
  }

  const mediaAssets = await loadMediaAssetsFromDB(projectId)

  // Convert blobs to base64 for export
  const mediaWithBase64 = await Promise.all(
    mediaAssets.map(async (asset) => {
      if (asset.blob) {
        const base64 = await blobToBase64(asset.blob)
        return { ...asset, blobBase64: base64, blob: undefined }
      }
      return asset
    })
  )

  const exportData = {
    version: 1,
    project,
    mediaAssets: mediaWithBase64,
    exportedAt: Date.now(),
  }

  return JSON.stringify(exportData, null, 2)
}

// Import a project from JSON
export async function importProjectFromJSON(jsonData: string): Promise<string> {
  const importData = JSON.parse(jsonData)

  if (!importData.version || !importData.project) {
    throw new Error('Invalid project file format')
  }

  const project = importData.project as VideoProject
  const projectId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  project.id = projectId
  project.updatedAt = Date.now()

  // Save project
  await saveProjectToDB(project)

  // Convert base64 back to blobs and save media
  if (importData.mediaAssets) {
    for (const asset of importData.mediaAssets) {
      if (asset.blobBase64) {
        const blob = base64ToBlob(asset.blobBase64, asset.mimeType)
        const mediaAsset: MediaAsset = {
          ...asset,
          blob,
          blobBase64: undefined,
        }
        await saveMediaAssetToDB(projectId, mediaAsset)
      }
    }
  }

  return projectId
}

// Helper: Convert blob to base64
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      resolve(base64.split(',')[1]) // Remove data URL prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// Helper: Convert base64 to blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

// Get storage usage info
export async function getStorageInfo(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate()
    return {
      used: estimate.usage || 0,
      quota: estimate.quota || 0,
    }
  }
  return { used: 0, quota: 0 }
}

// Clear all data (for debugging)
export async function clearAllData(): Promise<void> {
  const database = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE, MEDIA_STORE], 'readwrite')

    transaction.objectStore(PROJECTS_STORE).clear()
    transaction.objectStore(MEDIA_STORE).clear()

    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
  })
}

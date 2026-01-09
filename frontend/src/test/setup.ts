import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
;(globalThis as typeof globalThis & { ResizeObserver: unknown }).ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
;(globalThis as typeof globalThis & { IntersectionObserver: unknown }).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock AudioContext
class MockAudioContext {
  destination = {}
  currentTime = 0
  state = 'running'

  createGain() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      gain: { value: 1 },
    }
  }

  createBufferSource() {
    return {
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      buffer: null,
      onended: null,
    }
  }

  decodeAudioData() {
    return Promise.resolve({
      getChannelData: vi.fn().mockReturnValue(new Float32Array(1000)),
      duration: 10,
      length: 10000,
      numberOfChannels: 2,
      sampleRate: 44100,
    })
  }

  resume() {
    return Promise.resolve()
  }

  close() {
    return Promise.resolve()
  }
}
Object.defineProperty(window, 'AudioContext', { value: MockAudioContext, writable: true })
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext, writable: true })

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  fillStyle: '',
  globalAlpha: 1,
  filter: '',
  textAlign: 'center',
  textBaseline: 'middle',
  font: '',
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
})

// Mock IndexedDB
class MockIDBRequest {
  result: unknown = null
  error: Error | null = null
  onsuccess: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  _trigger(success: boolean, result?: unknown) {
    this.result = result
    if (success && this.onsuccess) {
      this.onsuccess({ target: this } as unknown as Event)
    } else if (!success && this.onerror) {
      this.onerror({ target: this } as unknown as Event)
    }
  }
}

class MockIDBObjectStore {
  name: string
  data: Map<string, unknown> = new Map()

  constructor(name: string) {
    this.name = name
  }

  put(value: unknown): MockIDBRequest {
    const request = new MockIDBRequest()
    const key = (value as { id: string }).id
    this.data.set(key, value)
    setTimeout(() => request._trigger(true, key), 0)
    return request
  }

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest()
    setTimeout(() => request._trigger(true, this.data.get(key)), 0)
    return request
  }

  delete(key: string): MockIDBRequest {
    const request = new MockIDBRequest()
    this.data.delete(key)
    setTimeout(() => request._trigger(true), 0)
    return request
  }

  clear(): MockIDBRequest {
    const request = new MockIDBRequest()
    this.data.clear()
    setTimeout(() => request._trigger(true), 0)
    return request
  }

  getAll(): MockIDBRequest {
    const request = new MockIDBRequest()
    setTimeout(() => request._trigger(true, Array.from(this.data.values())), 0)
    return request
  }

  createIndex() {
    return {
      openCursor: () => {
        const request = new MockIDBRequest()
        setTimeout(() => request._trigger(true, null), 0)
        return request
      },
      getAll: () => {
        const request = new MockIDBRequest()
        setTimeout(() => request._trigger(true, []), 0)
        return request
      },
    }
  }

  index() {
    return this.createIndex()
  }
}

class MockIDBTransaction {
  objectStoreNames: string[] = []
  stores: Map<string, MockIDBObjectStore> = new Map()
  oncomplete: (() => void) | null = null
  onerror: (() => void) | null = null

  objectStore(name: string): MockIDBObjectStore {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockIDBObjectStore(name))
    }
    return this.stores.get(name)!
  }
}

class MockIDBDatabase {
  name: string
  objectStoreNames: { contains: (name: string) => boolean } = {
    contains: () => false,
  }
  stores: Map<string, MockIDBObjectStore> = new Map()

  constructor(name: string) {
    this.name = name
  }

  createObjectStore(name: string): MockIDBObjectStore {
    const store = new MockIDBObjectStore(name)
    this.stores.set(name, store)
    return store
  }

  transaction(): MockIDBTransaction {
    const tx = new MockIDBTransaction()
    tx.stores = this.stores
    setTimeout(() => tx.oncomplete?.(), 0)
    return tx
  }
}

const mockIndexedDB = {
  databases: new Map<string, MockIDBDatabase>(),
  open(name: string): MockIDBRequest {
    const request = new MockIDBRequest() as MockIDBRequest & { onupgradeneeded: ((event: Event) => void) | null }
    request.onupgradeneeded = null
    setTimeout(() => {
      let db = this.databases.get(name)
      if (!db) {
        db = new MockIDBDatabase(name)
        this.databases.set(name, db)
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: request } as unknown as Event)
        }
      }
      request._trigger(true, db)
    }, 0)
    return request
  },
}
Object.defineProperty(window, 'indexedDB', { value: mockIndexedDB, writable: true })
Object.defineProperty(globalThis, 'indexedDB', { value: mockIndexedDB, writable: true })

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock projectStorage service
vi.mock('@/apps/videoeditor/services/projectStorage', () => ({
  initDB: vi.fn().mockResolvedValue({}),
  saveProjectToDB: vi.fn().mockResolvedValue(undefined),
  loadProjectFromDB: vi.fn().mockResolvedValue(null),
  getAllProjectSummaries: vi.fn().mockResolvedValue([]),
  deleteProjectFromDB: vi.fn().mockResolvedValue(undefined),
  saveMediaAssetToDB: vi.fn().mockResolvedValue(undefined),
  loadMediaAssetsFromDB: vi.fn().mockResolvedValue([]),
  deleteMediaAssetFromDB: vi.fn().mockResolvedValue(undefined),
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'de',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}))

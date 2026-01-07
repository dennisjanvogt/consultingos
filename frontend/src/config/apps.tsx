import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  FolderOpen,
  Kanban,
  Clock,
  Calendar,
  Image,
  MessageSquare,
  Crown,
  Shield,
  Sparkles,
  Circle,
  Blocks,
  PenTool,
  Film,
  FileType,
  StickyNote,
  GitMerge,
} from 'lucide-react'

// App Components
import { DashboardApp } from '@/apps/dashboard/DashboardApp'
import { MasterDataApp } from '@/apps/masterdata/MasterDataApp'
import { TransactionsApp } from '@/apps/transactions/TransactionsApp'
import { SettingsApp } from '@/apps/settings/SettingsApp'
import { DocumentsApp } from '@/apps/documents/DocumentsApp'
import { CalendarApp } from '@/apps/calendar/CalendarApp'
import { KanbanApp } from '@/apps/kanban/KanbanApp'
import { TimeTrackingApp } from '@/apps/timetracking/TimeTrackingApp'
import { ImageViewerApp } from '@/apps/imageviewer/ImageViewerApp'
import { VideoViewerApp } from '@/apps/videoviewer/VideoViewerApp'
import { PDFViewerApp } from '@/apps/pdfviewer/PDFViewerApp'
import { ChatApp } from '@/apps/chat/ChatApp'
import { ChessApp } from '@/apps/chess/ChessApp'
import { GoApp } from '@/apps/go/GoApp'
import { AdminApp } from '@/apps/admin/AdminApp'
import { AIDashboardApp } from '@/apps/aidashboard/AIDashboardApp'
import { ArchitectureApp } from '@/apps/architecture/ArchitectureApp'
import WhiteboardApp from '@/apps/whiteboard/WhiteboardApp'
import { NotesApp } from '@/apps/notes/NotesApp'
import { WorkflowsApp } from '@/apps/workflows/WorkflowsApp'

export type AppCategory = 'core' | 'productivity' | 'tools' | 'games' | 'admin'

export interface AppDefinition {
  id: string
  component: React.ComponentType
  icon: React.ReactNode
  titleKey: string
  description: string // Beschreibung für AI Agent
  defaultSize: { width: number; height: number }
  category: AppCategory
  canDisable: boolean
  adminOnly?: boolean
}

export const appRegistry: Record<string, AppDefinition> = {
  dashboard: {
    id: 'dashboard',
    component: DashboardApp,
    icon: <LayoutDashboard className="h-6 w-6" />,
    titleKey: 'apps.dashboard',
    description: 'Übersicht mit Umsatz, offenen Rechnungen, letzten Kunden',
    defaultSize: { width: 900, height: 600 },
    category: 'core',
    canDisable: true,
  },
  masterdata: {
    id: 'masterdata',
    component: MasterDataApp,
    icon: <Users className="h-6 w-6" />,
    titleKey: 'apps.masterdata',
    description: 'Stammdaten: Kunden, Produkte und Steuersätze verwalten',
    defaultSize: { width: 850, height: 600 },
    category: 'core',
    canDisable: true,
  },
  transactions: {
    id: 'transactions',
    component: TransactionsApp,
    icon: <FileText className="h-6 w-6" />,
    titleKey: 'apps.transactions',
    description: 'Bewegungsdaten/Belege: Rechnungen, Angebote und Gutschriften',
    defaultSize: { width: 900, height: 650 },
    category: 'core',
    canDisable: true,
  },
  documents: {
    id: 'documents',
    component: DocumentsApp,
    icon: <FolderOpen className="h-6 w-6" />,
    titleKey: 'apps.documents',
    description: 'Dokumentenverwaltung mit Ordnern und Dateien',
    defaultSize: { width: 850, height: 600 },
    category: 'productivity',
    canDisable: true,
  },
  calendar: {
    id: 'calendar',
    component: CalendarApp,
    icon: <Calendar className="h-6 w-6" />,
    titleKey: 'apps.calendar',
    description: 'Termine und Events verwalten',
    defaultSize: { width: 950, height: 650 },
    category: 'productivity',
    canDisable: true,
  },
  kanban: {
    id: 'kanban',
    component: KanbanApp,
    icon: <Kanban className="h-6 w-6" />,
    titleKey: 'apps.kanban',
    description: 'Aufgaben und Projekte im Kanban-Board',
    defaultSize: { width: 1100, height: 700 },
    category: 'productivity',
    canDisable: true,
  },
  chat: {
    id: 'chat',
    component: ChatApp,
    icon: <MessageSquare className="h-6 w-6" />,
    titleKey: 'apps.chat',
    description: 'Chat-Assistent mit Gesprächsverlauf',
    defaultSize: { width: 900, height: 650 },
    category: 'productivity',
    canDisable: true,
  },
  timetracking: {
    id: 'timetracking',
    component: TimeTrackingApp,
    icon: <Clock className="h-6 w-6" />,
    titleKey: 'apps.timetracking',
    description: 'Arbeitszeiten erfassen und Projekte verwalten',
    defaultSize: { width: 950, height: 700 },
    category: 'productivity',
    canDisable: true,
  },
  imageviewer: {
    id: 'imageviewer',
    component: ImageViewerApp,
    icon: <Image className="h-6 w-6" />,
    titleKey: 'apps.imageviewer',
    description: 'Bilder anzeigen und generierte Bilder betrachten',
    defaultSize: { width: 800, height: 600 },
    category: 'tools',
    canDisable: true,
  },
  videoviewer: {
    id: 'videoviewer',
    component: VideoViewerApp,
    icon: <Film className="h-6 w-6" />,
    titleKey: 'apps.videoviewer',
    description: 'Videos abspielen und Bildschirmaufnahmen ansehen',
    defaultSize: { width: 900, height: 600 },
    category: 'tools',
    canDisable: true,
  },
  pdfviewer: {
    id: 'pdfviewer',
    component: PDFViewerApp,
    icon: <FileType className="h-6 w-6" />,
    titleKey: 'apps.pdfviewer',
    description: 'PDF-Dokumente anzeigen und durchblättern',
    defaultSize: { width: 800, height: 700 },
    category: 'tools',
    canDisable: true,
  },
  chess: {
    id: 'chess',
    component: ChessApp,
    icon: <Crown className="h-6 w-6" />,
    titleKey: 'apps.chess',
    description: 'Schach spielen gegen Stockfish AI',
    defaultSize: { width: 900, height: 700 },
    category: 'games',
    canDisable: true,
  },
  go: {
    id: 'go',
    component: GoApp,
    icon: <Circle className="h-6 w-6" />,
    titleKey: 'apps.go',
    description: 'Go (Weiqi/Baduk) spielen gegen KI',
    defaultSize: { width: 850, height: 700 },
    category: 'games',
    canDisable: true,
  },
  aidashboard: {
    id: 'aidashboard',
    component: AIDashboardApp,
    icon: <Sparkles className="h-6 w-6" />,
    titleKey: 'apps.aidashboard',
    description: 'AI Dashboard: Diagramme, Charts, Marktdaten und Visualisierungen',
    defaultSize: { width: 1000, height: 700 },
    category: 'tools',
    canDisable: true,
  },
  settings: {
    id: 'settings',
    component: SettingsApp,
    icon: <Settings className="h-6 w-6" />,
    titleKey: 'apps.settings',
    description: 'Einstellungen: Firmendaten, Bankverbindung, Stundensätze',
    defaultSize: { width: 600, height: 500 },
    category: 'admin',
    canDisable: true, // Kann deaktiviert werden - Settings sind auch über BottomBar erreichbar
  },
  admin: {
    id: 'admin',
    component: AdminApp,
    icon: <Shield className="h-6 w-6" />,
    titleKey: 'apps.admin',
    description: 'Admin-Bereich: Benutzerverwaltung und Systemeinstellungen',
    defaultSize: { width: 700, height: 550 },
    category: 'admin',
    canDisable: true,
    adminOnly: true,
  },
  architecture: {
    id: 'architecture',
    component: ArchitectureApp,
    icon: <Blocks className="h-6 w-6" />,
    titleKey: 'apps.architecture',
    description: 'System-Architektur: Diagramme und technische Dokumentation',
    defaultSize: { width: 1000, height: 700 },
    category: 'admin',
    canDisable: true,
    adminOnly: true,
  },
  whiteboard: {
    id: 'whiteboard',
    component: WhiteboardApp,
    icon: <PenTool className="h-6 w-6" />,
    titleKey: 'apps.whiteboard',
    description: 'Whiteboard: Architektur-Diagramme zeichnen und skizzieren',
    defaultSize: { width: 1000, height: 700 },
    category: 'tools',
    canDisable: true,
  },
  notes: {
    id: 'notes',
    component: NotesApp,
    icon: <StickyNote className="h-6 w-6" />,
    titleKey: 'apps.notes',
    description: 'Notizen: Schnelle Notizen erstellen, pinnen und farblich markieren',
    defaultSize: { width: 800, height: 600 },
    category: 'productivity',
    canDisable: true,
  },
  workflows: {
    id: 'workflows',
    component: WorkflowsApp,
    icon: <GitMerge className="h-6 w-6" />,
    titleKey: 'apps.workflows',
    description: 'Workflows: Vorlagen erstellen, Prozesse steuern und Fortschritt verfolgen',
    defaultSize: { width: 1000, height: 700 },
    category: 'productivity',
    canDisable: true,
  },
}

// Helper Funktionen
export const getAppIds = () => Object.keys(appRegistry)
export const getApp = (id: string) => appRegistry[id]
export const getAppComponent = (id: string) => appRegistry[id]?.component
export const getAppIcon = (id: string) => appRegistry[id]?.icon
export const getAppTitle = (id: string) => appRegistry[id]?.titleKey
export const getAppDefaultSize = (id: string) => appRegistry[id]?.defaultSize
export const getDisableableApps = () => Object.values(appRegistry).filter(app => app.canDisable)
export const getAppsByCategory = (category: AppCategory) =>
  Object.values(appRegistry).filter(app => app.category === category)

// Für AI Agent: Liste aller Apps mit Beschreibungen
export const getAppsForAI = (): string => {
  return Object.values(appRegistry)
    .filter(app => !app.adminOnly) // Admin-Apps ausblenden
    .map(app => `- ${app.id}: ${app.description}`)
    .join('\n')
}

// Default Dock-Reihenfolge
export const defaultDockOrder = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'notes',
  'workflows',
  'chat',
  'timetracking',
  'whiteboard',
  'chess',
  'go',
  'settings',
  'admin',
]

// Default enabled Apps (alle außer imageviewer - wird nur bei Bedarf geöffnet)
export const defaultEnabledApps = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'notes',
  'workflows',
  'chat',
  'timetracking',
  'whiteboard',
  'chess',
  'go',
  'settings',
  'admin',
]

// AppType als Union für TypeScript Kompatibilität
export type AppType = keyof typeof appRegistry

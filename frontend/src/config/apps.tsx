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

export type AppCategory = 'core' | 'productivity' | 'tools'

export interface AppDefinition {
  id: string
  component: React.ComponentType
  icon: React.ReactNode
  titleKey: string
  defaultSize: { width: number; height: number }
  category: AppCategory
  canDisable: boolean
}

export const appRegistry: Record<string, AppDefinition> = {
  dashboard: {
    id: 'dashboard',
    component: DashboardApp,
    icon: <LayoutDashboard className="h-6 w-6" />,
    titleKey: 'apps.dashboard',
    defaultSize: { width: 900, height: 600 },
    category: 'core',
    canDisable: true,
  },
  masterdata: {
    id: 'masterdata',
    component: MasterDataApp,
    icon: <Users className="h-6 w-6" />,
    titleKey: 'apps.masterdata',
    defaultSize: { width: 850, height: 600 },
    category: 'core',
    canDisable: true,
  },
  transactions: {
    id: 'transactions',
    component: TransactionsApp,
    icon: <FileText className="h-6 w-6" />,
    titleKey: 'apps.transactions',
    defaultSize: { width: 900, height: 650 },
    category: 'core',
    canDisable: true,
  },
  documents: {
    id: 'documents',
    component: DocumentsApp,
    icon: <FolderOpen className="h-6 w-6" />,
    titleKey: 'apps.documents',
    defaultSize: { width: 850, height: 600 },
    category: 'productivity',
    canDisable: true,
  },
  calendar: {
    id: 'calendar',
    component: CalendarApp,
    icon: <Calendar className="h-6 w-6" />,
    titleKey: 'apps.calendar',
    defaultSize: { width: 950, height: 650 },
    category: 'productivity',
    canDisable: true,
  },
  kanban: {
    id: 'kanban',
    component: KanbanApp,
    icon: <Kanban className="h-6 w-6" />,
    titleKey: 'apps.kanban',
    defaultSize: { width: 1100, height: 700 },
    category: 'productivity',
    canDisable: true,
  },
  timetracking: {
    id: 'timetracking',
    component: TimeTrackingApp,
    icon: <Clock className="h-6 w-6" />,
    titleKey: 'apps.timetracking',
    defaultSize: { width: 950, height: 700 },
    category: 'productivity',
    canDisable: true,
  },
  imageviewer: {
    id: 'imageviewer',
    component: ImageViewerApp,
    icon: <Image className="h-6 w-6" />,
    titleKey: 'apps.imageviewer',
    defaultSize: { width: 800, height: 600 },
    category: 'tools',
    canDisable: true,
  },
  settings: {
    id: 'settings',
    component: SettingsApp,
    icon: <Settings className="h-6 w-6" />,
    titleKey: 'apps.settings',
    defaultSize: { width: 600, height: 500 },
    category: 'core',
    canDisable: false, // Settings kann nicht deaktiviert werden
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

// Default Dock-Reihenfolge
export const defaultDockOrder = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'timetracking',
  'settings',
]

// Default enabled Apps (alle außer imageviewer - wird nur bei Bedarf geöffnet)
export const defaultEnabledApps = [
  'dashboard',
  'masterdata',
  'transactions',
  'documents',
  'calendar',
  'kanban',
  'timetracking',
  'settings',
]

// AppType als Union für TypeScript Kompatibilität
export type AppType = keyof typeof appRegistry

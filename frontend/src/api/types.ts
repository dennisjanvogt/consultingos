export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_approved: boolean
  is_staff: boolean
  avatar_url?: string | null
}

export interface Customer {
  id: number
  name: string
  email: string
  phone: string
  company: string
  street: string
  zip_code: string
  city: string
  country: string
  tax_id: string
  notes: string
}

export interface CustomerCreate {
  name: string
  email?: string
  phone?: string
  company?: string
  street?: string
  zip_code?: string
  city?: string
  country?: string
  tax_id?: string
  notes?: string
}

export interface InvoiceItem {
  id: number
  description: string
  quantity: string
  unit_price: string
  tax_rate: string
  position: number
}

export interface InvoiceItemCreate {
  description: string
  quantity?: number | string
  unit_price: number | string
  tax_rate?: number | string
  position?: number
}

export interface Invoice {
  id: number
  number: string
  customer_id: number
  customer_name: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  currency: string
  issue_date: string
  due_date: string
  paid_date: string | null
  notes: string
  subtotal: string
  tax_amount: string
  total: string
  items: InvoiceItem[]
}

export interface InvoiceCreate {
  customer_id: number
  status?: string
  currency?: string
  issue_date: string
  due_date: string
  notes?: string
  items: InvoiceItemCreate[]
}

export interface CompanySettings {
  company_name: string
  street: string
  zip_code: string
  city: string
  country: string
  email: string
  phone: string
  website: string
  tax_id: string
  tax_number: string
  bank_name: string
  iban: string
  bic: string
  default_hourly_rate: string
  default_tax_rate: string
  default_currency: string
  invoice_prefix: string
  next_invoice_number: number
  enabled_apps: string[]
  dock_order: string[]
}

export interface AppSettings {
  enabled_apps: string[]
  dock_order: string[]
}

export interface Folder {
  id: number
  name: string
  parent_id: number | null
  show_in_sidebar: boolean
  created_at: string
}

export interface FolderCreate {
  name: string
  parent_id?: number | null
  show_in_sidebar?: boolean
}

export interface Document {
  id: number
  name: string
  folder_id: number | null
  file_url: string
  file_type: string
  file_size: number
  duration: number | null  // Duration in seconds for video/audio
  description: string
  customer_id: number | null
  invoice_id: number | null
  created_at: string
}

export interface DocumentUpdate {
  name?: string
  folder_id?: number | null
  description?: string
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  password: string
}

export interface EventInvitation {
  id: number
  email: string
  name: string
  status: 'pending' | 'accepted' | 'declined'
  invited_at: string
}

export interface CalendarEvent {
  id: number
  title: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  location: string
  description: string
  color: string
  customer_id: number | null
  is_meeting: boolean
  meeting_link: string | null
  invitations: EventInvitation[]
  created_at: string
}

export interface CalendarEventCreate {
  title: string
  date: string
  start_time: string
  end_time: string
  location?: string
  description?: string
  color?: string
  customer_id?: number | null
  is_meeting?: boolean
}

export interface CalendarEventUpdate {
  title?: string
  date?: string
  start_time?: string
  end_time?: string
  location?: string
  description?: string
  color?: string
  customer_id?: number | null
  is_meeting?: boolean
}

// Kanban types
export type KanbanBoard = 'work' | 'private' | 'archive'
export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
export type KanbanPriority = 'low' | 'medium' | 'high'
export type KanbanColor = 'gray' | 'violet' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange'

export interface KanbanCard {
  id: number
  board: KanbanBoard
  column: KanbanColumn
  position: number
  title: string
  description: string
  priority: KanbanPriority
  color: KanbanColor
  due_date: string | null
  customer_id: number | null
  created_at: string
  updated_at: string
}

export interface KanbanCardCreate {
  board?: KanbanBoard
  column?: KanbanColumn
  title: string
  description?: string
  priority?: KanbanPriority
  color?: KanbanColor
  due_date?: string | null
  customer_id?: number | null
}

export interface KanbanCardUpdate {
  title?: string
  description?: string
  priority?: KanbanPriority
  color?: KanbanColor
  due_date?: string | null
  customer_id?: number | null
}

export interface KanbanCardMove {
  board: KanbanBoard
  column: KanbanColumn
  position: number
}

// Time Tracking types
export type ProjectColor = 'gray' | 'violet' | 'green' | 'yellow' | 'red' | 'purple' | 'pink' | 'orange'
export type ProjectStatus = 'active' | 'archived'

export interface TimeTrackingClient {
  id: number
  name: string
  email: string
  phone: string
  address: string
  notes: string
  created_at: string
}

export interface TimeTrackingClientCreate {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export interface TimeTrackingClientUpdate {
  name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}

export interface TimeTrackingProject {
  id: number
  client: number
  client_name: string
  name: string
  description: string
  hourly_rate: number
  color: ProjectColor
  status: ProjectStatus
  created_at: string
}

export interface TimeTrackingProjectCreate {
  client: number
  name: string
  description?: string
  hourly_rate?: number
  color?: ProjectColor
  status?: ProjectStatus
}

export interface TimeTrackingProjectUpdate {
  client?: number
  name?: string
  description?: string
  hourly_rate?: number
  color?: ProjectColor
  status?: ProjectStatus
}

export interface TimeEntry {
  id: number
  project: number
  project_name: string
  client_name: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM
  end_time: string // HH:MM
  duration_minutes: number
  description: string
  billable: boolean
  created_at: string
}

export interface TimeEntryCreate {
  project: number
  date: string
  start_time: string
  end_time: string
  description?: string
  billable?: boolean
}

export interface TimeEntryUpdate {
  project?: number
  date?: string
  start_time?: string
  end_time?: string
  description?: string
  billable?: boolean
}

export interface TimeTrackingSummary {
  total_hours: number
  total_revenue: number
  entries_count: number
  by_project: Array<{
    project_id: number
    project_name: string
    hours: number
    revenue: number
  }>
  by_client: Array<{
    client_id: number
    client_name: string
    hours: number
  }>
}

// AI Conversation types
export interface AIMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
  created_at: string
}

export interface AIConversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface AIConversationDetail extends AIConversation {
  messages: AIMessage[]
}

export interface AIConversationCreate {
  title?: string
}

export interface AIMessageCreate {
  role: 'user' | 'assistant'
  content: string
  image_url?: string | null
}

// AI Helper types
export interface AIHelper {
  id: number
  name: string
  icon: string
  description: string
  system_prompt: string
  enabled_tools: string[]
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface AIHelperCreate {
  name: string
  icon?: string
  description?: string
  system_prompt: string
  enabled_tools: string[]
}

export interface AIHelperUpdate {
  name?: string
  icon?: string
  description?: string
  system_prompt?: string
  enabled_tools?: string[]
}

// Chess types
export type ChessGameStatus = 'waiting' | 'active' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout'

export interface ChessMove {
  from: string
  to: string
  san: string
  fen: string
  timestamp?: string
}

export interface ChessGame {
  id: number
  white_player: User | null
  black_player: User | null
  is_ai_game: boolean
  ai_difficulty: number
  player_color: string
  fen: string
  pgn: string
  moves: ChessMove[]
  status: ChessGameStatus
  winner: User | null
  current_turn: string
  time_control: number | null
  white_time_remaining: number | null
  black_time_remaining: number | null
  created_at: string
  updated_at: string
}

export interface ChessGameCreate {
  is_ai_game?: boolean
  ai_difficulty?: number
  player_color?: 'white' | 'black'
  time_control?: number | null
}

export interface ChessInvitation {
  id: number
  from_user: User
  to_user: User
  game: ChessGame
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export interface ChessStats {
  total_games: number
  wins: number
  losses: number
  draws: number
  ai_games: number
  multiplayer_games: number
}

// Notes types
export type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink'

export interface Note {
  id: number
  title: string
  content: string
  is_pinned: boolean
  color: NoteColor
  created_at: string
  updated_at: string
}

export interface NoteCreate {
  title?: string
  content?: string
  color?: NoteColor
  is_pinned?: boolean
}

export interface NoteUpdate {
  title?: string
  content?: string
  color?: NoteColor
  is_pinned?: boolean
}

// Workflow types
export type WorkflowStatus = 'active' | 'completed' | 'paused'

export interface WorkflowCategory {
  id: number
  name: string
  color: string
  created_at: string
}

export interface WorkflowCategoryCreate {
  name: string
  color?: string
}

export interface WorkflowCategoryUpdate {
  name?: string
  color?: string
}

export interface WorkflowTemplateStep {
  id: number
  parent_id: number | null
  title: string
  description: string
  position: number
  default_days_offset: number
  children?: WorkflowTemplateStep[]
}

export interface WorkflowTemplateStepCreate {
  parent_id?: number | null
  title: string
  description?: string
  position?: number
  default_days_offset?: number
}

export interface WorkflowTemplateStepUpdate {
  title?: string
  description?: string
  position?: number
  default_days_offset?: number
}

export interface WorkflowTemplate {
  id: number
  category_id: number | null
  category_name: string | null
  name: string
  description: string
  steps: WorkflowTemplateStep[]
  created_at: string
  updated_at: string
}

export interface WorkflowTemplateList {
  id: number
  category_id: number | null
  category_name: string | null
  name: string
  description: string
  step_count: number
  created_at: string
  updated_at: string
}

export interface WorkflowTemplateCreate {
  name: string
  description?: string
  category_id?: number | null
}

export interface WorkflowTemplateUpdate {
  name?: string
  description?: string
  category_id?: number | null
}

export interface WorkflowInstanceStep {
  id: number
  parent_id: number | null
  title: string
  description: string
  position: number
  is_completed: boolean
  completed_at: string | null
  due_date: string | null
  notes: string
  children?: WorkflowInstanceStep[]
}

export interface WorkflowInstanceStepUpdate {
  title?: string
  description?: string
  notes?: string
  due_date?: string | null
}

export interface WorkflowInstance {
  id: number
  template_id: number | null
  template_name: string | null
  name: string
  customer_id: number | null
  customer_name: string | null
  project_id: number | null
  project_name: string | null
  status: WorkflowStatus
  progress: number
  steps: WorkflowInstanceStep[]
  started_at: string
  completed_at: string | null
}

export interface WorkflowInstanceList {
  id: number
  template_id: number | null
  name: string
  customer_id: number | null
  customer_name: string | null
  project_id: number | null
  project_name: string | null
  status: WorkflowStatus
  progress: number
  started_at: string
  completed_at: string | null
}

export interface WorkflowInstanceCreate {
  template_id: number
  name?: string
  customer_id?: number | null
  project_id?: number | null
}

export interface WorkflowInstanceUpdate {
  name?: string
  status?: WorkflowStatus
  customer_id?: number | null
  project_id?: number | null
}

export interface WorkflowCategoryStats {
  category_id: number | null
  category_name: string
  count: number
  avg_progress: number
}

export interface WorkflowStats {
  total_active: number
  total_completed: number
  by_category: WorkflowCategoryStats[]
  overdue_steps: number
}

// Knowledgebase types
export type ExpertDocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Expert {
  id: number
  name: string
  icon: string
  description: string
  system_prompt: string
  is_indexed: boolean
  document_count: number
  chunk_count: number
  created_at: string
  updated_at: string
}

export interface ExpertCreate {
  name: string
  icon?: string
  description?: string
  system_prompt?: string
}

export interface ExpertUpdate {
  name?: string
  icon?: string
  description?: string
  system_prompt?: string
}

export interface ExpertDocument {
  id: number
  expert_id: number
  name: string
  file_url: string
  file_type: string
  file_size: number
  status: ExpertDocumentStatus
  error_message: string
  page_count: number
  chunk_count: number
  created_at: string
}

export interface ExpertConversation {
  id: number
  expert_id: number
  title: string
  created_at: string
  updated_at: string
}

export interface ExpertConversationCreate {
  title?: string
}

export interface SourceChunk {
  document_name: string
  page_number: number | null
  content_preview: string
  similarity?: number  // 0-1 relevance score
}

export interface ExpertMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  source_chunks: SourceChunk[]
  created_at: string
}

export interface ExpertChatRequest {
  message: string
}

export interface ExpertChatResponse {
  message: ExpertMessage
  sources: SourceChunk[]
}

export interface ExpertQueryRequest {
  question: string
}

export interface ExpertQueryResponse {
  answer: string
  sources: SourceChunk[]
}

import type { AITool, ToolContext, OpenRouterToolDefinition } from './types'
import { windowTools } from './window.tools'
import { calendarTools } from './calendar.tools'
import { customerTools } from './customers.tools'
import { documentTools } from './documents.tools'
import { invoiceTools } from './invoices.tools'
import { kanbanTools } from './kanban.tools'
import { timetrackingTools } from './timetracking.tools'
import { aiTools } from './ai.tools'
import { dashboardTools } from './dashboard.tools'
import { searchTools } from './search.tools'
import { dataTools } from './data.tools'
import { analysisTools } from './analysis.tools'
import { inlineWidgetTools } from './inline-widget.tools'
import { notesTools } from './notes.tools'
import { workflowTools } from './workflow.tools'

/**
 * Tool Registry - Auto-discovery of all registered tools
 * To add new tools: create a new .tools.ts file and import/spread it here
 */
export const toolRegistry: AITool[] = [
  ...windowTools,
  ...calendarTools,
  ...customerTools,
  ...documentTools,
  ...invoiceTools,
  ...kanbanTools,
  ...timetrackingTools,
  ...aiTools,
  ...dashboardTools,
  ...searchTools,
  ...dataTools,
  ...analysisTools,
  ...inlineWidgetTools,
  ...notesTools,
  ...workflowTools,
]

/**
 * Get tool definitions formatted for OpenRouter API
 */
export const getToolDefinitions = (): OpenRouterToolDefinition[] =>
  toolRegistry.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))

/**
 * Get filtered tool definitions based on enabled tool names
 */
export const getFilteredToolDefinitions = (enabledTools: string[]): OpenRouterToolDefinition[] =>
  toolRegistry
    .filter(tool => enabledTools.includes(tool.name))
    .map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))

// Inline chart tools - only available when "Inline Charts" mode is on in Chat
const INLINE_CHART_TOOL_NAMES = [
  'inline_stock_chart',
  'inline_stock_with_ma',
  'inline_crypto_chart',
]

// Dashboard tools - ONLY available for AI Orb, NOT for Chat
// These tools open the AI Dashboard window and should not be triggered from chat
const DASHBOARD_TOOL_NAMES = [
  // dashboard.tools.ts
  'show_chart',
  'show_info',
  'show_table',
  'clear_dashboard',
  // analysis.tools.ts
  'linear_regression',
  'moving_average',
  'autoregressive',
  'analyze_stock',
  'analyze_crypto',
  // data.tools.ts (tools that open dashboard)
  'get_stock_history',
  'compare_stocks',
  'get_weather_forecast',
  'get_crypto_chart',
  'get_exchange_rates',
  'get_top_cryptos',
  'create_multi_stock_charts',
  'create_market_dashboard',
  'create_crypto_overview',
]

/**
 * Get tool definitions for chat
 * - Dashboard tools are ALWAYS excluded (AI Dashboard is only controlled via AI Orb)
 * - analysisMode ON: Include inline chart tools (charts appear in chat)
 * - analysisMode OFF: Exclude inline chart tools too (no charts at all in chat)
 */
export const getToolDefinitionsForChat = (analysisMode: boolean): OpenRouterToolDefinition[] => {
  // Start with all tools except dashboard tools (dashboard is AI Orb only)
  let tools = toolRegistry.filter(tool => !DASHBOARD_TOOL_NAMES.includes(tool.name))

  // If analysisMode is OFF, also exclude inline chart tools
  if (!analysisMode) {
    tools = tools.filter(tool => !INLINE_CHART_TOOL_NAMES.includes(tool.name))
  }

  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }))
}

/**
 * Execute a tool by name
 * @param name - The tool name from the function call
 * @param args - Arguments passed from the AI
 * @param context - Execution context (openWindow, onClose)
 * @returns Result string for the AI
 */
export const executeTool = async (
  name: string,
  args: Record<string, unknown>,
  context: ToolContext
): Promise<string> => {
  const tool = toolRegistry.find(t => t.name === name)

  if (!tool) {
    console.warn(`Unknown tool: ${name}`)
    return `Unbekannte Funktion: ${name}`
  }

  try {
    return await tool.execute(args, context)
  } catch (error) {
    console.error(`Tool execution error (${name}):`, error)
    return `Fehler bei der Ausführung von ${name}: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
  }
}

/**
 * Get a list of all available tool names
 */
export const getToolNames = (): string[] =>
  toolRegistry.map(t => t.name)

/**
 * Get tool count by category
 */
export const getToolStats = () => ({
  total: toolRegistry.length,
  byCategory: {
    window: windowTools.length,
    calendar: calendarTools.length,
    customers: customerTools.length,
    documents: documentTools.length,
    invoices: invoiceTools.length,
    kanban: kanbanTools.length,
    timetracking: timetrackingTools.length,
    ai: aiTools.length,
    dashboard: dashboardTools.length,
    search: searchTools.length,
    data: dataTools.length,
    analysis: analysisTools.length,
    inlineWidgets: inlineWidgetTools.length,
    notes: notesTools.length,
    workflows: workflowTools.length,
  }
})

/**
 * Get all tools grouped by category for UI
 */
export const getToolsByCategory = (): Record<string, { name: string; description: string }[]> => ({
  'Apps': windowTools.map(t => ({ name: t.name, description: t.description })),
  'Kalender': calendarTools.map(t => ({ name: t.name, description: t.description })),
  'Kunden': customerTools.map(t => ({ name: t.name, description: t.description })),
  'Dokumente': documentTools.map(t => ({ name: t.name, description: t.description })),
  'Rechnungen': invoiceTools.map(t => ({ name: t.name, description: t.description })),
  'Kanban': kanbanTools.map(t => ({ name: t.name, description: t.description })),
  'Zeiterfassung': timetrackingTools.map(t => ({ name: t.name, description: t.description })),
  'Notizen': notesTools.map(t => ({ name: t.name, description: t.description })),
  'Workflows': workflowTools.map(t => ({ name: t.name, description: t.description })),
  'Bilder': aiTools.map(t => ({ name: t.name, description: t.description })),
  'AI Dashboard': dashboardTools.map(t => ({ name: t.name, description: t.description })),
  'Web Suche': searchTools.map(t => ({ name: t.name, description: t.description })),
  'Marktdaten': dataTools.map(t => ({ name: t.name, description: t.description })),
  'Analyse': analysisTools.map(t => ({ name: t.name, description: t.description })),
  'Inline Widgets': inlineWidgetTools.map(t => ({ name: t.name, description: t.description })),
})

// Re-export types
export type { AITool, ToolContext, ToolParameter, OpenRouterToolDefinition } from './types'

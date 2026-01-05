import type { AITool, ToolContext, OpenRouterToolDefinition } from './types'
import { windowTools } from './window.tools'
import { calendarTools } from './calendar.tools'
import { customerTools } from './customers.tools'
import { documentTools } from './documents.tools'
import { invoiceTools } from './invoices.tools'
import { kanbanTools } from './kanban.tools'
import { timetrackingTools } from './timetracking.tools'
import { aiTools } from './ai.tools'

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
  'Bilder': aiTools.map(t => ({ name: t.name, description: t.description })),
})

// Re-export types
export type { AITool, ToolContext, ToolParameter, OpenRouterToolDefinition } from './types'

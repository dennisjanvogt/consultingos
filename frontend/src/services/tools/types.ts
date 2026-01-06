import type { AppType } from '@/stores/windowStore'

/**
 * Context passed to every tool execution
 */
export interface ToolContext {
  openWindow: (app: AppType) => void
  closeWindowByAppId: (app: AppType) => void
  onClose: () => void
  minimizeByAppId: (app: AppType) => void
}

/**
 * Parameter definition for a tool
 */
export interface ToolParameter {
  type: 'string' | 'number' | 'boolean'
  description: string
  enum?: string[]
}

/**
 * AI Tool definition - combines OpenRouter function schema with execution logic
 */
export interface AITool {
  /** Unique tool name (used in function calls) */
  name: string
  /** German description shown to the AI */
  description: string
  /** OpenRouter-compatible parameter schema */
  parameters: {
    type: 'object'
    properties: Record<string, ToolParameter>
    required: string[]
  }
  /** Execution function - returns a string response for the AI */
  execute: (args: Record<string, unknown>, context: ToolContext) => Promise<string>
}

/**
 * OpenRouter function definition format
 */
export interface OpenRouterToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required: string[]
    }
  }
}

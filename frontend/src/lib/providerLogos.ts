// Provider logos mapping
// Maps provider names to their logo paths

export const PROVIDER_LOGOS: Record<string, string> = {
  'Google': '/provider-logos/google.svg',
  'Anthropic': '/provider-logos/anthropic.svg',
  'OpenAI': '/provider-logos/openai.svg',
  'Meta': '/provider-logos/meta.svg',
  'Mistral': '/provider-logos/mistral.svg',
  'DeepSeek': '/provider-logos/deepseek.svg',
  'xAI': '/provider-logos/xai.svg',
  'Cohere': '/provider-logos/cohere.svg',
  'FLUX': '/provider-logos/flux.svg',
  'Stability': '/provider-logos/stability.svg',
  'Ideogram': '/provider-logos/ideogram.svg',
  'Recraft': '/provider-logos/recraft.svg',
  'Qwen': '/provider-logos/qwen.svg',
  'Perplexity': '/provider-logos/perplexity.svg',
  'Freepik': '/provider-logos/freepik.svg',
}

// Provider brand colors for fallback styling
export const PROVIDER_COLORS: Record<string, string> = {
  'Google': '#4285F4',
  'Anthropic': '#D97757',
  'OpenAI': '#10A37F',
  'Meta': '#0081FB',
  'Mistral': '#F7D046',
  'DeepSeek': '#4D6BFE',
  'xAI': '#000000',
  'Cohere': '#D18EE2',
  'FLUX': '#1a1a1a',
  'Stability': '#7C3AED',
  'Ideogram': '#8B5CF6',
  'Recraft': '#3B82F6',
  'Qwen': '#6366F1',
  'Perplexity': '#20B2AA',
  'Freepik': '#0052CC',
  'Nvidia': '#76B900',
  'Microsoft': '#00A4EF',
  'Amazon': '#FF9900',
  'AI21': '#EC4899',
  'Nous': '#F97316',
  'Together': '#6366F1',
  'Playground': '#8B5CF6',
}

// Get provider logo URL with fallback
export function getProviderLogo(provider: string): string | null {
  return PROVIDER_LOGOS[provider] || null
}

// Get provider color for fallback styling
export function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || '#6B7280' // gray-500 as default
}

// Get provider initial for fallback display
export function getProviderInitial(provider: string): string {
  return provider.charAt(0).toUpperCase()
}

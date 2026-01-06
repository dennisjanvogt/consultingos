import type { AITool } from './types'
import type { ChartType, LineStyle } from '@/stores/aiDashboardStore'

// Inline widget tools - these return widget data as markers in the message content
// The ChatApp will parse these markers and render widgets inline

// CORS Proxy for Yahoo Finance API
const CORS_PROXY = 'https://corsproxy.io/?url='

// Helper to fetch with CORS proxy
const fetchWithCorsProxy = async (url: string): Promise<Response> => {
  return fetch(CORS_PROXY + encodeURIComponent(url))
}

// Helper to format numbers
const formatNumber = (num: number, decimals = 2) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)

// Calculate Simple Moving Average
const calculateMA = (values: number[], period: number): (number | null)[] => {
  const result: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const slice = values.slice(i - period + 1, i + 1)
      const avg = slice.reduce((a, b) => a + b, 0) / period
      result.push(Math.round(avg * 100) / 100)
    }
  }
  return result
}

export const inlineWidgetTools: AITool[] = [
  {
    name: 'show_inline_chart',
    description:
      'Zeigt ein Diagramm direkt in der Chat-Nachricht an (nicht im Dashboard). Unterstützt Bar, Line, Pie, Area und Scatter Charts.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel des Diagramms',
        },
        chart_type: {
          type: 'string',
          description: 'Art des Diagramms',
          enum: ['bar', 'line', 'pie', 'area', 'scatter'],
        },
        data_json: {
          type: 'string',
          description:
            'JSON-Array mit Datenpunkten. Format: [{"name": "Label1", "value": 100}, {"name": "Label2", "value": 200}]',
        },
        color: {
          type: 'string',
          description: 'Optionale Farbe als Hex-Code (z.B. #8b5cf6). Standard: Violett',
        },
      },
      required: ['title', 'chart_type', 'data_json'],
    },
    execute: async (args) => {
      try {
        const data = JSON.parse(args.data_json as string)

        if (!Array.isArray(data)) {
          return 'Fehler: data_json muss ein Array sein'
        }

        const widget = {
          type: 'chart',
          title: args.title as string,
          chartType: args.chart_type as ChartType,
          data,
          color: (args.color as string) || '#8b5cf6',
        }

        // Return as inline widget marker - will be parsed by ChatApp
        return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->`
      } catch (error) {
        return `Fehler beim Erstellen des Diagramms: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  },

  {
    name: 'show_inline_table',
    description:
      'Zeigt eine Tabelle direkt in der Chat-Nachricht an. Daten werden als 2D-Array übergeben, wobei die erste Zeile die Spaltenüberschriften enthält.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel der Tabelle',
        },
        data_json: {
          type: 'string',
          description:
            'JSON 2D-Array. Erste Zeile = Überschriften. Format: [["Spalte1", "Spalte2"], ["Wert1", "Wert2"]]',
        },
      },
      required: ['title', 'data_json'],
    },
    execute: async (args) => {
      try {
        const data = JSON.parse(args.data_json as string)

        if (!Array.isArray(data) || !Array.isArray(data[0])) {
          return 'Fehler: data_json muss ein 2D-Array sein'
        }

        const widget = {
          type: 'table',
          title: args.title as string,
          data,
        }

        return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->`
      } catch (error) {
        return `Fehler beim Erstellen der Tabelle: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`
      }
    },
  },

  {
    name: 'show_inline_info',
    description:
      'Zeigt eine Info-Karte direkt in der Chat-Nachricht an. Unterstützt Markdown für Formatierung.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Titel der Info-Karte',
        },
        content: {
          type: 'string',
          description: 'Inhalt der Info-Karte (unterstützt Markdown)',
        },
      },
      required: ['title', 'content'],
    },
    execute: async (args) => {
      const widget = {
        type: 'info',
        title: args.title as string,
        data: args.content as string,
      }

      return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->`
    },
  },

  // ==================== INLINE STOCK/CRYPTO CHARTS ====================
  {
    name: 'inline_stock_chart',
    description:
      'Zeigt einen Aktienkurs-Chart DIREKT im Chat an. Holt Daten automatisch von Yahoo Finance.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Ticker-Symbol der Aktie (z.B. TSLA, AAPL, MSFT, SAP.DE)',
        },
        period: {
          type: 'string',
          description: 'Zeitraum für den Chart',
          enum: ['1w', '1m', '3m', '6m', '1y'],
        },
        chart_type: {
          type: 'string',
          description: 'Art des Charts (Standard: area)',
          enum: ['line', 'area'],
        },
      },
      required: ['symbol', 'period'],
    },
    execute: async (args) => {
      const symbol = (args.symbol as string).toUpperCase()
      const period = args.period as string
      const chartType = (args.chart_type as ChartType) || 'area'

      const rangeMap: Record<string, { range: string; interval: string }> = {
        '1w': { range: '5d', interval: '1d' },
        '1m': { range: '1mo', interval: '1d' },
        '3m': { range: '3mo', interval: '1d' },
        '6m': { range: '6mo', interval: '1wk' },
        '1y': { range: '1y', interval: '1wk' },
      }

      const { range, interval } = rangeMap[period] || rangeMap['1m']

      try {
        const response = await fetchWithCorsProxy(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
        )

        if (!response.ok) {
          return `Aktie "${symbol}" nicht gefunden.`
        }

        const data = await response.json()
        const result = data.chart?.result?.[0]

        if (!result) {
          return `Keine Daten für "${symbol}" verfügbar.`
        }

        const timestamps = result.timestamp || []
        const closes = result.indicators?.quote?.[0]?.close || []

        const chartData = timestamps
          .map((ts: number, i: number) => {
            const date = new Date(ts * 1000)
            return {
              name: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              value: closes[i] ? Math.round(closes[i] * 100) / 100 : null,
            }
          })
          .filter((d: { value: number | null }) => d.value !== null)

        const startPrice = closes.find((c: number | null) => c !== null) || 0
        const endPrice = closes.filter((c: number | null) => c !== null).pop() || 0
        const totalChange = ((endPrice - startPrice) / startPrice) * 100

        const widget = {
          type: 'chart',
          title: `${result.meta.shortName || symbol} (${period.toUpperCase()})`,
          chartType,
          data: chartData,
          color: endPrice >= startPrice ? '#10b981' : '#ef4444',
        }

        return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->

${symbol}: ${totalChange >= 0 ? '+' : ''}${formatNumber(totalChange)}%`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'inline_stock_with_ma',
    description:
      'Zeigt Aktienkurs MIT Moving Average als zwei Linien im Chat. Ideal für Trendanalysen.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Ticker-Symbol der Aktie',
        },
        period: {
          type: 'string',
          description: 'Zeitraum für den Chart',
          enum: ['1m', '3m', '6m', '1y'],
        },
        ma_days: {
          type: 'number',
          description: 'Anzahl Tage für Moving Average (Standard: 20)',
        },
      },
      required: ['symbol', 'period'],
    },
    execute: async (args) => {
      const symbol = (args.symbol as string).toUpperCase()
      const period = args.period as string
      const maDays = (args.ma_days as number) || 20

      const rangeMap: Record<string, { range: string; interval: string }> = {
        '1m': { range: '1mo', interval: '1d' },
        '3m': { range: '3mo', interval: '1d' },
        '6m': { range: '6mo', interval: '1d' },
        '1y': { range: '1y', interval: '1d' },
      }

      const { range, interval } = rangeMap[period] || rangeMap['3m']

      try {
        const response = await fetchWithCorsProxy(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
        )

        if (!response.ok) {
          return `Aktie "${symbol}" nicht gefunden.`
        }

        const data = await response.json()
        const result = data.chart?.result?.[0]

        if (!result) {
          return `Keine Daten für "${symbol}" verfügbar.`
        }

        const timestamps = result.timestamp || []
        const closes: number[] = result.indicators?.quote?.[0]?.close || []

        // Filter out null values and get valid closes
        const validCloses = closes.map((c: number | null) => c ?? 0)
        const maValues = calculateMA(validCloses, maDays)

        // Sample data points for readability (max 40 points)
        const step = Math.max(1, Math.floor(timestamps.length / 40))

        const chartData = timestamps
          .map((ts: number, i: number) => {
            if (closes[i] === null) return null
            const date = new Date(ts * 1000)
            return {
              name: date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              price: Math.round(closes[i] * 100) / 100,
              ma: maValues[i],
            }
          })
          .filter((_: unknown, i: number) => i % step === 0)
          .filter((d: unknown) => d !== null)

        const startPrice = validCloses.find((c: number) => c > 0) || 0
        const endPrice = validCloses.filter((c: number) => c > 0).pop() || 0
        const totalChange = ((endPrice - startPrice) / startPrice) * 100

        const widget = {
          type: 'chart',
          title: `${result.meta.shortName || symbol} + ${maDays}-Tage MA`,
          chartType: 'line' as ChartType,
          data: chartData,
          yKeys: ['price', 'ma'],
          lineStyles: { ma: 'dashed' as LineStyle },
          color: '#8b5cf6',
        }

        return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->

${symbol}: ${totalChange >= 0 ? '+' : ''}${formatNumber(totalChange)}% | MA${maDays}`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'inline_crypto_chart',
    description:
      'Zeigt Kryptowährungs-Chart DIREKT im Chat an. Holt Daten automatisch von CoinGecko.',
    parameters: {
      type: 'object',
      properties: {
        coin: {
          type: 'string',
          description: 'Coin-ID (z.B. bitcoin, ethereum, solana, cardano)',
        },
        days: {
          type: 'number',
          description: 'Anzahl Tage (7, 30, 90, 365)',
        },
      },
      required: ['coin', 'days'],
    },
    execute: async (args) => {
      const coin = (args.coin as string).toLowerCase()
      const days = Math.min(args.days as number, 365)

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=eur&days=${days}`
        )

        if (!response.ok) {
          return `Crypto "${coin}" nicht gefunden. Versuche den englischen Namen.`
        }

        const data = await response.json()
        const prices: [number, number][] = data.prices || []

        // Sample data points (max 30 for readability)
        const step = Math.max(1, Math.floor(prices.length / 30))
        const chartData = prices
          .filter((_: [number, number], i: number) => i % step === 0)
          .map((p: [number, number]) => ({
            name: new Date(p[0]).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
            value: Math.round(p[1] * 100) / 100,
          }))

        const startPrice = prices[0]?.[1] || 0
        const endPrice = prices[prices.length - 1]?.[1] || 0
        const totalChange = ((endPrice - startPrice) / startPrice) * 100

        const widget = {
          type: 'chart',
          title: `${coin.charAt(0).toUpperCase() + coin.slice(1)} (${days}d)`,
          chartType: 'area' as ChartType,
          data: chartData,
          color: endPrice >= startPrice ? '#10b981' : '#ef4444',
        }

        return `<!-- INLINE_WIDGET:${JSON.stringify(widget)} -->

${coin}: ${totalChange >= 0 ? '+' : ''}${formatNumber(totalChange)}%`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },
]

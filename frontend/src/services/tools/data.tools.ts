import type { AITool } from './types'
import { useAIDashboardStore, type ChartType } from '@/stores/aiDashboardStore'

/**
 * Data Tools - External data fetching for stocks, weather, crypto, etc.
 * Uses free APIs that don't require API keys where possible
 */

// CORS Proxy for APIs that don't support CORS (like Yahoo Finance)
const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
]

// Helper to fetch with CORS proxy fallback - tries multiple proxies
const fetchWithCorsProxy = async (url: string, useProxy = true): Promise<Response> => {
  if (!useProxy) {
    return fetch(url)
  }

  // Try each proxy in order until one works
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(`${proxy}${encodeURIComponent(url)}`)
      if (response.ok) {
        return response
      }
    } catch (e) {
      console.warn(`Proxy ${proxy} failed:`, e)
    }
  }

  // Last resort: try direct fetch (might fail due to CORS)
  return fetch(url)
}

// Helper to format numbers
const formatNumber = (num: number, decimals = 2) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)

const formatCurrency = (num: number, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(num)

export const dataTools: AITool[] = [
  // ==================== STOCK TOOLS ====================
  {
    name: 'get_stock_quote',
    description:
      'Ruft den aktuellen Aktienkurs und Marktdaten für ein Ticker-Symbol ab. Gibt Preis, Veränderung, Volumen und weitere Kennzahlen zurück.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Das Ticker-Symbol der Aktie (z.B. AAPL, MSFT, GOOGL, SAP.DE für deutsche Aktien)',
        },
      },
      required: ['symbol'],
    },
    execute: async (args) => {
      const symbol = (args.symbol as string).toUpperCase()

      try {
        // Using Yahoo Finance via CORS proxy
        const response = await fetchWithCorsProxy(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
        )

        if (!response.ok) {
          return `Aktie "${symbol}" nicht gefunden. Prüfe das Ticker-Symbol.`
        }

        const data = await response.json()
        const result = data.chart?.result?.[0]

        if (!result) {
          return `Keine Daten für "${symbol}" verfügbar.`
        }

        const meta = result.meta
        const quote = result.indicators?.quote?.[0]
        const closes = quote?.close?.filter((c: number | null) => c !== null) || []
        const currentPrice = meta.regularMarketPrice || closes[closes.length - 1]
        const previousClose = meta.previousClose || closes[closes.length - 2]
        const change = currentPrice - previousClose
        const changePercent = (change / previousClose) * 100

        return `📈 **${meta.shortName || symbol}** (${symbol})

**Aktueller Kurs:** ${formatCurrency(currentPrice, meta.currency)}
**Veränderung:** ${change >= 0 ? '+' : ''}${formatCurrency(change, meta.currency)} (${change >= 0 ? '+' : ''}${formatNumber(changePercent)}%)
**Tageshoch:** ${formatCurrency(meta.regularMarketDayHigh || Math.max(...closes), meta.currency)}
**Tagestief:** ${formatCurrency(meta.regularMarketDayLow || Math.min(...closes), meta.currency)}
**Volumen:** ${formatNumber(meta.regularMarketVolume || 0, 0)}
**Börse:** ${meta.exchangeName}
**Währung:** ${meta.currency}`
      } catch (error) {
        return `Fehler beim Abrufen der Aktiendaten: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'get_stock_history',
    description:
      'Ruft historische Kursdaten einer Aktie ab und zeigt sie als Chart im Dashboard. Ideal für Kursanalysen.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Das Ticker-Symbol der Aktie',
        },
        period: {
          type: 'string',
          description: 'Zeitraum für die Historie',
          enum: ['1w', '1m', '3m', '6m', '1y', '5y'],
        },
      },
      required: ['symbol', 'period'],
    },
    execute: async (args, ctx) => {
      const symbol = (args.symbol as string).toUpperCase()
      const period = args.period as string

      const rangeMap: Record<string, { range: string; interval: string }> = {
        '1w': { range: '5d', interval: '1d' },
        '1m': { range: '1mo', interval: '1d' },
        '3m': { range: '3mo', interval: '1d' },
        '6m': { range: '6mo', interval: '1wk' },
        '1y': { range: '1y', interval: '1wk' },
        '5y': { range: '5y', interval: '1mo' },
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
          return `Keine historischen Daten für "${symbol}" verfügbar.`
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

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'chart',
          title: `${result.meta.shortName || symbol} - ${period.toUpperCase()}`,
          chartType: 'area',
          data: chartData,
          color: closes[closes.length - 1] >= closes[0] ? '#10b981' : '#ef4444',
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        const startPrice = closes[0]
        const endPrice = closes[closes.length - 1]
        const totalChange = ((endPrice - startPrice) / startPrice) * 100

        return `Kursverlauf für ${symbol} (${period}) wurde im Dashboard angezeigt. Gesamtveränderung: ${totalChange >= 0 ? '+' : ''}${formatNumber(totalChange)}%`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'compare_stocks',
    description:
      'Vergleicht mehrere Aktien miteinander und zeigt die Performance als Chart. Maximal 5 Aktien.',
    parameters: {
      type: 'object',
      properties: {
        symbols: {
          type: 'string',
          description: 'Komma-getrennte Liste von Ticker-Symbolen (z.B. "AAPL,MSFT,GOOGL")',
        },
        period: {
          type: 'string',
          description: 'Zeitraum für den Vergleich',
          enum: ['1m', '3m', '6m', '1y'],
        },
      },
      required: ['symbols', 'period'],
    },
    execute: async (args, ctx) => {
      const symbols = (args.symbols as string).toUpperCase().split(',').map(s => s.trim()).slice(0, 5)
      const period = args.period as string

      const rangeMap: Record<string, string> = {
        '1m': '1mo',
        '3m': '3mo',
        '6m': '6mo',
        '1y': '1y',
      }

      try {
        const results = await Promise.all(
          symbols.map(async (symbol) => {
            const response = await fetchWithCorsProxy(
              `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${rangeMap[period]}`
            )
            if (!response.ok) return null
            const data = await response.json()
            return { symbol, data: data.chart?.result?.[0] }
          })
        )

        const validResults = results.filter(r => r?.data)
        if (validResults.length === 0) {
          return 'Keine gültigen Aktiendaten gefunden.'
        }

        // Normalize to percentage change from start
        const tableData: string[][] = [['Aktie', 'Start', 'Aktuell', 'Veränderung']]

        validResults.forEach(r => {
          if (!r?.data) return
          const closes = r.data.indicators?.quote?.[0]?.close?.filter((c: number | null) => c !== null) || []
          const start = closes[0]
          const end = closes[closes.length - 1]
          const change = ((end - start) / start) * 100

          tableData.push([
            r.symbol,
            formatCurrency(start, r.data.meta.currency),
            formatCurrency(end, r.data.meta.currency),
            `${change >= 0 ? '+' : ''}${formatNumber(change)}%`,
          ])
        })

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'table',
          title: `Aktienvergleich (${period.toUpperCase()})`,
          data: tableData,
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        return `Vergleich von ${validResults.length} Aktien wurde im Dashboard angezeigt.`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  // ==================== WEATHER TOOLS ====================
  {
    name: 'get_weather',
    description:
      'Ruft das aktuelle Wetter für eine Stadt ab. Zeigt Temperatur, Wetterlage, Luftfeuchtigkeit und Wind.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Name der Stadt (z.B. Berlin, München, Hamburg)',
        },
      },
      required: ['city'],
    },
    execute: async (args) => {
      const city = args.city as string

      try {
        // Using wttr.in - free, no API key needed
        const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)

        if (!response.ok) {
          return `Wetterdaten für "${city}" nicht gefunden.`
        }

        const data = await response.json()
        const current = data.current_condition?.[0]
        const area = data.nearest_area?.[0]

        if (!current) {
          return `Keine Wetterdaten für "${city}" verfügbar.`
        }

        const weatherDesc = current.lang_de?.[0]?.value || current.weatherDesc?.[0]?.value || 'Unbekannt'
        const areaName = area?.areaName?.[0]?.value || city
        const country = area?.country?.[0]?.value || ''

        return `🌤️ **Wetter in ${areaName}${country ? `, ${country}` : ''}**

**Temperatur:** ${current.temp_C}°C (gefühlt ${current.FeelsLikeC}°C)
**Wetterlage:** ${weatherDesc}
**Luftfeuchtigkeit:** ${current.humidity}%
**Wind:** ${current.windspeedKmph} km/h aus ${current.winddir16Point}
**Sichtweite:** ${current.visibility} km
**UV-Index:** ${current.uvIndex}
**Luftdruck:** ${current.pressure} hPa`
      } catch (error) {
        return `Fehler beim Abrufen der Wetterdaten: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'get_weather_forecast',
    description:
      'Ruft die Wettervorhersage für die nächsten Tage ab und zeigt sie als Chart im Dashboard.',
    parameters: {
      type: 'object',
      properties: {
        city: {
          type: 'string',
          description: 'Name der Stadt',
        },
      },
      required: ['city'],
    },
    execute: async (args, ctx) => {
      const city = args.city as string

      try {
        const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`)

        if (!response.ok) {
          return `Wetterdaten für "${city}" nicht gefunden.`
        }

        const data = await response.json()
        const forecast = data.weather || []
        const areaName = data.nearest_area?.[0]?.areaName?.[0]?.value || city

        if (forecast.length === 0) {
          return `Keine Vorhersagedaten verfügbar.`
        }

        const chartData = forecast.map((day: { date: string; maxtempC: string; mintempC: string }) => ({
          name: new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' }),
          value: Math.round((parseFloat(day.maxtempC) + parseFloat(day.mintempC)) / 2),
        }))

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'chart',
          title: `Wettervorhersage ${areaName}`,
          chartType: 'line',
          data: chartData,
          color: '#f59e0b',
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        // Also create info card with details
        const forecastInfo = forecast
          .map((day: { date: string; maxtempC: string; mintempC: string; hourly: Array<{ lang_de?: Array<{ value: string }>; weatherDesc?: Array<{ value: string }> }> }) => {
            const date = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' })
            const desc = day.hourly?.[4]?.lang_de?.[0]?.value || day.hourly?.[4]?.weatherDesc?.[0]?.value || ''
            return `**${date}:** ${day.mintempC}°C - ${day.maxtempC}°C, ${desc}`
          })
          .join('\n')

        addWidget({
          type: 'info',
          title: `Vorhersage Details`,
          data: forecastInfo,
        })

        return `Wettervorhersage für ${areaName} wurde im Dashboard angezeigt.`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  // ==================== CRYPTO TOOLS ====================
  {
    name: 'get_crypto_price',
    description:
      'Ruft den aktuellen Preis und Marktdaten für eine Kryptowährung ab.',
    parameters: {
      type: 'object',
      properties: {
        coin: {
          type: 'string',
          description: 'Name oder ID der Kryptowährung (z.B. bitcoin, ethereum, solana, cardano)',
        },
      },
      required: ['coin'],
    },
    execute: async (args) => {
      const coin = (args.coin as string).toLowerCase()

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&community_data=false&developer_data=false`
        )

        if (!response.ok) {
          return `Kryptowährung "${coin}" nicht gefunden. Versuche den englischen Namen (z.B. bitcoin, ethereum).`
        }

        const data = await response.json()
        const price = data.market_data?.current_price?.eur
        const change24h = data.market_data?.price_change_percentage_24h
        const change7d = data.market_data?.price_change_percentage_7d
        const marketCap = data.market_data?.market_cap?.eur
        const volume = data.market_data?.total_volume?.eur

        return `🪙 **${data.name}** (${data.symbol?.toUpperCase()})

**Preis:** ${formatCurrency(price)}
**24h Veränderung:** ${change24h >= 0 ? '+' : ''}${formatNumber(change24h)}%
**7d Veränderung:** ${change7d >= 0 ? '+' : ''}${formatNumber(change7d)}%
**Marktkapitalisierung:** ${formatCurrency(marketCap)}
**24h Volumen:** ${formatCurrency(volume)}
**Marktrang:** #${data.market_cap_rank}`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'get_crypto_chart',
    description:
      'Zeigt den Kursverlauf einer Kryptowährung als Chart im Dashboard.',
    parameters: {
      type: 'object',
      properties: {
        coin: {
          type: 'string',
          description: 'Name der Kryptowährung (z.B. bitcoin, ethereum)',
        },
        days: {
          type: 'number',
          description: 'Anzahl der Tage (7, 30, 90, 365)',
        },
      },
      required: ['coin', 'days'],
    },
    execute: async (args, ctx) => {
      const coin = (args.coin as string).toLowerCase()
      const days = Math.min(args.days as number, 365)

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=eur&days=${days}`
        )

        if (!response.ok) {
          return `Keine Daten für "${coin}" gefunden.`
        }

        const data = await response.json()
        const prices = data.prices || []

        // Sample data points (max 30 for readability)
        const step = Math.max(1, Math.floor(prices.length / 30))
        const chartData = prices
          .filter((_: [number, number], i: number) => i % step === 0)
          .map((p: [number, number]) => ({
            name: new Date(p[0]).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
            value: Math.round(p[1] * 100) / 100,
          }))

        const startPrice = prices[0]?.[1]
        const endPrice = prices[prices.length - 1]?.[1]

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'chart',
          title: `${coin.charAt(0).toUpperCase() + coin.slice(1)} - ${days} Tage`,
          chartType: 'area',
          data: chartData,
          color: endPrice >= startPrice ? '#10b981' : '#ef4444',
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        const change = ((endPrice - startPrice) / startPrice) * 100
        return `Chart für ${coin} wurde erstellt. Veränderung: ${change >= 0 ? '+' : ''}${formatNumber(change)}%`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  // ==================== EXCHANGE RATES ====================
  {
    name: 'get_exchange_rates',
    description:
      'Ruft aktuelle Wechselkurse für eine Währung ab.',
    parameters: {
      type: 'object',
      properties: {
        base: {
          type: 'string',
          description: 'Basiswährung (z.B. EUR, USD, GBP, CHF)',
        },
        targets: {
          type: 'string',
          description: 'Zielwährungen, komma-getrennt (z.B. "USD,GBP,CHF,JPY")',
        },
      },
      required: ['base'],
    },
    execute: async (args, ctx) => {
      const base = (args.base as string).toUpperCase()
      const targets = args.targets
        ? (args.targets as string).toUpperCase().split(',').map(t => t.trim())
        : ['USD', 'GBP', 'CHF', 'JPY', 'CNY']

      try {
        // Using Frankfurter API - free, no key needed
        const response = await fetch(
          `https://api.frankfurter.app/latest?from=${base}&to=${targets.join(',')}`
        )

        if (!response.ok) {
          return `Wechselkurse für "${base}" nicht verfügbar.`
        }

        const data = await response.json()
        const rates = data.rates || {}

        const tableData: string[][] = [['Währung', 'Kurs', `1 ${base} =`]]
        Object.entries(rates).forEach(([currency, rate]) => {
          tableData.push([currency, formatNumber(rate as number, 4), `${formatNumber(rate as number, 2)} ${currency}`])
        })

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'table',
          title: `Wechselkurse ${base}`,
          data: tableData,
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        return `Wechselkurse für ${base} wurden im Dashboard angezeigt. Stand: ${data.date}`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  // ==================== NEWS / OPEN DATA ====================
  {
    name: 'get_top_cryptos',
    description:
      'Zeigt die Top Kryptowährungen nach Marktkapitalisierung als Tabelle.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Anzahl der Kryptowährungen (max 20)',
        },
      },
      required: [],
    },
    execute: async (args, ctx) => {
      const limit = Math.min((args.limit as number) || 10, 20)

      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=eur&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
        )

        if (!response.ok) {
          return 'Fehler beim Abrufen der Crypto-Daten.'
        }

        const data = await response.json()

        const tableData: string[][] = [['#', 'Name', 'Preis', '24h %', 'Marktk.']]
        data.forEach((coin: { market_cap_rank: number; name: string; symbol: string; current_price: number; price_change_percentage_24h: number; market_cap: number }) => {
          const change = coin.price_change_percentage_24h || 0
          tableData.push([
            `${coin.market_cap_rank}`,
            `${coin.name} (${coin.symbol.toUpperCase()})`,
            formatCurrency(coin.current_price),
            `${change >= 0 ? '+' : ''}${formatNumber(change)}%`,
            `${formatNumber(coin.market_cap / 1e9, 1)}B€`,
          ])
        })

        const { addWidget } = useAIDashboardStore.getState()
        addWidget({
          type: 'table',
          title: `Top ${limit} Kryptowährungen`,
          data: tableData,
        })

        ctx.openWindow('aidashboard')
        ctx.onClose()

        return `Top ${limit} Kryptowährungen wurden im Dashboard angezeigt.`
      } catch (error) {
        return `Fehler: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  // ==================== MULTI-CHART TOOLS ====================
  {
    name: 'create_multi_stock_charts',
    description:
      'Erstellt mehrere Aktien-Charts gleichzeitig im Dashboard. Ideal für Portfolio-Übersichten oder Vergleiche.',
    parameters: {
      type: 'object',
      properties: {
        symbols: {
          type: 'string',
          description: 'Komma-getrennte Ticker-Symbole (z.B. "AAPL,MSFT,GOOGL,AMZN")',
        },
        period: {
          type: 'string',
          description: 'Zeitraum für alle Charts',
          enum: ['1m', '3m', '6m', '1y'],
        },
        chart_type: {
          type: 'string',
          description: 'Chart-Typ für alle Diagramme',
          enum: ['line', 'area', 'bar'],
        },
      },
      required: ['symbols', 'period'],
    },
    execute: async (args, ctx) => {
      const symbols = (args.symbols as string).toUpperCase().split(',').map(s => s.trim())
      const period = args.period as string
      const chartType = (args.chart_type as ChartType) || 'area'

      const rangeMap: Record<string, { range: string; interval: string }> = {
        '1m': { range: '1mo', interval: '1d' },
        '3m': { range: '3mo', interval: '1d' },
        '6m': { range: '6mo', interval: '1wk' },
        '1y': { range: '1y', interval: '1wk' },
      }

      const { range, interval } = rangeMap[period] || rangeMap['1m']
      const { addWidget } = useAIDashboardStore.getState()

      const results = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const response = await fetchWithCorsProxy(
              `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
            )
            if (!response.ok) return { symbol, success: false }

            const data = await response.json()
            const result = data.chart?.result?.[0]
            if (!result) return { symbol, success: false }

            const timestamps = result.timestamp || []
            const closes = result.indicators?.quote?.[0]?.close || []

            const chartData = timestamps
              .map((ts: number, i: number) => ({
                name: new Date(ts * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
                value: closes[i] ? Math.round(closes[i] * 100) / 100 : null,
              }))
              .filter((d: { value: number | null }) => d.value !== null)

            const startPrice = closes.find((c: number | null) => c !== null)
            const endPrice = closes.filter((c: number | null) => c !== null).pop()
            const isPositive = endPrice >= startPrice

            addWidget({
              type: 'chart',
              title: `${result.meta.shortName || symbol}`,
              chartType,
              data: chartData,
              color: isPositive ? '#10b981' : '#ef4444',
            })

            return { symbol, success: true }
          } catch {
            return { symbol, success: false }
          }
        })
      )

      ctx.openWindow('aidashboard')
      ctx.onClose()

      const successful = results.filter(r => r.success).length
      return `${successful} von ${symbols.length} Charts wurden erstellt.`
    },
  },

  {
    name: 'create_market_dashboard',
    description:
      'Erstellt ein komplettes Markt-Dashboard mit Aktien, Crypto und Wechselkursen in einem Aufruf.',
    parameters: {
      type: 'object',
      properties: {
        stocks: {
          type: 'string',
          description: 'Aktien-Symbole, komma-getrennt (z.B. "AAPL,MSFT")',
        },
        cryptos: {
          type: 'string',
          description: 'Kryptowährungen, komma-getrennt (z.B. "bitcoin,ethereum")',
        },
        include_forex: {
          type: 'boolean',
          description: 'Wechselkurse einbeziehen (EUR-Basis)',
        },
      },
      required: [],
    },
    execute: async (args, ctx) => {
      const stocks = args.stocks ? (args.stocks as string).toUpperCase().split(',').map(s => s.trim()) : []
      const cryptos = args.cryptos ? (args.cryptos as string).toLowerCase().split(',').map(s => s.trim()) : []
      const includeForex = args.include_forex as boolean

      const { addWidget, clearWidgets } = useAIDashboardStore.getState()
      clearWidgets() // Start fresh

      let widgetCount = 0

      // Fetch stocks
      for (const symbol of stocks.slice(0, 4)) {
        try {
          const response = await fetchWithCorsProxy(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`
          )
          if (!response.ok) continue

          const data = await response.json()
          const result = data.chart?.result?.[0]
          if (!result) continue

          const closes = result.indicators?.quote?.[0]?.close?.filter((c: number | null) => c !== null) || []
          const chartData = closes.slice(-20).map((value: number, i: number) => ({
            name: `${i + 1}`,
            value: Math.round(value * 100) / 100,
          }))

          addWidget({
            type: 'chart',
            title: `📈 ${result.meta.shortName || symbol}`,
            chartType: 'area',
            data: chartData,
            color: closes[closes.length - 1] >= closes[0] ? '#10b981' : '#ef4444',
          })
          widgetCount++
        } catch {
          // Skip failed stocks
        }
      }

      // Fetch cryptos
      for (const coin of cryptos.slice(0, 4)) {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=eur&days=30`
          )
          if (!response.ok) continue

          const data = await response.json()
          const prices = data.prices || []
          const step = Math.max(1, Math.floor(prices.length / 20))
          const chartData = prices
            .filter((_: [number, number], i: number) => i % step === 0)
            .map((p: [number, number]) => ({
              name: new Date(p[0]).toLocaleDateString('de-DE', { day: '2-digit' }),
              value: Math.round(p[1] * 100) / 100,
            }))

          const startPrice = prices[0]?.[1]
          const endPrice = prices[prices.length - 1]?.[1]

          addWidget({
            type: 'chart',
            title: `🪙 ${coin.charAt(0).toUpperCase() + coin.slice(1)}`,
            chartType: 'line',
            data: chartData,
            color: endPrice >= startPrice ? '#10b981' : '#ef4444',
          })
          widgetCount++
        } catch {
          // Skip failed cryptos
        }
      }

      // Fetch forex if requested
      if (includeForex) {
        try {
          const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY')
          if (response.ok) {
            const data = await response.json()
            const tableData: string[][] = [['Währung', 'Kurs']]
            Object.entries(data.rates || {}).forEach(([currency, rate]) => {
              tableData.push([currency, formatNumber(rate as number, 4)])
            })

            addWidget({
              type: 'table',
              title: '💱 EUR Wechselkurse',
              data: tableData,
            })
            widgetCount++
          }
        } catch {
          // Skip forex on error
        }
      }

      ctx.openWindow('aidashboard')
      ctx.onClose()

      return `Markt-Dashboard mit ${widgetCount} Widgets erstellt.`
    },
  },

  {
    name: 'create_crypto_overview',
    description:
      'Erstellt eine Übersicht mit Charts für mehrere Kryptowährungen gleichzeitig.',
    parameters: {
      type: 'object',
      properties: {
        coins: {
          type: 'string',
          description: 'Kryptowährungen, komma-getrennt (z.B. "bitcoin,ethereum,solana,cardano")',
        },
        days: {
          type: 'number',
          description: 'Zeitraum in Tagen (7, 30, 90)',
        },
      },
      required: ['coins'],
    },
    execute: async (args, ctx) => {
      const coins = (args.coins as string).toLowerCase().split(',').map(s => s.trim())
      const days = Math.min((args.days as number) || 30, 90)

      const { addWidget } = useAIDashboardStore.getState()
      let created = 0

      for (const coin of coins.slice(0, 6)) {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=eur&days=${days}`
          )
          if (!response.ok) continue

          const data = await response.json()
          const prices = data.prices || []

          const step = Math.max(1, Math.floor(prices.length / 25))
          const chartData = prices
            .filter((_: [number, number], i: number) => i % step === 0)
            .map((p: [number, number]) => ({
              name: new Date(p[0]).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              value: Math.round(p[1] * 100) / 100,
            }))

          const startPrice = prices[0]?.[1]
          const endPrice = prices[prices.length - 1]?.[1]
          const change = ((endPrice - startPrice) / startPrice) * 100

          addWidget({
            type: 'chart',
            title: `${coin.charAt(0).toUpperCase() + coin.slice(1)} (${change >= 0 ? '+' : ''}${formatNumber(change)}%)`,
            chartType: 'area',
            data: chartData,
            color: endPrice >= startPrice ? '#10b981' : '#ef4444',
          })
          created++
        } catch {
          // Skip failed coins
        }
      }

      ctx.openWindow('aidashboard')
      ctx.onClose()

      return `${created} Crypto-Charts wurden erstellt.`
    },
  },
]

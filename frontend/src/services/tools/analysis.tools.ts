import type { AITool } from './types'
import { useAIDashboardStore, type ChartDataPoint } from '@/stores/aiDashboardStore'

/**
 * Analysis Tools - Statistical analysis, regression models, and forecasting
 */

// CORS Proxy for external APIs - with fallback options
const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
]

const fetchWithProxy = async (url: string): Promise<Response> => {
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

// ==================== MATH HELPERS ====================

/**
 * Calculate mean of an array
 */
function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

/**
 * Calculate standard deviation
 */
function stdDev(arr: number[]): number {
  const avg = mean(arr)
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2))
  return Math.sqrt(mean(squareDiffs))
}

/**
 * Linear Regression using Ordinary Least Squares
 */
function calculateLinearRegression(x: number[], y: number[]): {
  slope: number
  intercept: number
  r2: number
  predictions: number[]
  rmse: number
} {
  const n = x.length
  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((a, b) => a + b * b, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Predictions
  const predictions = x.map(xi => slope * xi + intercept)

  // R-squared
  const yMean = mean(y)
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0)
  const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - predictions[i], 2), 0)
  const r2 = 1 - ssResidual / ssTotal

  // RMSE
  const rmse = Math.sqrt(ssResidual / n)

  return { slope, intercept, r2, predictions, rmse }
}

/**
 * Moving Average calculation
 */
function calculateMovingAverage(data: number[], windowSize: number): number[] {
  const result: number[] = []
  for (let i = 0; i < data.length; i++) {
    if (i < windowSize - 1) {
      result.push(NaN) // Not enough data points yet
    } else {
      const window = data.slice(i - windowSize + 1, i + 1)
      result.push(mean(window))
    }
  }
  return result
}

/**
 * Simple Autoregressive Model (AR)
 * Predicts based on weighted sum of past values
 */
function calculateAR(data: number[], lagOrder: number): {
  coefficients: number[]
  predictions: number[]
  rmse: number
} {
  // Build X matrix (lagged values) and y vector
  const X: number[][] = []
  const y: number[] = []

  for (let i = lagOrder; i < data.length; i++) {
    const row: number[] = []
    for (let j = 1; j <= lagOrder; j++) {
      row.push(data[i - j])
    }
    X.push(row)
    y.push(data[i])
  }

  // Simple coefficient estimation using correlation
  // (Full OLS would require matrix inversion)
  const coefficients: number[] = []
  for (let j = 0; j < lagOrder; j++) {
    const lagValues = X.map(row => row[j])
    const correlation = calculateCorrelation(lagValues, y)
    coefficients.push(correlation / lagOrder) // Simplified weighting
  }

  // Normalize coefficients to sum to ~1
  const sumCoef = coefficients.reduce((a, b) => Math.abs(a) + Math.abs(b), 0)
  const normalizedCoef = coefficients.map(c => c / sumCoef)

  // Generate predictions
  const predictions: number[] = []
  for (let i = lagOrder; i < data.length; i++) {
    let pred = 0
    for (let j = 0; j < lagOrder; j++) {
      pred += normalizedCoef[j] * data[i - j - 1]
    }
    predictions.push(pred)
  }

  // RMSE
  const errors = y.map((yi, i) => Math.pow(yi - predictions[i], 2))
  const rmse = Math.sqrt(mean(errors))

  return { coefficients: normalizedCoef, predictions, rmse }
}

/**
 * Calculate correlation between two arrays
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length
  const xMean = mean(x)
  const yMean = mean(y)

  let numerator = 0
  let sumX2 = 0
  let sumY2 = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - xMean
    const dy = y[i] - yMean
    numerator += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  return numerator / Math.sqrt(sumX2 * sumY2)
}

/**
 * Forecast future values using linear regression
 */
function forecastLinear(slope: number, intercept: number, startX: number, periods: number): number[] {
  const forecasts: number[] = []
  for (let i = 1; i <= periods; i++) {
    forecasts.push(slope * (startX + i) + intercept)
  }
  return forecasts
}

/**
 * Forecast using Moving Average (simple continuation)
 */
function forecastMA(data: number[], windowSize: number, periods: number): number[] {
  const lastWindow = data.slice(-windowSize)
  const forecasts: number[] = []

  for (let i = 0; i < periods; i++) {
    const avg = mean(lastWindow)
    forecasts.push(avg)
    lastWindow.shift()
    lastWindow.push(avg)
  }

  return forecasts
}

/**
 * Forecast using AR model
 */
function forecastAR(data: number[], coefficients: number[], periods: number): number[] {
  const extended = [...data]
  const forecasts: number[] = []

  for (let i = 0; i < periods; i++) {
    let pred = 0
    for (let j = 0; j < coefficients.length; j++) {
      pred += coefficients[j] * extended[extended.length - j - 1]
    }
    forecasts.push(pred)
    extended.push(pred)
  }

  return forecasts
}

// Helper to format numbers
const formatNumber = (num: number, decimals = 2) =>
  new Intl.NumberFormat('de-DE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(num)

const formatPercent = (num: number) =>
  (num >= 0 ? '+' : '') + formatNumber(num, 2) + '%'

// ==================== ANALYSIS TOOLS ====================

export const analysisTools: AITool[] = [
  {
    name: 'linear_regression',
    description: 'Führt eine lineare Regression auf Daten durch. Zeigt Regressionslinie, R², Steigung und optional Prognose. Daten als JSON-Array von [x, y] Paaren oder Objekten mit x/y Keys.',
    parameters: {
      type: 'object',
      properties: {
        data_json: {
          type: 'string',
          description: 'JSON-Array der Datenpunkte, z.B. [[1,10],[2,20]] oder [{"x":1,"y":10},{"x":2,"y":20}]',
        },
        title: {
          type: 'string',
          description: 'Titel für das Chart (optional)',
        },
        forecast_periods: {
          type: 'number',
          description: 'Anzahl der Perioden für Prognose (optional, default: 0)',
        },
      },
      required: ['data_json'],
    },
    execute: async (args, ctx) => {
      try {
        const rawData = JSON.parse(args.data_json as string)
        const title = (args.title as string) || 'Lineare Regression'
        const forecastPeriods = (args.forecast_periods as number) || 0

        // Parse data to x, y arrays
        let x: number[] = []
        let y: number[] = []

        if (Array.isArray(rawData[0])) {
          // Format: [[x, y], ...]
          x = rawData.map((p: number[]) => p[0])
          y = rawData.map((p: number[]) => p[1])
        } else {
          // Format: [{x: ..., y: ...}, ...]
          x = rawData.map((p: { x: number }) => p.x)
          y = rawData.map((p: { y: number }) => p.y)
        }

        // Calculate regression
        const regression = calculateLinearRegression(x, y)

        // Build chart data
        const chartData: ChartDataPoint[] = x.map((xi, i) => ({
          name: String(xi),
          original: y[i],
          regression: Number(regression.predictions[i].toFixed(2)),
        }))

        // Add forecast if requested
        if (forecastPeriods > 0) {
          const lastX = x[x.length - 1]
          const forecasts = forecastLinear(regression.slope, regression.intercept, lastX, forecastPeriods)
          forecasts.forEach((f, i) => {
            chartData.push({
              name: String(lastX + i + 1),
              original: undefined,
              regression: undefined,
              forecast: Number(f.toFixed(2)),
            })
          })
        }

        // Add chart widget
        const dashboardStore = useAIDashboardStore.getState()
        dashboardStore.addWidget({
          type: 'chart',
          chartType: 'line',
          title,
          data: chartData,
          yKeys: ['original', 'regression', ...(forecastPeriods > 0 ? ['forecast'] : [])],
          lineStyles: { regression: 'dashed', forecast: 'dotted' },
          color: '#8b5cf6',
        })

        // Add statistics table
        const lastY = y[y.length - 1]
        const forecastChange = forecastPeriods > 0
          ? ((chartData[chartData.length - 1] as { forecast?: number }).forecast! - lastY) / lastY * 100
          : 0

        dashboardStore.addWidget({
          type: 'table',
          title: 'Regression Statistiken',
          data: [
            ['Metrik', 'Wert'],
            ['R²', formatNumber(regression.r2, 4)],
            ['Steigung', formatNumber(regression.slope, 4)],
            ['Y-Achsenabschnitt', formatNumber(regression.intercept, 2)],
            ['RMSE', formatNumber(regression.rmse, 4)],
            ...(forecastPeriods > 0 ? [['Prognose-Änderung', formatPercent(forecastChange)]] : []),
          ],
        })

        ctx.openWindow('aidashboard')
        return `Lineare Regression berechnet. R² = ${formatNumber(regression.r2, 4)}, Steigung = ${formatNumber(regression.slope, 4)}${forecastPeriods > 0 ? `, Prognose für ${forecastPeriods} Perioden erstellt.` : ''}`
      } catch (error) {
        return `Fehler bei der Regression: ${error instanceof Error ? error.message : 'Ungültiges Datenformat'}`
      }
    },
  },

  {
    name: 'moving_average',
    description: 'Berechnet den gleitenden Durchschnitt (Moving Average) einer Zeitreihe. Ideal für Trendglättung und kurzfristige Prognosen.',
    parameters: {
      type: 'object',
      properties: {
        data_json: {
          type: 'string',
          description: 'JSON-Array der Werte, z.B. [10, 12, 15, 14, 16, 18]',
        },
        window_size: {
          type: 'number',
          description: 'Fenstergröße für den gleitenden Durchschnitt (z.B. 5, 7, 14)',
        },
        title: {
          type: 'string',
          description: 'Titel für das Chart (optional)',
        },
        forecast_periods: {
          type: 'number',
          description: 'Anzahl der Perioden für Prognose (optional, default: 0)',
        },
      },
      required: ['data_json', 'window_size'],
    },
    execute: async (args, ctx) => {
      try {
        const data: number[] = JSON.parse(args.data_json as string)
        const windowSize = args.window_size as number
        const title = (args.title as string) || `Moving Average (${windowSize})`
        const forecastPeriods = (args.forecast_periods as number) || 0

        if (windowSize < 2 || windowSize > data.length) {
          return `Fenstergröße muss zwischen 2 und ${data.length} liegen.`
        }

        // Calculate MA
        const ma = calculateMovingAverage(data, windowSize)

        // Build chart data
        const chartData: ChartDataPoint[] = data.map((value, i) => ({
          name: String(i + 1),
          original: value,
          ma: isNaN(ma[i]) ? undefined : Number(ma[i].toFixed(2)),
        }))

        // Add forecast
        if (forecastPeriods > 0) {
          const forecasts = forecastMA(data, windowSize, forecastPeriods)
          forecasts.forEach((f, i) => {
            chartData.push({
              name: String(data.length + i + 1),
              original: undefined,
              ma: undefined,
              forecast: Number(f.toFixed(2)),
            })
          })
        }

        const dashboardStore = useAIDashboardStore.getState()
        dashboardStore.addWidget({
          type: 'chart',
          chartType: 'line',
          title,
          data: chartData,
          yKeys: ['original', 'ma', ...(forecastPeriods > 0 ? ['forecast'] : [])],
          lineStyles: { ma: 'solid', forecast: 'dotted' },
          color: '#22d3ee',
        })

        // Statistics
        const lastMA = ma.filter(v => !isNaN(v)).slice(-1)[0]
        const trend = lastMA > data[data.length - 1] ? 'steigend' : 'fallend'

        dashboardStore.addWidget({
          type: 'table',
          title: 'MA Statistiken',
          data: [
            ['Metrik', 'Wert'],
            ['Fenstergröße', String(windowSize)],
            ['Letzter MA', formatNumber(lastMA, 2)],
            ['Letzter Wert', formatNumber(data[data.length - 1], 2)],
            ['Trend', trend],
            ['Std. Abweichung', formatNumber(stdDev(data), 4)],
          ],
        })

        ctx.openWindow('aidashboard')
        return `Moving Average (${windowSize}) berechnet. Trend: ${trend}.${forecastPeriods > 0 ? ` Prognose für ${forecastPeriods} Perioden erstellt.` : ''}`
      } catch (error) {
        return `Fehler beim Moving Average: ${error instanceof Error ? error.message : 'Ungültiges Datenformat'}`
      }
    },
  },

  {
    name: 'autoregressive',
    description: 'Berechnet ein autoregressives (AR) Modell für Zeitreihenprognosen. Nutzt vergangene Werte zur Vorhersage zukünftiger Werte.',
    parameters: {
      type: 'object',
      properties: {
        data_json: {
          type: 'string',
          description: 'JSON-Array der Werte, z.B. [10, 12, 15, 14, 16, 18, 20]',
        },
        lag_order: {
          type: 'number',
          description: 'Anzahl der Lag-Perioden (1-10, empfohlen: 2-5)',
        },
        title: {
          type: 'string',
          description: 'Titel für das Chart (optional)',
        },
        forecast_periods: {
          type: 'number',
          description: 'Anzahl der Perioden für Prognose (optional, default: 5)',
        },
      },
      required: ['data_json', 'lag_order'],
    },
    execute: async (args, ctx) => {
      try {
        const data: number[] = JSON.parse(args.data_json as string)
        const lagOrder = Math.min(Math.max(args.lag_order as number, 1), 10)
        const title = (args.title as string) || `AR(${lagOrder}) Modell`
        const forecastPeriods = (args.forecast_periods as number) || 5

        if (data.length < lagOrder + 5) {
          return `Mindestens ${lagOrder + 5} Datenpunkte benötigt für AR(${lagOrder}).`
        }

        // Calculate AR model
        const ar = calculateAR(data, lagOrder)

        // Build chart data (padding for lag period)
        const chartData: ChartDataPoint[] = data.map((value, i) => ({
          name: String(i + 1),
          original: value,
          ar: i >= lagOrder ? Number(ar.predictions[i - lagOrder]?.toFixed(2)) : undefined,
        }))

        // Add forecast
        const forecasts = forecastAR(data, ar.coefficients, forecastPeriods)
        forecasts.forEach((f, i) => {
          chartData.push({
            name: String(data.length + i + 1),
            original: undefined,
            ar: undefined,
            forecast: Number(f.toFixed(2)),
          })
        })

        const dashboardStore = useAIDashboardStore.getState()
        dashboardStore.addWidget({
          type: 'chart',
          chartType: 'line',
          title,
          data: chartData,
          yKeys: ['original', 'ar', 'forecast'],
          lineStyles: { ar: 'dashed', forecast: 'dotted' },
          color: '#10b981',
        })

        // Statistics
        const lastValue = data[data.length - 1]
        const lastForecast = forecasts[forecasts.length - 1]
        const forecastChange = ((lastForecast - lastValue) / lastValue) * 100

        dashboardStore.addWidget({
          type: 'table',
          title: 'AR Modell Statistiken',
          data: [
            ['Metrik', 'Wert'],
            ['Lag-Ordnung', String(lagOrder)],
            ['RMSE', formatNumber(ar.rmse, 4)],
            ['Koeffizienten', ar.coefficients.map(c => formatNumber(c, 3)).join(', ')],
            ['Letzter Wert', formatNumber(lastValue, 2)],
            [`Prognose (${forecastPeriods}P)`, formatNumber(lastForecast, 2)],
            ['Änderung', formatPercent(forecastChange)],
          ],
        })

        ctx.openWindow('aidashboard')
        return `AR(${lagOrder}) Modell erstellt. RMSE = ${formatNumber(ar.rmse, 4)}. Prognose: ${formatPercent(forecastChange)} über ${forecastPeriods} Perioden.`
      } catch (error) {
        return `Fehler beim AR-Modell: ${error instanceof Error ? error.message : 'Ungültiges Datenformat'}`
      }
    },
  },

  {
    name: 'analyze_stock',
    description: 'Führt eine statistische Analyse mit Prognose für eine Aktie durch. Kombiniert Datenabruf mit Regressionsanalyse.',
    parameters: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'Ticker-Symbol der Aktie (z.B. AAPL, MSFT, SAP.DE)',
        },
        model_type: {
          type: 'string',
          description: 'Analysemodell: linear (Lineare Regression), ma (Moving Average), ar (Autoregressive)',
          enum: ['linear', 'ma', 'ar'],
        },
        period: {
          type: 'string',
          description: 'Historischer Zeitraum für die Analyse',
          enum: ['1m', '3m', '6m', '1y'],
        },
        forecast_days: {
          type: 'number',
          description: 'Anzahl Tage für Prognose (1-30)',
        },
      },
      required: ['symbol', 'model_type'],
    },
    execute: async (args, ctx) => {
      const symbol = (args.symbol as string).toUpperCase()
      const modelType = (args.model_type as string) || 'linear'
      const period = (args.period as string) || '3m'
      const forecastDays = Math.min(Math.max((args.forecast_days as number) || 7, 1), 30)

      try {
        // Fetch stock data
        const response = await fetchWithProxy(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}`
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
        const closes = result.indicators?.quote?.[0]?.close?.filter((c: number | null) => c !== null) || []

        if (closes.length < 10) {
          return `Nicht genügend historische Daten für ${symbol}.`
        }

        // Format dates
        const dates = timestamps.map((t: number) => {
          const d = new Date(t * 1000)
          return `${d.getDate()}.${d.getMonth() + 1}`
        })

        const dashboardStore = useAIDashboardStore.getState()
        const meta = result.meta
        const currency = meta.currency || 'USD'

        let analysisResult = ''

        if (modelType === 'linear') {
          // Linear regression
          const x = closes.map((_: number, i: number) => i)
          const regression = calculateLinearRegression(x, closes)
          const forecasts = forecastLinear(regression.slope, regression.intercept, closes.length - 1, forecastDays)

          const chartData: ChartDataPoint[] = closes.map((price: number, i: number) => ({
            name: dates[i],
            price: Number(price.toFixed(2)),
            regression: Number(regression.predictions[i].toFixed(2)),
          }))

          // Add forecast points
          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1] * 1000)
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              regression: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${symbol} - Lineare Regression`,
            data: chartData,
            yKeys: ['price', 'regression', 'forecast'],
            lineStyles: { regression: 'dashed', forecast: 'dotted' },
            color: '#8b5cf6',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${symbol} Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Kurs', `${formatNumber(closes[closes.length - 1], 2)} ${currency}`],
              ['R²', formatNumber(regression.r2, 4)],
              ['Trend/Tag', `${formatNumber(regression.slope, 2)} ${currency}`],
              [`Prognose (${forecastDays}T)`, `${formatNumber(forecasts[forecasts.length - 1], 2)} ${currency}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `R² = ${formatNumber(regression.r2, 4)}, Prognose ${forecastDays} Tage: ${formatPercent(forecastChange)}`

        } else if (modelType === 'ma') {
          // Moving Average
          const windowSize = Math.min(14, Math.floor(closes.length / 3))
          const ma = calculateMovingAverage(closes, windowSize)
          const forecasts = forecastMA(closes, windowSize, forecastDays)

          const chartData: ChartDataPoint[] = closes.map((price: number, i: number) => ({
            name: dates[i],
            price: Number(price.toFixed(2)),
            ma: isNaN(ma[i]) ? undefined : Number(ma[i].toFixed(2)),
          }))

          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1] * 1000)
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              ma: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${symbol} - MA(${windowSize})`,
            data: chartData,
            yKeys: ['price', 'ma', 'forecast'],
            lineStyles: { ma: 'solid', forecast: 'dotted' },
            color: '#22d3ee',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${symbol} MA Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Kurs', `${formatNumber(closes[closes.length - 1], 2)} ${currency}`],
              ['MA-Fenster', `${windowSize} Tage`],
              ['Letzter MA', `${formatNumber(ma.filter(v => !isNaN(v)).slice(-1)[0], 2)} ${currency}`],
              [`Prognose (${forecastDays}T)`, `${formatNumber(forecasts[forecasts.length - 1], 2)} ${currency}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `MA(${windowSize}), Prognose ${forecastDays} Tage: ${formatPercent(forecastChange)}`

        } else if (modelType === 'ar') {
          // AR Model
          const lagOrder = Math.min(5, Math.floor(closes.length / 10))
          const ar = calculateAR(closes, lagOrder)
          const forecasts = forecastAR(closes, ar.coefficients, forecastDays)

          const chartData: ChartDataPoint[] = closes.map((price: number, i: number) => ({
            name: dates[i],
            price: Number(price.toFixed(2)),
            ar: i >= lagOrder ? Number(ar.predictions[i - lagOrder]?.toFixed(2)) : undefined,
          }))

          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1] * 1000)
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              ar: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${symbol} - AR(${lagOrder})`,
            data: chartData,
            yKeys: ['price', 'ar', 'forecast'],
            lineStyles: { ar: 'dashed', forecast: 'dotted' },
            color: '#10b981',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${symbol} AR Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Kurs', `${formatNumber(closes[closes.length - 1], 2)} ${currency}`],
              ['AR-Ordnung', String(lagOrder)],
              ['RMSE', formatNumber(ar.rmse, 2)],
              [`Prognose (${forecastDays}T)`, `${formatNumber(forecasts[forecasts.length - 1], 2)} ${currency}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `AR(${lagOrder}), RMSE = ${formatNumber(ar.rmse, 2)}, Prognose: ${formatPercent(forecastChange)}`
        }

        ctx.openWindow('aidashboard')
        return `${symbol} Analyse abgeschlossen (${modelType.toUpperCase()}). ${analysisResult}`

      } catch (error) {
        return `Fehler bei der Aktienanalyse: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },

  {
    name: 'analyze_crypto',
    description: 'Führt eine statistische Analyse mit Prognose für eine Kryptowährung durch.',
    parameters: {
      type: 'object',
      properties: {
        coin: {
          type: 'string',
          description: 'Kryptowährung ID (z.B. bitcoin, ethereum, solana)',
        },
        model_type: {
          type: 'string',
          description: 'Analysemodell: linear, ma, ar',
          enum: ['linear', 'ma', 'ar'],
        },
        days: {
          type: 'number',
          description: 'Historische Tage für Analyse (7-365)',
        },
        forecast_days: {
          type: 'number',
          description: 'Anzahl Tage für Prognose (1-14)',
        },
      },
      required: ['coin', 'model_type'],
    },
    execute: async (args, ctx) => {
      const coin = (args.coin as string).toLowerCase()
      const modelType = (args.model_type as string) || 'linear'
      const days = Math.min(Math.max((args.days as number) || 90, 7), 365)
      const forecastDays = Math.min(Math.max((args.forecast_days as number) || 7, 1), 14)

      try {
        // Fetch crypto data from CoinGecko
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}`
        )

        if (!response.ok) {
          return `Kryptowährung "${coin}" nicht gefunden.`
        }

        const data = await response.json()
        const prices = data.prices || []

        if (prices.length < 10) {
          return `Nicht genügend Daten für ${coin}.`
        }

        // Extract price values
        const closes = prices.map((p: [number, number]) => p[1])
        const timestamps = prices.map((p: [number, number]) => p[0])

        // Format dates
        const dates = timestamps.map((t: number) => {
          const d = new Date(t)
          return `${d.getDate()}.${d.getMonth() + 1}`
        })

        const dashboardStore = useAIDashboardStore.getState()
        const coinName = coin.charAt(0).toUpperCase() + coin.slice(1)

        let analysisResult = ''

        if (modelType === 'linear') {
          const x = closes.map((_: number, i: number) => i)
          const regression = calculateLinearRegression(x, closes)
          const forecasts = forecastLinear(regression.slope, regression.intercept, closes.length - 1, forecastDays)

          // Sample data for readability (max 50 points)
          const sampleRate = Math.max(1, Math.floor(closes.length / 50))
          const chartData: ChartDataPoint[] = closes
            .filter((_: number, i: number) => i % sampleRate === 0 || i === closes.length - 1)
            .map((price: number, idx: number) => {
              const i = idx * sampleRate >= closes.length - 1 ? closes.length - 1 : idx * sampleRate
              return {
                name: dates[i],
                price: Number(price.toFixed(2)),
                regression: Number(regression.predictions[i].toFixed(2)),
              }
            })

          // Add forecast
          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1])
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              regression: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${coinName} - Lineare Regression`,
            data: chartData,
            yKeys: ['price', 'regression', 'forecast'],
            lineStyles: { regression: 'dashed', forecast: 'dotted' },
            color: '#f59e0b',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${coinName} Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Preis', `$${formatNumber(closes[closes.length - 1], 2)}`],
              ['R²', formatNumber(regression.r2, 4)],
              ['Trend/Tag', `$${formatNumber(regression.slope, 2)}`],
              [`Prognose (${forecastDays}T)`, `$${formatNumber(forecasts[forecasts.length - 1], 2)}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `R² = ${formatNumber(regression.r2, 4)}, Prognose: ${formatPercent(forecastChange)}`

        } else if (modelType === 'ma') {
          const windowSize = Math.min(14, Math.floor(closes.length / 5))
          const ma = calculateMovingAverage(closes, windowSize)
          const forecasts = forecastMA(closes, windowSize, forecastDays)

          const sampleRate = Math.max(1, Math.floor(closes.length / 50))
          const chartData: ChartDataPoint[] = closes
            .filter((_: number, i: number) => i % sampleRate === 0 || i === closes.length - 1)
            .map((price: number, idx: number) => {
              const i = idx * sampleRate >= closes.length - 1 ? closes.length - 1 : idx * sampleRate
              return {
                name: dates[i],
                price: Number(price.toFixed(2)),
                ma: isNaN(ma[i]) ? undefined : Number(ma[i].toFixed(2)),
              }
            })

          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1])
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              ma: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${coinName} - MA(${windowSize})`,
            data: chartData,
            yKeys: ['price', 'ma', 'forecast'],
            lineStyles: { ma: 'solid', forecast: 'dotted' },
            color: '#22d3ee',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${coinName} MA Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Preis', `$${formatNumber(closes[closes.length - 1], 2)}`],
              ['MA-Fenster', `${windowSize} Punkte`],
              [`Prognose (${forecastDays}T)`, `$${formatNumber(forecasts[forecasts.length - 1], 2)}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `MA(${windowSize}), Prognose: ${formatPercent(forecastChange)}`

        } else if (modelType === 'ar') {
          const lagOrder = Math.min(5, Math.floor(closes.length / 15))
          const ar = calculateAR(closes, lagOrder)
          const forecasts = forecastAR(closes, ar.coefficients, forecastDays)

          const sampleRate = Math.max(1, Math.floor(closes.length / 50))
          const chartData: ChartDataPoint[] = closes
            .filter((_: number, i: number) => i % sampleRate === 0 || i === closes.length - 1)
            .map((price: number, idx: number) => {
              const i = idx * sampleRate >= closes.length - 1 ? closes.length - 1 : idx * sampleRate
              return {
                name: dates[i],
                price: Number(price.toFixed(2)),
                ar: i >= lagOrder ? Number(ar.predictions[Math.min(i - lagOrder, ar.predictions.length - 1)]?.toFixed(2)) : undefined,
              }
            })

          for (let i = 0; i < forecastDays; i++) {
            const forecastDate = new Date(timestamps[timestamps.length - 1])
            forecastDate.setDate(forecastDate.getDate() + i + 1)
            chartData.push({
              name: `${forecastDate.getDate()}.${forecastDate.getMonth() + 1}`,
              price: undefined,
              ar: undefined,
              forecast: Number(forecasts[i].toFixed(2)),
            })
          }

          dashboardStore.addWidget({
            type: 'chart',
            chartType: 'line',
            title: `${coinName} - AR(${lagOrder})`,
            data: chartData,
            yKeys: ['price', 'ar', 'forecast'],
            lineStyles: { ar: 'dashed', forecast: 'dotted' },
            color: '#10b981',
          })

          const forecastChange = ((forecasts[forecasts.length - 1] - closes[closes.length - 1]) / closes[closes.length - 1]) * 100

          dashboardStore.addWidget({
            type: 'table',
            title: `${coinName} AR Analyse`,
            data: [
              ['Metrik', 'Wert'],
              ['Aktueller Preis', `$${formatNumber(closes[closes.length - 1], 2)}`],
              ['AR-Ordnung', String(lagOrder)],
              ['RMSE', `$${formatNumber(ar.rmse, 2)}`],
              [`Prognose (${forecastDays}T)`, `$${formatNumber(forecasts[forecasts.length - 1], 2)}`],
              ['Änderung', formatPercent(forecastChange)],
            ],
          })

          analysisResult = `AR(${lagOrder}), Prognose: ${formatPercent(forecastChange)}`
        }

        ctx.openWindow('aidashboard')
        return `${coinName} Analyse abgeschlossen (${modelType.toUpperCase()}). ${analysisResult}`

      } catch (error) {
        return `Fehler bei der Crypto-Analyse: ${error instanceof Error ? error.message : 'Netzwerkfehler'}`
      }
    },
  },
]

import { motion } from 'framer-motion'
import type { Widget } from '@/stores/aiDashboardStore'

interface TableWidgetProps {
  widget: Widget
}

export function TableWidget({ widget }: TableWidgetProps) {
  const data = widget.data as string[][]

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        Keine Daten vorhanden
      </div>
    )
  }

  const headers = data[0]
  const rows = data.slice(1)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full overflow-auto"
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10">
          <tr
            className="
              bg-gradient-to-r from-violet-900/40 via-cyan-900/20 to-violet-900/40
              backdrop-blur-sm
            "
          >
            {headers.map((header, i) => (
              <motion.th
                key={i}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="
                  px-3 py-2.5 text-left font-medium text-violet-200
                  border-b border-violet-500/30
                  first:rounded-tl last:rounded-tr
                "
              >
                {header}
              </motion.th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <motion.tr
              key={rowIndex}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + rowIndex * 0.03 }}
              className="
                hologram-table-row
                transition-all duration-200
                border-b border-violet-500/10
              "
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="
                    px-3 py-2 text-gray-300
                    transition-colors duration-200
                  "
                >
                  {cell}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

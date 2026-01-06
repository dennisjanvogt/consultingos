import { motion } from 'framer-motion'
import type { Widget } from '@/stores/aiDashboardStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface InfoWidgetProps {
  widget: Widget
}

export function InfoWidget({ widget }: InfoWidgetProps) {
  const content = widget.data as string

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="h-full overflow-auto p-1"
    >
      <div
        className="
          prose prose-sm max-w-none
          prose-headings:text-violet-300 prose-headings:font-semibold
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:text-cyan-300
          prose-a:transition-colors prose-a:shadow-[0_0_10px_rgba(34,211,238,0.3)]
          prose-strong:text-violet-200 prose-strong:font-semibold
          prose-code:text-cyan-300 prose-code:bg-violet-900/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
          prose-code:shadow-[0_0_8px_rgba(34,211,238,0.2)]
          prose-pre:bg-gray-900/50 prose-pre:border prose-pre:border-violet-500/20
          prose-pre:shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]
          prose-blockquote:border-l-violet-500/50 prose-blockquote:text-gray-400
          prose-blockquote:bg-violet-900/10 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r
          prose-ul:text-gray-300 prose-ol:text-gray-300
          prose-li:marker:text-violet-400
          prose-hr:border-violet-500/30
        "
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </motion.div>
  )
}

import { motion } from 'framer-motion'

interface GoStoneProps {
  color: 'black' | 'white'
  size: number
  isLastMove?: boolean
  isPreview?: boolean
}

export function GoStone({ color, size, isLastMove, isPreview }: GoStoneProps) {
  const isBlack = color === 'black'

  return (
    <motion.div
      initial={isPreview ? { opacity: 0.3 } : { scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: isPreview ? 0.5 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className="rounded-full flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: isBlack
          ? `radial-gradient(circle at 30% 30%, #4a4a4a 0%, #1a1a1a 60%, #000000 100%)`
          : `radial-gradient(circle at 30% 30%, #ffffff 0%, #f0f0f0 40%, #d0d0d0 100%)`,
        boxShadow: isPreview
          ? 'none'
          : isBlack
            ? `
                2px 2px 4px rgba(0, 0, 0, 0.4),
                inset -2px -2px 4px rgba(255, 255, 255, 0.1),
                inset 2px 2px 4px rgba(255, 255, 255, 0.05)
              `
            : `
                2px 2px 4px rgba(0, 0, 0, 0.3),
                inset -1px -1px 3px rgba(0, 0, 0, 0.1),
                inset 2px 2px 4px rgba(255, 255, 255, 0.8)
              `,
      }}
    >
      {/* Highlight for 3D effect */}
      <div
        className="absolute rounded-full"
        style={{
          width: size * 0.3,
          height: size * 0.2,
          top: '15%',
          left: '20%',
          background: isBlack
            ? 'radial-gradient(ellipse, rgba(255,255,255,0.15) 0%, transparent 70%)'
            : 'radial-gradient(ellipse, rgba(255,255,255,0.9) 0%, transparent 70%)',
          transform: 'rotate(-30deg)',
        }}
      />

      {/* Last move marker */}
      {isLastMove && (
        <div
          className="rounded-full"
          style={{
            width: size * 0.3,
            height: size * 0.3,
            background: isBlack ? '#ffffff' : '#000000',
            opacity: 0.7,
          }}
        />
      )}
    </motion.div>
  )
}

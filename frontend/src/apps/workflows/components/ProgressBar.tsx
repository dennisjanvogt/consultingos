interface ProgressBarProps {
  progress: number
  color?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function ProgressBar({
  progress,
  color = 'violet',
  size = 'md',
  showLabel = false,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress))

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size]

  const colorClass = {
    violet: 'bg-violet-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }[color] || 'bg-violet-500'

  return (
    <div className="w-full">
      <div className={`${heightClass} bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`${heightClass} ${colorClass} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <div className="text-xs text-gray-500 mt-1 text-right">{clampedProgress}%</div>
      )}
    </div>
  )
}

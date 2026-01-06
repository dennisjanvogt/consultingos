import type { FC, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number
}

// Base wrapper for consistent styling
const IconWrapper: FC<IconProps & { children: React.ReactNode }> = ({
  size = 24,
  children,
  className = '',
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {children}
  </svg>
)

// Elegant assistant icon with golden ratio inspired design
export const AssistantIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="assistantGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="10" stroke="url(#assistantGrad)" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="6" fill="url(#assistantGrad)" opacity="0.2" />
    <circle cx="12" cy="12" r="3" fill="url(#assistantGrad)" />
  </IconWrapper>
)

// Code/Developer icon
export const CodeIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="codeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
    </defs>
    <path
      d="M8 6L3 12L8 18"
      stroke="url(#codeGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 6L21 12L16 18"
      stroke="url(#codeGrad)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 4L10 20"
      stroke="url(#codeGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
  </IconWrapper>
)

// Writer/Content icon - elegant pen
export const WriterIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="writerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" />
        <stop offset="100%" stopColor="#db2777" />
      </linearGradient>
    </defs>
    <path
      d="M17 3L21 7L8 20H4V16L17 3Z"
      stroke="url(#writerGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 6L18 10"
      stroke="url(#writerGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M4 20H20"
      stroke="url(#writerGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.4"
    />
  </IconWrapper>
)

// Analytics icon - minimalist chart
export const AnalyticsIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="analyticsGrad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <rect x="3" y="14" width="4" height="7" rx="1" fill="url(#analyticsGrad)" opacity="0.4" />
    <rect x="10" y="9" width="4" height="12" rx="1" fill="url(#analyticsGrad)" opacity="0.7" />
    <rect x="17" y="3" width="4" height="18" rx="1" fill="url(#analyticsGrad)" />
  </IconWrapper>
)

// Creative/Art icon - abstract brush
export const CreativeIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="creativeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#f59e0b" />
      </linearGradient>
    </defs>
    <circle cx="7" cy="7" r="3" fill="url(#creativeGrad)" opacity="0.8" />
    <circle cx="17" cy="7" r="2" fill="url(#creativeGrad)" opacity="0.6" />
    <circle cx="17" cy="17" r="3" fill="url(#creativeGrad)" opacity="0.9" />
    <circle cx="7" cy="17" r="2" fill="url(#creativeGrad)" opacity="0.5" />
    <circle cx="12" cy="12" r="2.5" fill="url(#creativeGrad)" />
  </IconWrapper>
)

// Research/Search icon
export const ResearchIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="researchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#8b5cf6" />
      </linearGradient>
    </defs>
    <circle cx="10" cy="10" r="6" stroke="url(#researchGrad)" strokeWidth="2" fill="none" />
    <circle cx="10" cy="10" r="2" fill="url(#researchGrad)" opacity="0.3" />
    <path
      d="M15 15L20 20"
      stroke="url(#researchGrad)"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </IconWrapper>
)

// Ideas/Lightbulb icon
export const IdeaIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="ideaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#facc15" />
      </linearGradient>
    </defs>
    <path
      d="M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z"
      fill="url(#ideaGrad)"
      opacity="0.9"
    />
    <path
      d="M9 21H15"
      stroke="url(#ideaGrad)"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M10 18V21"
      stroke="#fde047"
      strokeWidth="1.5"
      opacity="0.6"
    />
    <path
      d="M14 18V21"
      stroke="#fde047"
      strokeWidth="1.5"
      opacity="0.6"
    />
  </IconWrapper>
)

// Brain/AI icon
export const BrainIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="brainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#c084fc" />
        <stop offset="100%" stopColor="#9333ea" />
      </linearGradient>
    </defs>
    <path
      d="M12 4C8 4 6 6 6 9C4 9 3 11 3 12.5C3 14 4 16 6 16C6 18 8 20 12 20C16 20 18 18 18 16C20 16 21 14 21 12.5C21 11 20 9 18 9C18 6 16 4 12 4Z"
      stroke="url(#brainGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M12 4V20"
      stroke="url(#brainGrad)"
      strokeWidth="1"
      opacity="0.4"
    />
    <circle cx="9" cy="10" r="1.5" fill="url(#brainGrad)" opacity="0.6" />
    <circle cx="15" cy="10" r="1.5" fill="url(#brainGrad)" opacity="0.6" />
    <circle cx="9" cy="14" r="1" fill="url(#brainGrad)" opacity="0.4" />
    <circle cx="15" cy="14" r="1" fill="url(#brainGrad)" opacity="0.4" />
  </IconWrapper>
)

// Speed/Quick icon - lightning bolt
export const SpeedIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
    </defs>
    <path
      d="M13 2L4 14H11L10 22L20 9H13L13 2Z"
      fill="url(#speedGrad)"
    />
  </IconWrapper>
)

// Target/Goals icon
export const TargetIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="targetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="100%" stopColor="#dc2626" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="9" stroke="url(#targetGrad)" strokeWidth="1.5" fill="none" />
    <circle cx="12" cy="12" r="6" stroke="url(#targetGrad)" strokeWidth="1.5" fill="none" opacity="0.6" />
    <circle cx="12" cy="12" r="3" stroke="url(#targetGrad)" strokeWidth="1.5" fill="none" opacity="0.4" />
    <circle cx="12" cy="12" r="1.5" fill="url(#targetGrad)" />
  </IconWrapper>
)

// Books/Learning icon
export const LearningIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="learningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#4f46e5" />
      </linearGradient>
    </defs>
    <path
      d="M4 19.5V5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V19.5C20 20.33 19.33 21 18.5 21H5.5C4.67 21 4 20.33 4 19.5Z"
      stroke="url(#learningGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M4 7H20"
      stroke="url(#learningGrad)"
      strokeWidth="1.5"
      opacity="0.4"
    />
    <path
      d="M8 11H16"
      stroke="url(#learningGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M8 14H14"
      stroke="url(#learningGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.4"
    />
    <path
      d="M8 17H12"
      stroke="url(#learningGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.3"
    />
  </IconWrapper>
)

// Tools/Settings icon - elegant gear
export const ToolsIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="toolsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    <path
      d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
      stroke="url(#toolsGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M19.4 15C19.2 15.3 19.2 15.7 19.4 16L20.5 17.8C20.7 18.1 20.6 18.5 20.3 18.7L18.7 20.3C18.5 20.5 18.1 20.6 17.8 20.4L16 19.3C15.7 19.1 15.3 19.1 15 19.3C14.7 19.5 14.4 19.6 14 19.7L13.8 21.7C13.8 22 13.5 22.2 13.2 22.2H10.8C10.5 22.2 10.2 22 10.2 21.7L10 19.7C9.6 19.6 9.3 19.5 9 19.3C8.7 19.1 8.3 19.1 8 19.3L6.2 20.4C5.9 20.6 5.5 20.5 5.3 20.2L3.7 18.6C3.5 18.4 3.4 18 3.6 17.7L4.7 15.9C4.9 15.6 4.9 15.2 4.7 14.9C4.5 14.6 4.4 14.3 4.3 13.9L2.3 13.7C2 13.7 1.8 13.4 1.8 13.1V10.7C1.8 10.4 2 10.1 2.3 10.1L4.3 9.9C4.4 9.5 4.5 9.2 4.7 8.9C4.9 8.6 4.9 8.2 4.7 7.9L3.6 6.1C3.4 5.8 3.5 5.4 3.8 5.2L5.4 3.6C5.6 3.4 6 3.3 6.3 3.5L8.1 4.6C8.4 4.8 8.8 4.8 9.1 4.6C9.4 4.4 9.7 4.3 10.1 4.2L10.3 2.2C10.3 1.9 10.6 1.7 10.9 1.7H13.3C13.6 1.7 13.9 1.9 13.9 2.2L14.1 4.2C14.5 4.3 14.8 4.4 15.1 4.6C15.4 4.8 15.8 4.8 16.1 4.6L17.9 3.5C18.2 3.3 18.6 3.4 18.8 3.7L20.4 5.3C20.6 5.5 20.7 5.9 20.5 6.2L19.4 8C19.2 8.3 19.2 8.7 19.4 9C19.6 9.3 19.7 9.6 19.8 10L21.8 10.2C22.1 10.2 22.3 10.5 22.3 10.8V13.2C22.3 13.5 22.1 13.8 21.8 13.8L19.8 14C19.7 14.4 19.6 14.7 19.4 15Z"
      stroke="url(#toolsGrad)"
      strokeWidth="1.5"
      fill="none"
    />
  </IconWrapper>
)

// Document/Notes icon
export const DocumentIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="documentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6ee7b7" />
        <stop offset="100%" stopColor="#10b981" />
      </linearGradient>
    </defs>
    <path
      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
      stroke="url(#documentGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M14 2V8H20"
      stroke="url(#documentGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <path
      d="M8 13H16"
      stroke="url(#documentGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    <path
      d="M8 17H13"
      stroke="url(#documentGrad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.4"
    />
  </IconWrapper>
)

// Strategy/Chess icon
export const StrategyIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="strategyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#a78bfa" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L14 5H17L14.5 8L16 12H8L9.5 8L7 5H10L12 2Z"
      fill="url(#strategyGrad)"
      opacity="0.8"
    />
    <rect x="8" y="12" width="8" height="3" fill="url(#strategyGrad)" opacity="0.6" />
    <rect x="6" y="15" width="12" height="2" fill="url(#strategyGrad)" opacity="0.4" />
    <rect x="7" y="17" width="10" height="5" rx="1" stroke="url(#strategyGrad)" strokeWidth="1.5" fill="none" />
  </IconWrapper>
)

// Communication/Chat icon
export const ChatIcon: FC<IconProps> = (props) => (
  <IconWrapper {...props}>
    <defs>
      <linearGradient id="chatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#2dd4bf" />
        <stop offset="100%" stopColor="#14b8a6" />
      </linearGradient>
    </defs>
    <path
      d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0034 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92176 4.44061 8.37485 5.27072 7.03255C6.10083 5.69025 7.28825 4.60557 8.7 3.9C9.87812 3.30493 11.1801 2.99656 12.5 3H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91565 21 11V11.5Z"
      stroke="url(#chatGrad)"
      strokeWidth="1.5"
      fill="none"
    />
    <circle cx="8.5" cy="11.5" r="1" fill="url(#chatGrad)" />
    <circle cx="12.5" cy="11.5" r="1" fill="url(#chatGrad)" />
    <circle cx="16.5" cy="11.5" r="1" fill="url(#chatGrad)" />
  </IconWrapper>
)

// All icons mapped for selection
export const HELPER_ICONS = {
  assistant: { component: AssistantIcon, label: 'Assistent' },
  code: { component: CodeIcon, label: 'Code' },
  writer: { component: WriterIcon, label: 'Schreiben' },
  analytics: { component: AnalyticsIcon, label: 'Analyse' },
  creative: { component: CreativeIcon, label: 'Kreativ' },
  research: { component: ResearchIcon, label: 'Recherche' },
  idea: { component: IdeaIcon, label: 'Ideen' },
  brain: { component: BrainIcon, label: 'KI' },
  speed: { component: SpeedIcon, label: 'Schnell' },
  target: { component: TargetIcon, label: 'Ziele' },
  learning: { component: LearningIcon, label: 'Lernen' },
  tools: { component: ToolsIcon, label: 'Tools' },
  document: { component: DocumentIcon, label: 'Dokumente' },
  strategy: { component: StrategyIcon, label: 'Strategie' },
  chat: { component: ChatIcon, label: 'Chat' },
} as const

export type HelperIconKey = keyof typeof HELPER_ICONS

// Helper to render icon by key
export const renderHelperIcon = (iconKey: string, size = 24, className = '') => {
  const iconData = HELPER_ICONS[iconKey as HelperIconKey]
  if (!iconData) {
    // Fallback for emojis or unknown icons
    return <span className="text-lg">{iconKey}</span>
  }
  const IconComponent = iconData.component
  return <IconComponent size={size} className={className} />
}

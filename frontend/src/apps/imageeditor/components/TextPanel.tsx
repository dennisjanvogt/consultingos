import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useImageEditorStore } from '@/stores/imageEditorStore'
import { generateId, DEFAULT_TEXT_EFFECTS } from '../types'
import type { Layer, TextEffects } from '../types'
import { Type, Plus, Search, LayoutGrid, Heading1, Heading2, AlignLeft, Sparkles, CircleDot } from 'lucide-react'

// Text template presets like Canva
const TEXT_TEMPLATES = [
  // Headlines
  {
    id: 'headline-1',
    category: 'headline',
    preview: 'Add a heading',
    text: 'Add a heading',
    fontSize: 64,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'headline-2',
    category: 'headline',
    preview: 'BOLD TITLE',
    text: 'BOLD TITLE',
    fontSize: 72,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS, outline: { enabled: true, width: 3, color: '#000000' } },
  },
  {
    id: 'headline-3',
    category: 'headline',
    preview: 'Elegant Header',
    text: 'Elegant Header',
    fontSize: 56,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  // Subheadings
  {
    id: 'subhead-1',
    category: 'subheading',
    preview: 'Add a subheading',
    text: 'Add a subheading',
    fontSize: 32,
    fontFamily: 'Arial',
    fontWeight: 400,
    fontColor: '#cccccc',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'subhead-2',
    category: 'subheading',
    preview: 'Subtitle Text',
    text: 'Subtitle Text',
    fontSize: 28,
    fontFamily: 'Helvetica',
    fontWeight: 300,
    fontColor: '#aaaaaa',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  // Body text
  {
    id: 'body-1',
    category: 'body',
    preview: 'Add body text',
    text: 'Add a little bit of body text',
    fontSize: 18,
    fontFamily: 'Arial',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'body-2',
    category: 'body',
    preview: 'Paragraph text',
    text: 'This is a paragraph of text that you can edit.',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#dddddd',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  // Stylized text
  {
    id: 'neon-1',
    category: 'stylized',
    preview: 'NEON GLOW',
    text: 'NEON GLOW',
    fontSize: 48,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ff00ff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#ff00ff', intensity: 30 },
    },
  },
  {
    id: 'neon-2',
    category: 'stylized',
    preview: 'CYBER',
    text: 'CYBER',
    fontSize: 56,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#00ffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#00ffff', intensity: 25 },
      outline: { enabled: true, width: 2, color: '#003333' },
    },
  },
  {
    id: 'shadow-1',
    category: 'stylized',
    preview: 'Drop Shadow',
    text: 'Drop Shadow',
    fontSize: 48,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 4, offsetY: 4, blur: 8, color: '#000000' },
    },
  },
  {
    id: 'outline-1',
    category: 'stylized',
    preview: 'OUTLINED',
    text: 'OUTLINED',
    fontSize: 52,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#000000',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 4, color: '#ffffff' },
    },
  },
  {
    id: 'retro-1',
    category: 'stylized',
    preview: 'RETRO',
    text: 'RETRO',
    fontSize: 60,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ffcc00',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 6, offsetY: 6, blur: 0, color: '#ff6600' },
    },
  },
  {
    id: 'gradient-shadow',
    category: 'stylized',
    preview: 'Modern',
    text: 'Modern',
    fontSize: 54,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 0, offsetY: 8, blur: 20, color: 'rgba(139, 92, 246, 0.5)' },
    },
  },
  // Curved text
  {
    id: 'curved-up',
    category: 'curved',
    preview: 'Curved Up',
    text: 'CURVED TEXT',
    fontSize: 36,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      curve: 50,
    },
  },
  {
    id: 'curved-down',
    category: 'curved',
    preview: 'Curved Down',
    text: 'WAVE TEXT',
    fontSize: 36,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      curve: -50,
    },
  },
  // Classic & Elegant
  {
    id: 'classic-serif',
    category: 'stylized',
    preview: 'Classic Elegance',
    text: 'Classic Elegance',
    fontSize: 52,
    fontFamily: 'Times New Roman',
    fontWeight: 400,
    fontColor: '#d4af37',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'luxury-gold',
    category: 'stylized',
    preview: 'LUXURY',
    text: 'LUXURY',
    fontSize: 64,
    fontFamily: 'Georgia',
    fontWeight: 700,
    fontColor: '#ffd700',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 2, offsetY: 2, blur: 4, color: 'rgba(0,0,0,0.5)' },
    },
  },
  {
    id: 'wedding-script',
    category: 'stylized',
    preview: 'Forever & Always',
    text: 'Forever & Always',
    fontSize: 48,
    fontFamily: 'Brush Script MT',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'formal-title',
    category: 'headline',
    preview: 'The Grand Title',
    text: 'The Grand Title',
    fontSize: 58,
    fontFamily: 'Palatino Linotype',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 3, offsetY: 3, blur: 6, color: 'rgba(0,0,0,0.4)' },
    },
  },
  {
    id: 'vintage-poster',
    category: 'stylized',
    preview: 'VINTAGE',
    text: 'VINTAGE',
    fontSize: 60,
    fontFamily: 'Copperplate',
    fontWeight: 400,
    fontColor: '#8b4513',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 2, color: '#d2691e' },
    },
  },
  {
    id: 'minimalist',
    category: 'headline',
    preview: 'Minimalist',
    text: 'Minimalist',
    fontSize: 48,
    fontFamily: 'Helvetica',
    fontWeight: 300,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'art-deco',
    category: 'stylized',
    preview: 'ART DECO',
    text: 'ART DECO',
    fontSize: 56,
    fontFamily: 'Copperplate',
    fontWeight: 700,
    fontColor: '#c9b037',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 3, color: '#1a1a1a' },
    },
  },
  {
    id: 'fashion-mag',
    category: 'headline',
    preview: 'FASHION',
    text: 'FASHION',
    fontSize: 72,
    fontFamily: 'Didot',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'royal-crown',
    category: 'stylized',
    preview: 'Royal',
    text: 'Royal',
    fontSize: 54,
    fontFamily: 'Palatino Linotype',
    fontWeight: 700,
    fontColor: '#4169e1',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#4169e1', intensity: 15 },
    },
  },
  {
    id: 'movie-title',
    category: 'headline',
    preview: 'BLOCKBUSTER',
    text: 'BLOCKBUSTER',
    fontSize: 64,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ff4500',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 4, offsetY: 4, blur: 0, color: '#8b0000' },
    },
  },
  // More Headlines
  {
    id: 'bold-statement',
    category: 'headline',
    preview: 'MAKE A STATEMENT',
    text: 'MAKE A STATEMENT',
    fontSize: 58,
    fontFamily: 'Arial Black',
    fontWeight: 900,
    fontColor: '#ffffff',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'sleek-modern',
    category: 'headline',
    preview: 'Sleek & Modern',
    text: 'Sleek & Modern',
    fontSize: 52,
    fontFamily: 'Helvetica',
    fontWeight: 200,
    fontColor: '#e0e0e0',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'newspaper',
    category: 'headline',
    preview: 'BREAKING NEWS',
    text: 'BREAKING NEWS',
    fontSize: 60,
    fontFamily: 'Times New Roman',
    fontWeight: 700,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 2, color: '#333333' },
    },
  },
  {
    id: 'tech-title',
    category: 'headline',
    preview: 'TECH FUTURE',
    text: 'TECH FUTURE',
    fontSize: 54,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#00d4ff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#00d4ff', intensity: 20 },
    },
  },
  // More Subheadings
  {
    id: 'subhead-elegant',
    category: 'subheading',
    preview: 'An elegant subtitle',
    text: 'An elegant subtitle',
    fontSize: 26,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#b8b8b8',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'subhead-caps',
    category: 'subheading',
    preview: 'ALL CAPS SUBTITLE',
    text: 'ALL CAPS SUBTITLE',
    fontSize: 22,
    fontFamily: 'Arial',
    fontWeight: 500,
    fontColor: '#999999',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'subhead-light',
    category: 'subheading',
    preview: 'Light & Airy',
    text: 'Light & Airy',
    fontSize: 30,
    fontFamily: 'Helvetica',
    fontWeight: 200,
    fontColor: '#cccccc',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  // More Body Text
  {
    id: 'body-serif',
    category: 'body',
    preview: 'Serif paragraph',
    text: 'A beautiful serif paragraph text for longer content.',
    fontSize: 16,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#e8e8e8',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'body-quote',
    category: 'body',
    preview: '"Quoted text"',
    text: '"The only way to do great work is to love what you do."',
    fontSize: 20,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#cccccc',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'body-small',
    category: 'body',
    preview: 'Small caption',
    text: 'Small caption text for images and details',
    fontSize: 12,
    fontFamily: 'Arial',
    fontWeight: 400,
    fontColor: '#888888',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  // More Stylized
  {
    id: 'fire-text',
    category: 'stylized',
    preview: 'FIRE',
    text: 'FIRE',
    fontSize: 72,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ff6600',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#ff3300', intensity: 35 },
      shadow: { enabled: true, offsetX: 0, offsetY: 4, blur: 15, color: '#ff0000' },
    },
  },
  {
    id: 'ice-text',
    category: 'stylized',
    preview: 'FROZEN',
    text: 'FROZEN',
    fontSize: 64,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#b3e0ff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#66ccff', intensity: 25 },
      outline: { enabled: true, width: 2, color: '#ffffff' },
    },
  },
  {
    id: 'gold-emboss',
    category: 'stylized',
    preview: 'PREMIUM',
    text: 'PREMIUM',
    fontSize: 56,
    fontFamily: 'Georgia',
    fontWeight: 700,
    fontColor: '#d4a574',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 2, offsetY: 2, blur: 0, color: '#8b6914' },
      outline: { enabled: true, width: 1, color: '#ffe4b5' },
    },
  },
  {
    id: 'grunge',
    category: 'stylized',
    preview: 'GRUNGE',
    text: 'GRUNGE',
    fontSize: 68,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#4a4a4a',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 3, color: '#1a1a1a' },
      shadow: { enabled: true, offsetX: 3, offsetY: 3, blur: 0, color: '#666666' },
    },
  },
  {
    id: 'neon-pink',
    category: 'stylized',
    preview: 'PARTY',
    text: 'PARTY',
    fontSize: 60,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ff1493',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#ff1493', intensity: 40 },
    },
  },
  {
    id: 'neon-green',
    category: 'stylized',
    preview: 'TOXIC',
    text: 'TOXIC',
    fontSize: 58,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#39ff14',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#39ff14', intensity: 35 },
    },
  },
  {
    id: 'chrome',
    category: 'stylized',
    preview: 'CHROME',
    text: 'CHROME',
    fontSize: 62,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#c0c0c0',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 2, color: '#808080' },
      shadow: { enabled: true, offsetX: 2, offsetY: 2, blur: 4, color: '#404040' },
    },
  },
  {
    id: 'comic-style',
    category: 'stylized',
    preview: 'POW!',
    text: 'POW!',
    fontSize: 80,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ffff00',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 4, color: '#ff0000' },
      shadow: { enabled: true, offsetX: 5, offsetY: 5, blur: 0, color: '#000000' },
    },
  },
  {
    id: 'watercolor',
    category: 'stylized',
    preview: 'Watercolor',
    text: 'Watercolor',
    fontSize: 52,
    fontFamily: 'Brush Script MT',
    fontWeight: 400,
    fontColor: '#87ceeb',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#add8e6', intensity: 15 },
    },
  },
  {
    id: 'horror',
    category: 'stylized',
    preview: 'HORROR',
    text: 'HORROR',
    fontSize: 64,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#8b0000',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 0, offsetY: 0, blur: 20, color: '#ff0000' },
    },
  },
  {
    id: 'sports',
    category: 'stylized',
    preview: 'CHAMPIONS',
    text: 'CHAMPIONS',
    fontSize: 58,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ffd700',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 3, color: '#000080' },
    },
  },
  {
    id: 'gaming',
    category: 'stylized',
    preview: 'GAME ON',
    text: 'GAME ON',
    fontSize: 56,
    fontFamily: 'Arial Black',
    fontWeight: 900,
    fontColor: '#9400d3',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#9400d3', intensity: 30 },
      outline: { enabled: true, width: 2, color: '#00ff00' },
    },
  },
  {
    id: 'sunset-gradient',
    category: 'stylized',
    preview: 'SUNSET',
    text: 'SUNSET',
    fontSize: 60,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ff7f50',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#ff4500', intensity: 20 },
    },
  },
  {
    id: 'nature',
    category: 'stylized',
    preview: 'NATURE',
    text: 'NATURE',
    fontSize: 54,
    fontFamily: 'Georgia',
    fontWeight: 700,
    fontColor: '#228b22',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 3, offsetY: 3, blur: 6, color: '#006400' },
    },
  },
  {
    id: '3d-pop',
    category: 'stylized',
    preview: '3D POP',
    text: '3D POP',
    fontSize: 66,
    fontFamily: 'Arial Black',
    fontWeight: 900,
    fontColor: '#ff6b6b',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 6, offsetY: 6, blur: 0, color: '#c44569' },
      outline: { enabled: true, width: 2, color: '#ffffff' },
    },
  },
  {
    id: 'glass',
    category: 'stylized',
    preview: 'GLASS',
    text: 'GLASS',
    fontSize: 58,
    fontFamily: 'Helvetica',
    fontWeight: 300,
    fontColor: 'rgba(255,255,255,0.8)',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 1, color: 'rgba(255,255,255,0.4)' },
    },
  },
  // More Curved
  {
    id: 'curved-smile',
    category: 'curved',
    preview: 'SMILE',
    text: 'SMILE',
    fontSize: 42,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ffcc00',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      curve: 40,
    },
  },
  {
    id: 'curved-rainbow',
    category: 'curved',
    preview: 'RAINBOW',
    text: 'RAINBOW',
    fontSize: 38,
    fontFamily: 'Arial',
    fontWeight: 700,
    fontColor: '#ff6b6b',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      curve: 60,
    },
  },
  {
    id: 'curved-subtle',
    category: 'curved',
    preview: 'Subtle Curve',
    text: 'Subtle Curve',
    fontSize: 34,
    fontFamily: 'Georgia',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      curve: 25,
    },
  },
  // Elegant & Professional
  {
    id: 'law-firm',
    category: 'headline',
    preview: 'SMITH & ASSOCIATES',
    text: 'SMITH & ASSOCIATES',
    fontSize: 44,
    fontFamily: 'Times New Roman',
    fontWeight: 400,
    fontColor: '#1a1a1a',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'invitation',
    category: 'stylized',
    preview: 'You are Invited',
    text: 'You are Invited',
    fontSize: 46,
    fontFamily: 'Brush Script MT',
    fontWeight: 400,
    fontColor: '#d4af37',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'signature',
    category: 'stylized',
    preview: 'Signature Style',
    text: 'Signature Style',
    fontSize: 48,
    fontFamily: 'Brush Script MT',
    fontWeight: 400,
    fontColor: '#2c3e50',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'chalk',
    category: 'stylized',
    preview: 'CHALK',
    text: 'CHALK',
    fontSize: 56,
    fontFamily: 'Comic Sans MS',
    fontWeight: 700,
    fontColor: '#f5f5dc',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 1, color: '#d3d3d3' },
    },
  },
  {
    id: 'stencil',
    category: 'stylized',
    preview: 'STENCIL',
    text: 'STENCIL',
    fontSize: 60,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#2d5016',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 2, color: '#1a1a1a' },
    },
  },
  {
    id: 'typewriter',
    category: 'body',
    preview: 'Typewriter text',
    text: 'Like an old typewriter...',
    fontSize: 18,
    fontFamily: 'Courier New',
    fontWeight: 400,
    fontColor: '#333333',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'handwritten',
    category: 'stylized',
    preview: 'Handwritten Note',
    text: 'Handwritten Note',
    fontSize: 40,
    fontFamily: 'Brush Script MT',
    fontWeight: 400,
    fontColor: '#1a1a80',
    effects: { ...DEFAULT_TEXT_EFFECTS },
  },
  {
    id: 'price-tag',
    category: 'stylized',
    preview: '$99.99',
    text: '$99.99',
    fontSize: 64,
    fontFamily: 'Arial Black',
    fontWeight: 900,
    fontColor: '#ff0000',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 3, color: '#ffff00' },
    },
  },
  {
    id: 'sale-banner',
    category: 'headline',
    preview: 'MEGA SALE',
    text: 'MEGA SALE',
    fontSize: 68,
    fontFamily: 'Impact',
    fontWeight: 400,
    fontColor: '#ffffff',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      shadow: { enabled: true, offsetX: 4, offsetY: 4, blur: 0, color: '#ff0000' },
      outline: { enabled: true, width: 3, color: '#ff0000' },
    },
  },
  {
    id: 'new-badge',
    category: 'stylized',
    preview: 'NEW!',
    text: 'NEW!',
    fontSize: 48,
    fontFamily: 'Arial Black',
    fontWeight: 900,
    fontColor: '#00cc00',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      outline: { enabled: true, width: 3, color: '#006600' },
    },
  },
  {
    id: 'coming-soon',
    category: 'headline',
    preview: 'COMING SOON',
    text: 'COMING SOON',
    fontSize: 52,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    fontColor: '#8a2be2',
    effects: {
      ...DEFAULT_TEXT_EFFECTS,
      glow: { enabled: true, color: '#8a2be2', intensity: 20 },
    },
  },
]

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'headline', label: 'Headlines', icon: <Heading1 className="w-4 h-4" /> },
  { id: 'subheading', label: 'Subheadings', icon: <Heading2 className="w-4 h-4" /> },
  { id: 'body', label: 'Body', icon: <AlignLeft className="w-4 h-4" /> },
  { id: 'stylized', label: 'Stylized', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'curved', label: 'Curved', icon: <CircleDot className="w-4 h-4" /> },
]

export function TextPanel() {
  const { i18n } = useTranslation()
  const isGerman = i18n.language === 'de'
  const { currentProject, addLayer, pushHistory, selectLayer } = useImageEditorStore()

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTemplates = TEXT_TEMPLATES.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = template.preview.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const addTextFromTemplate = (template: typeof TEXT_TEMPLATES[0]) => {
    if (!currentProject) return

    pushHistory('Add Text')

    // Calculate center position
    const centerX = Math.floor((currentProject.width - 300) / 2)
    const centerY = Math.floor((currentProject.height - template.fontSize * 1.5) / 2)

    const newLayer: Layer = {
      id: generateId(),
      name: `Text: ${template.text.slice(0, 15)}${template.text.length > 15 ? '...' : ''}`,
      type: 'text',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      x: centerX,
      y: centerY,
      width: 400,
      height: Math.ceil(template.fontSize * 1.5),
      rotation: 0,
      text: template.text,
      fontFamily: template.fontFamily,
      fontSize: template.fontSize,
      fontColor: template.fontColor,
      fontWeight: template.fontWeight,
      textAlign: 'center',
      textEffects: template.effects as TextEffects,
    }

    addLayer(newLayer)
    selectLayer(newLayer.id)
  }

  const addCustomText = () => {
    if (!currentProject) return

    pushHistory('Add Text')

    const centerX = Math.floor((currentProject.width - 200) / 2)
    const centerY = Math.floor((currentProject.height - 48) / 2)

    const newLayer: Layer = {
      id: generateId(),
      name: 'New Text',
      type: 'text',
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      x: centerX,
      y: centerY,
      width: 200,
      height: 60,
      rotation: 0,
      text: 'Your text here',
      fontFamily: 'Arial',
      fontSize: 32,
      fontColor: '#ffffff',
      fontWeight: 400,
      textAlign: 'center',
      textEffects: DEFAULT_TEXT_EFFECTS,
    }

    addLayer(newLayer)
    selectLayer(newLayer.id)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <Type className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">{isGerman ? 'Text' : 'Text'}</span>
        </div>

        {/* Add Custom Text Button */}
        <button
          onClick={addCustomText}
          className="w-full flex items-center justify-center gap-2 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors mb-3"
        >
          <Plus className="w-4 h-4" />
          {isGerman ? 'Text hinzufügen' : 'Add text'}
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={isGerman ? 'Suchen...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex justify-between px-2 py-1.5 border-b border-gray-800">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`p-1.5 rounded transition-colors ${
              selectedCategory === cat.id
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
            title={cat.label}
          >
            {cat.icon}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => addTextFromTemplate(template)}
              className="w-full p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-all hover:scale-[1.02] group"
            >
              <div
                className="truncate"
                style={{
                  fontFamily: template.fontFamily,
                  fontSize: Math.min(template.fontSize * 0.5, 28),
                  fontWeight: template.fontWeight,
                  color: template.fontColor,
                  textShadow: template.effects.shadow.enabled
                    ? `${template.effects.shadow.offsetX * 0.5}px ${template.effects.shadow.offsetY * 0.5}px ${template.effects.shadow.blur * 0.5}px ${template.effects.shadow.color}`
                    : template.effects.glow.enabled
                    ? `0 0 ${template.effects.glow.intensity * 0.5}px ${template.effects.glow.color}`
                    : 'none',
                  WebkitTextStroke: template.effects.outline.enabled
                    ? `${template.effects.outline.width * 0.5}px ${template.effects.outline.color}`
                    : 'none',
                }}
              >
                {template.preview}
              </div>
              <div className="text-[10px] text-gray-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isGerman ? 'Klicken zum Hinzufügen' : 'Click to add'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

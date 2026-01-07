import { useRef, useEffect } from 'react'

interface Ball {
  x: number
  y: number
  vx: number
  vy: number
}

interface Bumper {
  x: number
  y: number
  radius: number
  points: number
  hitTime: number
}

interface Target {
  x: number
  y: number
  width: number
  height: number
  points: number
  hitTime: number
}

interface Wall {
  x1: number
  y1: number
  x2: number
  y2: number
}

interface PinballCanvasProps {
  ball: Ball | null
  leftFlipperAngle: number
  rightFlipperAngle: number
  bumpers: Bumper[]
  targets: Target[]
  walls: Wall[]
  launchPower: number
  isLaunching: boolean
  canvasWidth: number
  canvasHeight: number
  ballRadius: number
  flipperLength: number
  flipperWidth: number
  flipperPivotY: number
  leftFlipperX: number
  rightFlipperX: number
}

export function PinballCanvas({
  ball,
  leftFlipperAngle,
  rightFlipperAngle,
  bumpers,
  targets,
  walls,
  launchPower,
  isLaunching,
  canvasWidth,
  canvasHeight,
  ballRadius,
  flipperLength,
  flipperWidth,
  flipperPivotY,
  leftFlipperX,
  rightFlipperX,
}: PinballCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight)
    bgGradient.addColorStop(0, '#1a1a2e')
    bgGradient.addColorStop(1, '#16213e')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    // Draw outer border
    ctx.strokeStyle = '#4a4a6e'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, canvasWidth - 4, canvasHeight - 4)

    // Draw walls (guide rails)
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 6
    ctx.lineCap = 'round'
    walls.forEach(wall => {
      ctx.beginPath()
      ctx.moveTo(wall.x1, wall.y1)
      ctx.lineTo(wall.x2, wall.y2)
      ctx.stroke()
    })

    // Draw launch lane
    ctx.fillStyle = '#2a2a4e'
    ctx.fillRect(canvasWidth - 45, 50, 40, canvasHeight - 50)
    ctx.strokeStyle = '#4a4a6e'
    ctx.lineWidth = 2
    ctx.strokeRect(canvasWidth - 45, 50, 40, canvasHeight - 50)

    // Draw launch power indicator
    if (isLaunching) {
      const powerHeight = (launchPower / 30) * 150
      const hue = 120 - (launchPower / 30) * 120 // Green to red
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`
      ctx.fillRect(canvasWidth - 40, canvasHeight - 60 - powerHeight, 30, powerHeight)

      // Power bar outline
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.strokeRect(canvasWidth - 40, canvasHeight - 210, 30, 150)
    }

    // Draw drain zone
    ctx.fillStyle = '#0d0d1a'
    const drainY = flipperPivotY + 60
    ctx.fillRect(leftFlipperX - 30, drainY, rightFlipperX - leftFlipperX + 60, canvasHeight - drainY)

    // Draw bumpers
    const now = Date.now()
    bumpers.forEach(bumper => {
      const isHit = now - bumper.hitTime < 150

      // Glow effect when hit
      if (isHit) {
        ctx.shadowColor = '#ff6b6b'
        ctx.shadowBlur = 20
      }

      const gradient = ctx.createRadialGradient(
        bumper.x - bumper.radius * 0.3, bumper.y - bumper.radius * 0.3, 0,
        bumper.x, bumper.y, bumper.radius
      )

      if (isHit) {
        gradient.addColorStop(0, '#ff8a8a')
        gradient.addColorStop(0.5, '#ff6b6b')
        gradient.addColorStop(1, '#c92a2a')
      } else {
        gradient.addColorStop(0, '#a5b4fc')
        gradient.addColorStop(0.5, '#818cf8')
        gradient.addColorStop(1, '#4f46e5')
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2)
      ctx.fill()

      // Ring
      ctx.strokeStyle = isHit ? '#ffa8a8' : '#c7d2fe'
      ctx.lineWidth = 3
      ctx.stroke()

      ctx.shadowBlur = 0

      // Points label
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(bumper.points.toString(), bumper.x, bumper.y)
    })

    // Draw targets
    targets.forEach(target => {
      const isHit = now - target.hitTime < 150

      if (isHit) {
        ctx.shadowColor = '#51cf66'
        ctx.shadowBlur = 15
        ctx.fillStyle = '#51cf66'
      } else {
        ctx.fillStyle = '#fbbf24'
      }

      ctx.fillRect(target.x, target.y, target.width, target.height)

      ctx.strokeStyle = isHit ? '#37b24d' : '#f59e0b'
      ctx.lineWidth = 2
      ctx.strokeRect(target.x, target.y, target.width, target.height)

      ctx.shadowBlur = 0
    })

    // Draw flippers
    const drawFlipper = (pivotX: number, pivotY: number, angle: number, isLeft: boolean) => {
      ctx.save()
      ctx.translate(pivotX, pivotY)

      if (isLeft) {
        ctx.rotate(angle)
      } else {
        ctx.scale(-1, 1)
        ctx.rotate(-angle)
      }

      // Flipper body gradient
      const flipperGradient = ctx.createLinearGradient(0, -flipperWidth / 2, flipperLength, flipperWidth / 2)
      flipperGradient.addColorStop(0, '#f472b6')
      flipperGradient.addColorStop(0.5, '#ec4899')
      flipperGradient.addColorStop(1, '#db2777')

      ctx.fillStyle = flipperGradient

      // Draw flipper shape (tapered rectangle)
      ctx.beginPath()
      ctx.moveTo(0, -flipperWidth / 2)
      ctx.lineTo(flipperLength - 5, -flipperWidth / 4)
      ctx.quadraticCurveTo(flipperLength + 3, 0, flipperLength - 5, flipperWidth / 4)
      ctx.lineTo(0, flipperWidth / 2)
      ctx.quadraticCurveTo(-5, 0, 0, -flipperWidth / 2)
      ctx.closePath()
      ctx.fill()

      // Flipper outline
      ctx.strokeStyle = '#fce7f3'
      ctx.lineWidth = 2
      ctx.stroke()

      // Pivot point
      ctx.fillStyle = '#be185d'
      ctx.beginPath()
      ctx.arc(0, 0, 8, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#fce7f3'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.restore()
    }

    // Draw left flipper
    drawFlipper(leftFlipperX, flipperPivotY, leftFlipperAngle, true)
    // Draw right flipper
    drawFlipper(rightFlipperX, flipperPivotY, rightFlipperAngle, false)

    // Draw ball with motion blur effect
    if (ball) {
      // Motion trail
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)
      if (speed > 3) {
        const trailLength = Math.min(speed * 2, 30)
        const angle = Math.atan2(-ball.vy, -ball.vx)

        const trailGradient = ctx.createLinearGradient(
          ball.x, ball.y,
          ball.x + Math.cos(angle) * trailLength,
          ball.y + Math.sin(angle) * trailLength
        )
        trailGradient.addColorStop(0, 'rgba(200, 200, 200, 0.4)')
        trailGradient.addColorStop(1, 'rgba(200, 200, 200, 0)')

        ctx.fillStyle = trailGradient
        ctx.beginPath()
        ctx.moveTo(ball.x - ballRadius * 0.5, ball.y)
        ctx.lineTo(ball.x + Math.cos(angle) * trailLength, ball.y + Math.sin(angle) * trailLength)
        ctx.lineTo(ball.x + ballRadius * 0.5, ball.y)
        ctx.closePath()
        ctx.fill()
      }

      // Ball with metallic gradient
      const ballGradient = ctx.createRadialGradient(
        ball.x - ballRadius * 0.3, ball.y - ballRadius * 0.3, 0,
        ball.x, ball.y, ballRadius
      )
      ballGradient.addColorStop(0, '#f0f0f0')
      ballGradient.addColorStop(0.3, '#d0d0d0')
      ballGradient.addColorStop(0.7, '#a0a0a0')
      ballGradient.addColorStop(1, '#707070')

      ctx.fillStyle = ballGradient
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2)
      ctx.fill()

      // Ball highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(ball.x - ballRadius * 0.3, ball.y - ballRadius * 0.3, ballRadius * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }

  }, [ball, leftFlipperAngle, rightFlipperAngle, bumpers, targets, walls, launchPower, isLaunching, canvasWidth, canvasHeight, ballRadius, flipperLength, flipperWidth, flipperPivotY, leftFlipperX, rightFlipperX])

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="rounded-lg shadow-2xl"
      style={{ imageRendering: 'crisp-edges' }}
    />
  )
}

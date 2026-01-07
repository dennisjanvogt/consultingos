import { useState, useCallback, useRef, useEffect } from 'react'
import { savePinballHighscore, getPinballBestScore } from '@/stores/pinballStore'

const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 700

// Physics constants
const GRAVITY = 0.25
const BALL_RADIUS = 8
const FRICTION = 0.995
const WALL_BOUNCE = 0.7
const BUMPER_BOUNCE = 1.5
const FLIPPER_HIT_POWER = 18
const FLIPPER_REST_POWER = 8

// Flipper config
const FLIPPER_LENGTH = 70
const FLIPPER_WIDTH = 12
const FLIPPER_PIVOT_Y = CANVAS_HEIGHT - 100
const LEFT_FLIPPER_X = 100
const RIGHT_FLIPPER_X = CANVAS_WIDTH - 100
const FLIPPER_REST_ANGLE = 25 * (Math.PI / 180)  // degrees from horizontal
const FLIPPER_UP_ANGLE = -25 * (Math.PI / 180)
const FLIPPER_SPEED = 0.35

interface Vec2 {
  x: number
  y: number
}

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

// Layout elements
const BUMPERS: Omit<Bumper, 'hitTime'>[] = [
  { x: 130, y: 180, radius: 25, points: 100 },
  { x: 200, y: 130, radius: 25, points: 100 },
  { x: 270, y: 180, radius: 25, points: 100 },
  { x: 165, y: 260, radius: 20, points: 150 },
  { x: 235, y: 260, radius: 20, points: 150 },
]

const TARGETS: Omit<Target, 'hitTime'>[] = [
  { x: 40, y: 300, width: 10, height: 50, points: 50 },
  { x: 350, y: 300, width: 10, height: 50, points: 50 },
  { x: 120, y: 80, width: 40, height: 10, points: 200 },
  { x: 240, y: 80, width: 40, height: 10, points: 200 },
]

// Slanted walls (guide rails)
const WALLS = [
  // Left rail
  { x1: 30, y1: 0, x2: 50, y2: FLIPPER_PIVOT_Y - 50 },
  { x1: 50, y1: FLIPPER_PIVOT_Y - 50, x2: LEFT_FLIPPER_X - 20, y2: FLIPPER_PIVOT_Y + 20 },
  // Right rail
  { x1: CANVAS_WIDTH - 30, y1: 0, x2: CANVAS_WIDTH - 50, y2: FLIPPER_PIVOT_Y - 50 },
  { x1: CANVAS_WIDTH - 50, y1: FLIPPER_PIVOT_Y - 50, x2: RIGHT_FLIPPER_X + 20, y2: FLIPPER_PIVOT_Y + 20 },
]

function vec2(x: number, y: number): Vec2 {
  return { x, y }
}

function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

function vecScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s }
}

function vecLength(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y)
}

function vecNormalize(v: Vec2): Vec2 {
  const len = vecLength(v)
  if (len === 0) return { x: 0, y: 0 }
  return { x: v.x / len, y: v.y / len }
}

function vecDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y
}

function vecReflect(v: Vec2, normal: Vec2): Vec2 {
  const dot = vecDot(v, normal)
  return vecSub(v, vecScale(normal, 2 * dot))
}

// Point to line segment distance
function pointToSegmentDistance(p: Vec2, a: Vec2, b: Vec2): { dist: number, closest: Vec2, t: number } {
  const ab = vecSub(b, a)
  const ap = vecSub(p, a)
  const lenSq = ab.x * ab.x + ab.y * ab.y

  if (lenSq === 0) {
    return { dist: vecLength(ap), closest: a, t: 0 }
  }

  let t = vecDot(ap, ab) / lenSq
  t = Math.max(0, Math.min(1, t))

  const closest = vecAdd(a, vecScale(ab, t))
  const dist = vecLength(vecSub(p, closest))

  return { dist, closest, t }
}

// Get perpendicular normal of line segment (pointing "up/left")
function getSegmentNormal(a: Vec2, b: Vec2): Vec2 {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return vecNormalize({ x: -dy, y: dx })
}

export function usePinballPhysics() {
  const [ball, setBall] = useState<Ball | null>(null)
  const [leftFlipperAngle, setLeftFlipperAngle] = useState(FLIPPER_REST_ANGLE)
  const [rightFlipperAngle, setRightFlipperAngle] = useState(-FLIPPER_REST_ANGLE)
  const [bumpers, setBumpers] = useState<Bumper[]>(() =>
    BUMPERS.map(b => ({ ...b, hitTime: 0 }))
  )
  const [targets, setTargets] = useState<Target[]>(() =>
    TARGETS.map(t => ({ ...t, hitTime: 0 }))
  )
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(getPinballBestScore)
  const [ballsLeft, setBallsLeft] = useState(3)
  const [multiplier, setMultiplier] = useState(1)
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchPower, setLaunchPower] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isRunning, setIsRunning] = useState(false)

  const leftFlipperPressed = useRef(false)
  const rightFlipperPressed = useRef(false)
  const leftFlipperVelocity = useRef(0)
  const rightFlipperVelocity = useRef(0)
  const animationFrameRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const scoreRef = useRef(score)

  useEffect(() => {
    scoreRef.current = score
  }, [score])

  const createBall = useCallback((): Ball => ({
    x: CANVAS_WIDTH - 25,
    y: CANVAS_HEIGHT - 150,
    vx: 0,
    vy: 0,
  }), [])

  const initGame = useCallback(() => {
    setBall(null)
    setLeftFlipperAngle(FLIPPER_REST_ANGLE)
    setRightFlipperAngle(-FLIPPER_REST_ANGLE)
    setBumpers(BUMPERS.map(b => ({ ...b, hitTime: 0 })))
    setTargets(TARGETS.map(t => ({ ...t, hitTime: 0 })))
    setScore(0)
    setBallsLeft(3)
    setMultiplier(1)
    setIsLaunching(false)
    setLaunchPower(0)
    setGameOver(false)
    setIsRunning(false)
    setBestScore(getPinballBestScore())
    leftFlipperVelocity.current = 0
    rightFlipperVelocity.current = 0
  }, [])

  const startGame = useCallback(() => {
    if (gameOver) {
      initGame()
    }
    setIsRunning(true)
    setBall(createBall())
    setIsLaunching(true)
  }, [gameOver, initGame, createBall])

  const launchBall = useCallback(() => {
    if (!isLaunching || !ball) return
    const power = 12 + launchPower * 0.4
    setBall(prev => prev ? {
      ...prev,
      vy: -power,
      vx: (Math.random() - 0.5) * 2,
    } : null)
    setIsLaunching(false)
    setLaunchPower(0)
  }, [isLaunching, ball, launchPower])

  const activateLeftFlipper = useCallback((active: boolean) => {
    leftFlipperPressed.current = active
  }, [])

  const activateRightFlipper = useCallback((active: boolean) => {
    rightFlipperPressed.current = active
  }, [])

  // Get flipper end point
  const getFlipperEnd = useCallback((pivotX: number, pivotY: number, angle: number, isLeft: boolean): Vec2 => {
    const dir = isLeft ? 1 : -1
    return {
      x: pivotX + Math.cos(angle) * FLIPPER_LENGTH * dir,
      y: pivotY + Math.sin(angle) * FLIPPER_LENGTH,
    }
  }, [])

  // Check ball vs flipper collision
  const checkFlipperCollision = useCallback((
    ballPos: Vec2,
    ballVel: Vec2,
    pivotX: number,
    pivotY: number,
    angle: number,
    flipperVel: number,
    isLeft: boolean
  ): { hit: boolean, newVel: Vec2 } => {
    const pivot = vec2(pivotX, pivotY)
    const end = getFlipperEnd(pivotX, pivotY, angle, isLeft)

    const { dist, closest, t } = pointToSegmentDistance(ballPos, pivot, end)

    if (dist < BALL_RADIUS + FLIPPER_WIDTH / 2) {
      // Calculate normal (perpendicular to flipper, pointing up)
      const flipperDir = vecNormalize(vecSub(end, pivot))
      const normal = vec2(-flipperDir.y, -Math.abs(flipperDir.x))

      // Flipper tip moves faster than pivot
      const hitPower = Math.abs(flipperVel) > 0.1
        ? FLIPPER_HIT_POWER * (0.5 + t * 0.5) // More power at tip
        : FLIPPER_REST_POWER

      // Reflect velocity and add flipper power
      let newVel = vecReflect(ballVel, normal)
      newVel = vecScale(newVel, WALL_BOUNCE)

      // Add upward boost when flipper is moving up
      if (flipperVel < -0.05) { // Moving up
        const boost = hitPower * (1 + Math.abs(flipperVel) * 2)
        newVel.y = Math.min(newVel.y, -boost)
        // Add some horizontal velocity towards center
        const centerDir = (CANVAS_WIDTH / 2 - ballPos.x) * 0.05
        newVel.x += centerDir
      }

      return { hit: true, newVel }
    }

    return { hit: false, newVel: ballVel }
  }, [getFlipperEnd])

  const updatePhysics = useCallback((deltaTime: number) => {
    if (!ball || isLaunching || gameOver) return

    const dt = Math.min(deltaTime / 16.67, 2) // Normalize to ~60fps, cap at 2x

    // Update flipper angles with velocity tracking
    const prevLeftAngle = leftFlipperAngle
    const prevRightAngle = rightFlipperAngle

    let newLeftAngle = leftFlipperAngle
    let newRightAngle = rightFlipperAngle

    const leftTarget = leftFlipperPressed.current ? FLIPPER_UP_ANGLE : FLIPPER_REST_ANGLE
    const rightTarget = rightFlipperPressed.current ? -FLIPPER_UP_ANGLE : -FLIPPER_REST_ANGLE

    newLeftAngle += (leftTarget - newLeftAngle) * FLIPPER_SPEED * dt
    newRightAngle += (rightTarget - newRightAngle) * FLIPPER_SPEED * dt

    leftFlipperVelocity.current = (newLeftAngle - prevLeftAngle) / dt
    rightFlipperVelocity.current = (newRightAngle - prevRightAngle) / dt

    setLeftFlipperAngle(newLeftAngle)
    setRightFlipperAngle(newRightAngle)

    // Update ball physics
    let newBall = { ...ball }

    // Apply gravity
    newBall.vy += GRAVITY * dt

    // Apply friction
    newBall.vx *= Math.pow(FRICTION, dt)
    newBall.vy *= Math.pow(FRICTION, dt)

    // Cap velocity
    const maxVel = 25
    const vel = vecLength(vec2(newBall.vx, newBall.vy))
    if (vel > maxVel) {
      newBall.vx = (newBall.vx / vel) * maxVel
      newBall.vy = (newBall.vy / vel) * maxVel
    }

    // Update position
    newBall.x += newBall.vx * dt
    newBall.y += newBall.vy * dt

    // Wall collisions
    if (newBall.x - BALL_RADIUS < 0) {
      newBall.x = BALL_RADIUS
      newBall.vx = Math.abs(newBall.vx) * WALL_BOUNCE
    }
    if (newBall.x + BALL_RADIUS > CANVAS_WIDTH) {
      newBall.x = CANVAS_WIDTH - BALL_RADIUS
      newBall.vx = -Math.abs(newBall.vx) * WALL_BOUNCE
    }
    if (newBall.y - BALL_RADIUS < 0) {
      newBall.y = BALL_RADIUS
      newBall.vy = Math.abs(newBall.vy) * WALL_BOUNCE
    }

    // Slanted wall collisions
    for (const wall of WALLS) {
      const ballPos = vec2(newBall.x, newBall.y)
      const a = vec2(wall.x1, wall.y1)
      const b = vec2(wall.x2, wall.y2)
      const { dist, closest } = pointToSegmentDistance(ballPos, a, b)

      if (dist < BALL_RADIUS) {
        const normal = getSegmentNormal(a, b)
        // Make sure normal points away from ball
        const toCenter = vecSub(vec2(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2), closest)
        if (vecDot(normal, toCenter) < 0) {
          normal.x = -normal.x
          normal.y = -normal.y
        }

        const ballVel = vec2(newBall.vx, newBall.vy)
        const reflected = vecReflect(ballVel, normal)
        newBall.vx = reflected.x * WALL_BOUNCE
        newBall.vy = reflected.y * WALL_BOUNCE

        // Push ball out of wall
        const push = vecScale(normal, BALL_RADIUS - dist + 1)
        newBall.x += push.x
        newBall.y += push.y
      }
    }

    // Flipper collisions
    const ballPos = vec2(newBall.x, newBall.y)
    const ballVel = vec2(newBall.vx, newBall.vy)

    // Left flipper
    const leftResult = checkFlipperCollision(
      ballPos, ballVel,
      LEFT_FLIPPER_X, FLIPPER_PIVOT_Y,
      newLeftAngle, leftFlipperVelocity.current, true
    )
    if (leftResult.hit) {
      newBall.vx = leftResult.newVel.x
      newBall.vy = leftResult.newVel.y
      // Push ball above flipper
      newBall.y = Math.min(newBall.y, FLIPPER_PIVOT_Y - BALL_RADIUS - FLIPPER_WIDTH)
    }

    // Right flipper
    const rightResult = checkFlipperCollision(
      vec2(newBall.x, newBall.y), vec2(newBall.vx, newBall.vy),
      RIGHT_FLIPPER_X, FLIPPER_PIVOT_Y,
      newRightAngle, rightFlipperVelocity.current, false
    )
    if (rightResult.hit) {
      newBall.vx = rightResult.newVel.x
      newBall.vy = rightResult.newVel.y
      newBall.y = Math.min(newBall.y, FLIPPER_PIVOT_Y - BALL_RADIUS - FLIPPER_WIDTH)
    }

    // Bumper collisions
    const now = Date.now()
    setBumpers(prevBumpers => {
      return prevBumpers.map(bumper => {
        const dx = newBall.x - bumper.x
        const dy = newBall.y - bumper.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const minDist = BALL_RADIUS + bumper.radius

        if (dist < minDist && now - bumper.hitTime > 100) {
          // Bounce off bumper
          const angle = Math.atan2(dy, dx)
          const speed = vecLength(vec2(newBall.vx, newBall.vy))
          const bounceSpeed = Math.max(speed, 8) * BUMPER_BOUNCE

          newBall.vx = Math.cos(angle) * bounceSpeed
          newBall.vy = Math.sin(angle) * bounceSpeed

          // Push ball out
          newBall.x = bumper.x + Math.cos(angle) * (minDist + 2)
          newBall.y = bumper.y + Math.sin(angle) * (minDist + 2)

          // Score
          setScore(s => {
            const newScore = s + bumper.points * multiplier
            if (newScore > bestScore) {
              setBestScore(newScore)
            }
            return newScore
          })
          setMultiplier(m => Math.min(m + 0.2, 5))

          return { ...bumper, hitTime: now }
        }
        return bumper
      })
    })

    // Target collisions
    setTargets(prevTargets => {
      return prevTargets.map(target => {
        const inX = newBall.x + BALL_RADIUS > target.x && newBall.x - BALL_RADIUS < target.x + target.width
        const inY = newBall.y + BALL_RADIUS > target.y && newBall.y - BALL_RADIUS < target.y + target.height

        if (inX && inY && now - target.hitTime > 200) {
          // Bounce
          if (target.width > target.height) {
            newBall.vy = -Math.abs(newBall.vy) * WALL_BOUNCE
            if (newBall.y > target.y + target.height / 2) {
              newBall.y = target.y + target.height + BALL_RADIUS
            } else {
              newBall.y = target.y - BALL_RADIUS
            }
          } else {
            newBall.vx = -newBall.vx * WALL_BOUNCE
          }

          setScore(s => {
            const newScore = s + target.points * multiplier
            if (newScore > bestScore) {
              setBestScore(newScore)
            }
            return newScore
          })

          return { ...target, hitTime: now }
        }
        return target
      })
    })

    // Check if ball fell through bottom
    if (newBall.y > CANVAS_HEIGHT + BALL_RADIUS * 2) {
      const newBallsLeft = ballsLeft - 1
      setBallsLeft(newBallsLeft)

      if (newBallsLeft <= 0) {
        setGameOver(true)
        setIsRunning(false)
        savePinballHighscore(scoreRef.current)
        setBall(null)
        return
      } else {
        setMultiplier(1)
        setBall(createBall())
        setIsLaunching(true)
        return
      }
    }

    setBall(newBall)
  }, [ball, isLaunching, gameOver, leftFlipperAngle, rightFlipperAngle, multiplier, bestScore, ballsLeft, checkFlipperCollision, createBall])

  // Game loop with delta time
  useEffect(() => {
    if (!isRunning || gameOver) return

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp
      }
      const deltaTime = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      updatePhysics(deltaTime)
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }

    lastTimeRef.current = 0
    animationFrameRef.current = requestAnimationFrame(gameLoop)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [isRunning, gameOver, updatePhysics])

  // Launch power charging
  useEffect(() => {
    if (!isLaunching) return

    const interval = setInterval(() => {
      setLaunchPower(prev => (prev + 1.5) % 30)
    }, 50)

    return () => clearInterval(interval)
  }, [isLaunching])

  return {
    ball,
    leftFlipperAngle,
    rightFlipperAngle,
    bumpers,
    targets,
    score,
    bestScore,
    ballsLeft,
    multiplier,
    isLaunching,
    launchPower,
    gameOver,
    isRunning,
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    ballRadius: BALL_RADIUS,
    flipperLength: FLIPPER_LENGTH,
    flipperWidth: FLIPPER_WIDTH,
    flipperPivotY: FLIPPER_PIVOT_Y,
    leftFlipperX: LEFT_FLIPPER_X,
    rightFlipperX: RIGHT_FLIPPER_X,
    walls: WALLS,
    initGame,
    startGame,
    launchBall,
    activateLeftFlipper,
    activateRightFlipper,
  }
}

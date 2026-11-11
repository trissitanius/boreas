// The floating weight plate, kettlebell and dumbbell on the welcome page. Website only; loaded separately.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ACESFilmicToneMapping, Group, MathUtils, SRGBColorSpace } from 'three'
import { prefersReducedMotion } from '../lib/webgl'
import { COLORS, createMaterials, createObjects, createStudioEnvironment } from './three/scene'

/** Real sizes (metres) of each object, used to scale them to the screen. */
const SIZE = { plate: 0.45, kettlebell: 0.292, dumbbell: 0.35 }

interface Pose {
  x: number
  y: number
  /** Size on screen, as a share of the layout unit. */
  size: number
  rx: number
  ry: number
  rz: number
}

/** Where the objects sit: stacked diagonally on phones, spread out on wide screens. */
export function layout(width: number, height: number): Record<keyof typeof SIZE, Pose> {
  const portrait = width / height < 0.85
  if (portrait) {
    // Phones: the objects fill the open space between the headline and the text below it,
    // so the headline always stays readable.
    return keepInside(width, height, {
      plate: { x: 0.24 * width, y: 0.03 * height, size: 0.42 * width, rx: 0.32, ry: -0.5, rz: 0.1 },
      kettlebell: { x: -0.25 * width, y: -0.13 * height, size: 0.34 * width, rx: 0.12, ry: 0.6, rz: 0.18 },
      dumbbell: { x: 0.12 * width, y: -0.32 * height, size: 0.52 * width, rx: 0.45, ry: 0.75, rz: -0.32 },
    })
  }
  // Wide screens: the canvas is the centered page frame; the objects fill its right half,
  // next to the headline on the left.
  const unit = Math.min(width, height * 1.6)
  return keepInside(width, height, {
    plate: { x: 0.27 * width, y: 0.2 * height, size: 0.3 * unit, rx: 0.32, ry: -0.55, rz: 0.1 },
    kettlebell: { x: 0.06 * width, y: -0.2 * height, size: 0.19 * unit, rx: 0.12, ry: 0.6, rz: 0.18 },
    dumbbell: { x: 0.34 * width, y: -0.2 * height, size: 0.28 * unit, rx: 0.45, ry: 0.75, rz: -0.32 },
  })
}

/**
 * Moves each object in just enough that all of it stays on the canvas (never cut off at an edge),
 * whatever the screen shape. An object's size is its longest side, so half of it is the farthest
 * it can reach from its centre in any rotation.
 */
function keepInside<T extends Record<string, Pose>>(width: number, height: number, poses: T): T {
  const margin = 0.03 * Math.min(width, height) + 0.02 * height // edge gap + room for the gentle bobbing
  const clamp = (v: number, limit: number) => Math.sign(v) * Math.min(Math.abs(v), Math.max(0, limit))
  const out = {} as T
  for (const [key, pose] of Object.entries(poses) as [keyof T, Pose][]) {
    const reach = pose.size / 2
    out[key] = {
      ...pose,
      x: clamp(pose.x, width / 2 - reach - margin),
      y: clamp(pose.y, height / 2 - reach - margin),
    } as T[keyof T]
  }
  return out
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - MathUtils.clamp(t, 0, 1), 3)

function HeroScene({ still }: { still: boolean }) {
  const { gl, scene, viewport, invalidate } = useThree()
  const materials = useMemo(createMaterials, [])
  const objects = useMemo(() => createObjects(materials), [materials])
  const rig = useRef<Group>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const scroll = useRef(0)
  const poses = layout(viewport.width, viewport.height)

  // Studio reflections, made once.
  useEffect(() => {
    const env = createStudioEnvironment(gl)
    scene.environment = env
    scene.environmentIntensity = 2.1
    invalidate()
    return () => {
      scene.environment = null
      env.dispose()
    }
  }, [gl, scene, invalidate])

  // Free the GPU memory when leaving the page.
  useEffect(
    () => () => {
      Object.values(objects).forEach((g) => g.traverse((o) => 'geometry' in o && (o as { geometry: { dispose(): void } }).geometry.dispose()))
      Object.values(materials).forEach((m) => {
        m.bumpMap?.dispose()
        m.dispose()
      })
    },
    [objects, materials],
  )

  // Finger / mouse position and scroll, smoothed in the frame loop.
  useEffect(() => {
    if (still) return
    const onPointer = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -((e.clientY / window.innerHeight) * 2 - 1) }
    }
    const onScroll = () => {
      scroll.current = Math.min(window.scrollY / window.innerHeight, 1)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [still])

  const keys = ['plate', 'kettlebell', 'dumbbell'] as const

  useFrame((state, delta) => {
    // In "still" mode (reduce motion), everything sits in its final pose.
    const t = still ? 100 : state.clock.elapsedTime
    keys.forEach((key, i) => {
      const obj = objects[key]
      const pose = poses[key]
      const intro = still ? 1 : easeOutCubic((t - 0.15 - i * 0.22) / 1.3)
      const scale = (pose.size / SIZE[key]) * (0.88 + 0.12 * intro)
      const spread = 1 + scroll.current * 0.25
      obj.scale.setScalar(scale)
      obj.position.set(
        pose.x * spread,
        pose.y - (1 - intro) * 0.55 * viewport.height + Math.sin(t * 0.55 + i * 2.1) * 0.018 * viewport.height,
        0,
      )
      const turnIn = (1 - intro) * 0.35
      // Slow tumble. The plate only sways (so its lettering never shows mirrored); the others turn further.
      const sway = key === 'plate' ? Math.sin(t * 0.22) * 0.45 : t * (i === 1 ? 0.16 : -0.11)
      obj.rotation.set(
        pose.rx + Math.sin(t * 0.31 + i) * 0.12 + turnIn,
        pose.ry + sway - turnIn,
        pose.rz + Math.sin(t * 0.27 + i * 1.7) * 0.06,
      )
    })
    if (rig.current) {
      const k = 1 - Math.pow(0.001, delta) // smooth, frame-rate independent
      rig.current.rotation.x = MathUtils.lerp(rig.current.rotation.x, -pointer.current.y * 0.1, k)
      rig.current.rotation.y = MathUtils.lerp(rig.current.rotation.y, pointer.current.x * 0.16, k)
      rig.current.position.y = MathUtils.lerp(rig.current.position.y, scroll.current * 0.35 * viewport.height, k)
    }
  })

  return (
    <>
      <ambientLight intensity={0.12} color={COLORS.frozen} />
      {/* Soft key light from above, cool white */}
      <directionalLight position={[2.5, 4, 3.5]} intensity={4} color="#e4edf7" />
      {/* Ember rim light from straight behind: only grazing edges catch it, so it stays a thin line */}
      <directionalLight position={[-0.4, 0.6, -5]} intensity={0.9} color={COLORS.ember} />
      {/* Frozen fill from the left */}
      <directionalLight position={[-4, 0.5, 2]} intensity={0.9} color={COLORS.frozen} />
      <group ref={rig}>
        <primitive object={objects.plate} />
        <primitive object={objects.kettlebell} />
        <primitive object={objects.dumbbell} />
      </group>
    </>
  )
}

interface Props {
  /** Render one still frame (for "reduce motion" and for making the fallback image). */
  still?: boolean
}

export default function Hero3D({ still: forceStill = false }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const [onScreen, setOnScreen] = useState(true)
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')
  const still = forceStill || prefersReducedMotion()

  // Stop drawing when the hero is scrolled away or the tab is hidden (saves battery).
  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    io.observe(el)
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div ref={box} className={`hero-canvas${ready ? ' is-ready' : ''}`} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop={still ? 'demand' : onScreen && pageVisible ? 'always' : 'never'}
        camera={{ fov: 28, position: [0, 0, 4.2], near: 0.1, far: 30 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: forceStill,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.05
          requestAnimationFrame(() => setReady(true))
        }}
      >
        <HeroScene still={still} />
      </Canvas>
    </div>
  )
}

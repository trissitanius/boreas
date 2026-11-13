// The 3D Boreas mark: the weight plate from the welcome page, carried by three streaks of
// north wind (Frozen), with an Ember core. Rendered here once and saved as image files
// (see render-icons.mjs), so the app itself never loads any 3D code for its logo.
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CapsuleGeometry,
  DirectionalLight,
  AmbientLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { COLORS, createMaterials, createObjects, createStudioEnvironment } from '../src/landing/three/scene'

const RENDER = 1024

const gl = document.createElement('canvas')
gl.width = gl.height = RENDER
const renderer = new WebGLRenderer({ canvas: gl, antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.setSize(RENDER, RENDER, false)
renderer.toneMapping = ACESFilmicToneMapping
renderer.toneMappingExposure = 1.25
renderer.outputColorSpace = SRGBColorSpace

const scene = new Scene()
scene.environment = createStudioEnvironment(renderer)
scene.environmentIntensity = 2.6

scene.add(new AmbientLight(COLORS.frozen, 0.2))
const key = new DirectionalLight('#e4edf7', 4.5)
key.position.set(2.5, 4, 3.5)
const fill = new DirectionalLight(COLORS.frozen, 1.6)
fill.position.set(-4, 0.5, 2)
const rim = new DirectionalLight(COLORS.frozen, 2.2)
rim.position.set(0.5, -1.5, -4)
scene.add(key, fill, rim)

// Everything sits a little right of centre, so plate + wind together are centred.
const mark = new Group()
mark.position.x = 0.095
scene.add(mark)

const plate = createObjects(createMaterials()).plate
plate.rotation.set(0.2, -0.5, 0.06)
mark.add(plate)

// Ember core in the bar hole, and its glow on the hub around it.
const ember = new Mesh(
  new SphereGeometry(0.03, 32, 32),
  new MeshBasicMaterial({ color: COLORS.ember.clone().multiplyScalar(1.6), toneMapped: false }),
)
mark.add(ember)
const emberGlow = new PointLight(COLORS.ember, 0.16, 0.5)
emberGlow.position.set(0.02, 0.01, 0.09)
mark.add(emberGlow)

// Three streaks of wind trailing off to the left. They tuck in just behind the plate's edge
// and fade out toward their tails.
const fade = document.createElement('canvas')
fade.width = 4
fade.height = 256
const fadeCtx = fade.getContext('2d')!
const gradient = fadeCtx.createLinearGradient(0, 256, 0, 0) // bottom of the texture = the end at the plate
// An alpha map is read from brightness: white = solid, black = see-through.
gradient.addColorStop(0, '#fff')
gradient.addColorStop(0.4, '#eee')
gradient.addColorStop(1, '#000')
fadeCtx.fillStyle = gradient
fadeCtx.fillRect(0, 0, 4, 256)
const windMaterial = new MeshBasicMaterial({
  color: COLORS.frozen,
  alphaMap: new CanvasTexture(fade),
  transparent: true,
  toneMapped: false,
})
const streaks: [y: number, from: number, to: number][] = [
  [0.105, -0.37, -0.17],
  [0, -0.47, -0.19],
  [-0.105, -0.33, -0.17],
]
for (const [y, from, to] of streaks) {
  const rod = new Mesh(new CapsuleGeometry(0.018, to - from, 8, 24), windMaterial)
  rod.rotation.z = Math.PI / 2 // the capsule's top end now points left: that's the fading tail
  rod.position.set((from + to) / 2, y, -0.06)
  mark.add(rod)
}

const camera = new PerspectiveCamera(28, 1, 0.1, 30)

interface Options {
  /** Finished size in pixels. */
  size: number
  /** Extra room around the mark, so Android can crop the icon to any shape. */
  maskable?: boolean
  /** No background: just the mark (for use on top of the page). */
  transparent?: boolean
  /** Save as WebP (much smaller) instead of PNG. */
  webp?: boolean
}

/** Draws the icon and returns it as a data URL. */
function renderIcon({ size, maskable = false, transparent = false, webp = false }: Options): string {
  camera.position.set(0, 0, transparent ? 1.5 : maskable ? 2.15 : 1.62)
  camera.lookAt(0, 0, 0)
  renderer.render(scene, camera)

  const big = document.createElement('canvas')
  big.width = big.height = RENDER
  const ctx = big.getContext('2d')!
  if (!transparent) {
    ctx.fillStyle = '#080813'
    ctx.fillRect(0, 0, RENDER, RENDER)
    // Icy glow behind the plate, so its dark shape reads clearly even at home-screen size.
    const scale = maskable ? 0.8 : 1
    const cx = RENDER * (0.5 + 0.06 * scale)
    const glow = ctx.createRadialGradient(cx, RENDER * 0.5, 0, cx, RENDER * 0.5, RENDER * 0.52 * scale)
    glow.addColorStop(0, 'rgba(160, 189, 219, 0.62)')
    glow.addColorStop(0.45, 'rgba(58, 78, 170, 0.5)')
    glow.addColorStop(1, 'rgba(8, 8, 19, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, RENDER, RENDER)
  }
  // Soft bloom (a blurred copy underneath), then the sharp render.
  ctx.filter = `blur(${RENDER / 40}px)`
  ctx.globalAlpha = 0.55
  ctx.drawImage(gl, 0, 0)
  ctx.filter = 'none'
  ctx.globalAlpha = 1
  ctx.drawImage(gl, 0, 0)

  // Shrink in halves for clean edges.
  let current = big
  while (current.width / 2 >= size) {
    const half = document.createElement('canvas')
    half.width = half.height = current.width / 2
    const h = half.getContext('2d')!
    h.imageSmoothingQuality = 'high'
    h.drawImage(current, 0, 0, half.width, half.height)
    current = half
  }
  const out = document.createElement('canvas')
  out.width = out.height = size
  const o = out.getContext('2d')!
  o.imageSmoothingQuality = 'high'
  o.drawImage(current, 0, 0, size, size)
  return webp ? out.toDataURL('image/webp', 0.92) : out.toDataURL('image/png')
}

declare global {
  interface Window {
    renderIcon: typeof renderIcon
  }
}
window.renderIcon = renderIcon

// Preview when the page is opened by hand.
const preview = new Image()
preview.src = renderIcon({ size: 512 })
preview.style.cssText = 'width:512px;height:512px;margin:24px;border-radius:112px'
document.body.append(preview)

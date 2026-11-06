// Materials, the studio light setup (built in code) and the three finished objects.
import {
  BackSide,
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  type Texture,
  type WebGLRenderer,
} from 'three'
import { dumbbellParts, kettlebellParts, plateParts, type MaterialKey, type Part } from './models'
import { ironGrain, knurling, plateLettering } from './textures'

// Palette (same as the CSS variables)
export const COLORS = {
  blackIris: new Color('#080813'),
  frozen: new Color('#A0BDDB'),
  ember: new Color('#FF7A45'),
  deepBlue: new Color('#2A3A8C'),
}

export function createMaterials(): Record<MaterialKey, MeshPhysicalMaterial> {
  const lettering = plateLettering()
  const grain = ironGrain()
  const knurl = knurling()
  const matteBlack = {
    color: new Color('#121219'),
    roughness: 0.4,
    metalness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.22,
  }
  return {
    black: new MeshPhysicalMaterial(matteBlack),
    // Rubber-coated dumbbell heads: softer sheen, so big flat faces don't mirror the lights.
    rubber: new MeshPhysicalMaterial({ ...matteBlack, roughness: 0.62, metalness: 0.05, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    plateFace: new MeshPhysicalMaterial({ ...matteBlack, bumpMap: lettering, bumpScale: 2.2 }),
    iron: new MeshPhysicalMaterial({
      color: new Color('#15151c'),
      roughness: 0.5,
      metalness: 0.4,
      clearcoat: 0.55,
      clearcoatRoughness: 0.35,
      bumpMap: grain,
      bumpScale: 0.6,
    }),
    chrome: new MeshPhysicalMaterial({ color: new Color('#b9c3cf'), metalness: 1, roughness: 0.14 }),
    knurl: new MeshPhysicalMaterial({
      color: new Color('#aab4c0'),
      metalness: 1,
      roughness: 0.26,
      bumpMap: knurl,
      bumpScale: 1.4,
    }),
  }
}

/**
 * A small dark "photo studio" for reflections: soft Frozen light panels and a deep blue fill.
 * Turned into an environment map once (PMREM), so materials reflect it like a real room.
 */
export function createStudioEnvironment(renderer: WebGLRenderer): Texture {
  const studio = new Scene()
  const room = new Mesh(new BoxGeometry(20, 20, 20), new MeshBasicMaterial({ color: '#030308', side: BackSide }))
  studio.add(room)
  // Each panel faces the middle of the room.
  const panel = (color: Color, intensity: number, w: number, h: number, x: number, y: number, z: number) => {
    const m = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), side: DoubleSide }),
    )
    m.position.set(x, y, z)
    m.lookAt(0, 0, 0)
    studio.add(m)
  }
  panel(COLORS.frozen, 3.2, 10, 4, 0, 8, 2) // soft box above
  panel(COLORS.frozen, 2.4, 2.5, 9, -8, 1, 3) // tall strip left
  panel(COLORS.frozen, 1.6, 2, 8, 8, 0, 4) // tall strip right
  panel(COLORS.frozen, 0.9, 6, 2, 0, -1, 9) // low strip in front (catches top edges)
  panel(COLORS.deepBlue, 2.2, 12, 7, 0, -2, -9) // deep blue fill behind
  const pmrem = new PMREMGenerator(renderer)
  const env = pmrem.fromScene(studio, 0.03).texture
  pmrem.dispose()
  return env
}

function build(parts: Part[], materials: Record<MaterialKey, MeshPhysicalMaterial>): Group {
  const group = new Group()
  for (const part of parts) {
    const mesh = new Mesh(part.geometry, materials[part.material])
    mesh.name = part.name
    group.add(mesh)
  }
  return group
}

export function createObjects(materials: Record<MaterialKey, MeshPhysicalMaterial>) {
  return {
    plate: build(plateParts(), materials),
    kettlebell: build(kettlebellParts(), materials),
    dumbbell: build(dumbbellParts(), materials),
  }
}

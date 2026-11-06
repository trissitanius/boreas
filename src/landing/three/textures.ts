// Surface details drawn on a canvas (no image files): plate lettering, handle knurling, cast-iron grain.
// Used as bump maps: white = raised.
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { PLATE } from './models'

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  return { c, ctx }
}

/**
 * Raised "20 KG" and a curved "BOREAS" on the plate face, plus two fine rings.
 * The face's UVs are its x/y in metres, so the canvas covers -0.2…0.2 m and is mapped with repeat/offset.
 */
export function plateLettering(): Texture {
  const size = 2048
  const span = 0.4 // metres covered by the canvas
  const { c, ctx } = canvas(size)
  const px = (m: number) => (m / span) * size // metres → pixels
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.translate(size / 2, size / 2)

  // Two thin raised rings
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = px(0.0018)
  for (const r of [PLATE.hubRadius + 0.006, PLATE.rimInner - 0.006]) {
    ctx.beginPath()
    ctx.arc(0, 0, px(r), 0, Math.PI * 2)
    ctx.stroke()
  }

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // "20 KG" big, at the bottom between two grip slots (canvas y points down).
  ctx.font = `900 ${px(0.034)}px "Arial Black", "Segoe UI", system-ui, sans-serif`
  ctx.fillText('20 KG', 0, px(PLATE.slotCenterRadius))

  // "BOREAS" curved along the top, between the top grip slot and the rim.
  const text = 'BOREAS'
  const radius = px(0.1722)
  ctx.font = `900 ${px(0.019)}px "Arial Black", "Segoe UI", system-ui, sans-serif`
  const spacing = 0.118 // radians per letter
  text.split('').forEach((ch, i) => {
    const a = -Math.PI / 2 + (i - (text.length - 1) / 2) * spacing
    ctx.save()
    ctx.rotate(a + Math.PI / 2)
    ctx.fillText(ch, 0, -radius)
    ctx.restore()
  })

  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = ClampToEdgeWrapping
  tex.repeat.set(1 / span, 1 / span)
  tex.offset.set(0.5, 0.5)
  tex.anisotropy = 8
  return tex
}

/** Diamond knurling for the dumbbell handle. */
export function knurling(): Texture {
  const size = 128
  const { c, ctx } = canvas(size)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#000'
  ctx.lineWidth = size * 0.12
  for (const dir of [1, -1]) {
    ctx.beginPath()
    for (let k = -2; k <= 2; k++) {
      ctx.moveTo(k * size, dir > 0 ? 0 : size)
      ctx.lineTo(k * size + size, dir > 0 ? size : 0)
    }
    ctx.stroke()
  }
  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(26, 14)
  tex.anisotropy = 8
  return tex
}

/** Fine speckled grain for cast iron (a seeded pattern, so it looks the same every time). */
export function ironGrain(): Texture {
  const size = 512
  const { c, ctx } = canvas(size)
  ctx.fillStyle = '#808080'
  ctx.fillRect(0, 0, size, size)
  let seed = 7
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 9000; i++) {
    const v = Math.floor(90 + rand() * 90)
    ctx.fillStyle = `rgb(${v},${v},${v})`
    const r = 0.6 + rand() * 1.6
    ctx.beginPath()
    ctx.arc(rand() * size, rand() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new CanvasTexture(c)
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(3, 3)
  tex.colorSpace = SRGBColorSpace
  return tex
}

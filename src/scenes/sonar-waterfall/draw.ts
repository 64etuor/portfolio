import { CHANNELS } from './data'
import { NCH, TOP } from './constants'
import { lutRGB } from './runtime'
import type { Engine } from './types'

function drawStaticOverlay(g: CanvasRenderingContext2D, engine: Engine) {
  const W = engine.w
  const H = engine.h
  const sx = W / engine.history.width

  g.font = "9px 'Share Tech Mono', 'Pretendard Variable', monospace"
  g.textBaseline = 'top'
  g.textAlign = 'left'

  for (let c = 0; c < NCH; c++) {
    const x = engine.chX[c] * sx
    const cw = engine.colW * sx
    g.strokeStyle = 'rgba(72,230,255,0.16)'
    g.lineWidth = 1
    g.strokeRect(x + 0.5, TOP + 0.5, cw - 1, H - TOP - 1)

    g.strokeStyle = 'rgba(72,230,255,0.07)'
    for (let gy = 1; gy < 6; gy++) {
      const yy = TOP + ((H - TOP) * gy) / 6
      g.beginPath()
      g.moveTo(x, yy)
      g.lineTo(x + cw, yy)
      g.stroke()
    }

    g.fillStyle = 'rgba(2,8,16,0.82)'
    g.fillRect(x, TOP, cw, 15)
    g.fillStyle = CHANNELS[c].color
    g.fillText(`${CHANNELS[c].id} ${CHANNELS[c].freq}`, x + 4, TOP + 3)
  }

  g.save()
  g.font = "10px 'Pretendard Variable', sans-serif"
  for (let c = 0; c < NCH; c++) {
    const x = engine.chX[c] * sx
    const cw = engine.colW * sx
    g.save()
    g.translate(x + cw / 2, H - 8)
    g.fillStyle = CHANNELS[c].color
    g.globalAlpha = 0.9
    g.textAlign = 'center'
    g.fillText(CHANNELS[c].name, 0, -2)
    g.restore()
  }
  g.restore()
}

function drawDynamicOverlay(g: CanvasRenderingContext2D, engine: Engine) {
  drawStaticOverlay(g, engine)
  if (engine.doeRowY < 0) return

  const sx = engine.w / engine.history.width
  const cw = engine.colW * sx
  const x = engine.chX[3] * sx
  const y = engine.doeRowY

  g.save()
  g.strokeStyle = '#ffe27a'
  g.lineWidth = 1.5
  g.setLineDash([5, 3])
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + cw, y)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = 'rgba(8,16,4,0.88)'
  g.fillRect(x + 3, y + 2, 262, 13)
  g.fillStyle = '#ffe27a'
  g.font = "9px 'Share Tech Mono', 'Pretendard Variable', monospace"
  g.textBaseline = 'top'
  g.textAlign = 'left'
  g.fillText('◆ DOE LOCK: 진폭×가압력×용착시간 최적점 · 불량율 로브 냉각', x + 6, y + 4)
  g.restore()
}

export function drawVisible(g: CanvasRenderingContext2D, engine: Engine) {
  g.save()
  g.clearRect(0, 0, engine.w, engine.h)
  g.imageSmoothingEnabled = false
  g.drawImage(engine.history, 0, 0, engine.history.width, engine.history.height, 0, 0, engine.w, engine.h)
  drawDynamicOverlay(g, engine)
  g.restore()
}


export function drawLut(canvas: HTMLCanvasElement | null) {
  if (!canvas) return
  canvas.width = 260
  canvas.height = 14
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = ctx.createImageData(canvas.width, canvas.height)
  for (let x = 0; x < canvas.width; x++) {
    const [r, g, b] = lutRGB(x / (canvas.width - 1))
    for (let y = 0; y < canvas.height; y++) {
      const o = (y * canvas.width + x) * 4
      img.data[o] = r
      img.data[o + 1] = g
      img.data[o + 2] = b
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
}



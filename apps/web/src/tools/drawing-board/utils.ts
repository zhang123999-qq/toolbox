/**
 * drawing-board（#798）纯函数：颜色解析与洪水填充。
 * 全部操作在 ImageData 上完成，与 DOM 解耦，便于单测。
 */

export type RGBA = readonly [number, number, number, number]

/** '#rrggbb' / '#rgb' → [r, g, b, 255]；非法输入回落黑色 */
export function hexToRgba(hex: string): RGBA {
  let h = hex.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return [0, 0, 0, 255]
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
    255,
  ]
}

function colorAt(data: Uint8ClampedArray, i: number): string {
  return `${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`
}

/**
 * 扫描线洪水填充：把 (x, y) 所在连通区域改成 fill 颜色。
 * 直接原地修改传入的 ImageData。
 */
export function floodFill(image: ImageData, x: number, y: number, fill: RGBA): void {
  const { width, height, data } = image
  if (x < 0 || y < 0 || x >= width || y >= height) return
  const start = (y * width + x) * 4
  const target = colorAt(data, start)
  const replacement = `${fill[0]},${fill[1]},${fill[2]},${fill[3]}`
  if (target === replacement) return

  const stack: Array<[number, number]> = [[x, y]]
  while (stack.length > 0) {
    const [cx, cy] = stack.pop() as [number, number]
    if (cx < 0 || cy < 0 || cx >= width || cy >= height) continue
    const i = (cy * width + cx) * 4
    if (colorAt(data, i) !== target) continue
    data[i] = fill[0]
    data[i + 1] = fill[1]
    data[i + 2] = fill[2]
    data[i + 3] = fill[3]
    stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1])
  }
}

/** 画布导出并触发下载（PNG / JPEG） */
export function downloadImage(
  canvas: HTMLCanvasElement,
  filename: string,
  mime: 'image/png' | 'image/jpeg',
  quality?: number,
): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, mime, quality)
}

/** 画布导出为 PNG 并触发下载 */
export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  downloadImage(canvas, filename, 'image/png')
}

export type Point = readonly [number, number]

/**
 * 三角形 / 菱形 / 星形的多边形顶点（纯几何，与 DOM 解耦，便于单测）。
 * (x0, y0)-(x1, y1) 为拖拽的外接矩形对角。
 */
export function shapePoints(
  kind: 'triangle' | 'diamond' | 'star',
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Point[] {
  if (kind === 'triangle') {
    return [
      [(x0 + x1) / 2, y0],
      [x0, y1],
      [x1, y1],
    ]
  }
  if (kind === 'diamond') {
    return [
      [(x0 + x1) / 2, y0],
      [x1, (y0 + y1) / 2],
      [(x0 + x1) / 2, y1],
      [x0, (y0 + y1) / 2],
    ]
  }
  // 五角星：外顶点与内顶点交错，外接圆直径取对角线长度
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const outer = Math.hypot(x1 - x0, y1 - y0) / 2
  const inner = outer * 0.382
  const pts: Point[] = []
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)])
  }
  return pts
}

/**
 * 箭头头部两条斜边的端点：(x1, y1) 为箭头顶点，len 为斜边长度。
 * 纯几何，便于单测。
 */
export function arrowHeadPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  len: number,
): [Point, Point] {
  const ang = Math.atan2(y1 - y0, x1 - x0)
  const spread = Math.PI / 7 // 约 25.7°
  return [
    [x1 - len * Math.cos(ang - spread), y1 - len * Math.sin(ang - spread)],
    [x1 - len * Math.cos(ang + spread), y1 - len * Math.sin(ang + spread)],
  ]
}

/**
 * 喷雾笔撒点：在 (x0, y0)→(x1, y1) 线段上按步进撒出雾点。
 * rand 可注入，便于单测确定性验证。
 */
export function sprayPoints(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  density: number,
  rand: () => number = Math.random,
): Point[] {
  const dist = Math.hypot(x1 - x0, y1 - y0)
  const steps = Math.max(1, Math.ceil(dist / Math.max(2, radius / 4)))
  const pts: Point[] = []
  for (let s = 0; s <= steps; s += 1) {
    const bx = x0 + ((x1 - x0) * s) / steps
    const by = y0 + ((y1 - y0) * s) / steps
    for (let i = 0; i < density; i += 1) {
      const a = rand() * Math.PI * 2
      const r = Math.sqrt(rand()) * radius
      pts.push([bx + r * Math.cos(a), by + r * Math.sin(a)])
    }
  }
  return pts
}

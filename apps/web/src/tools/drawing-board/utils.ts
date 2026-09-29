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

/** 画布导出为 PNG 并触发下载 */
export function downloadPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  }, 'image/png')
}

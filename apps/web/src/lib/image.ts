/**
 * 图片工具共享底层 helpers。
 *
 * 注意分层：需要 DOM/Canvas 的非纯函数放这里（lib 层允许）；
 * 各工具的 utils.ts 只放纯函数（维度计算、参数校验等），便于单测。
 * 工具之间禁止互相 import，共用逻辑一律走这里。
 */

/** 支持的图片 MIME 类型（输入） */
export const SUPPORTED_IMAGE_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/avif',
] as const

/** 可导出的 MIME 类型（输出） */
export const EXPORT_MIMES = ['image/png', 'image/jpeg', 'image/webp'] as const

/** 从 Blob/File 加载为 HTMLImageElement */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片解码失败：文件可能已损坏或格式不受支持'))
    }
    img.src = url
  })
}

/** 把 canvas 导出为 Blob */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error(`导出失败：浏览器不支持 ${mimeType} 编码`))
      },
      mimeType,
      quality,
    )
  })
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 延迟释放，确保下载已开始
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** 读取文件为 DataURL（用于预览） */
export function readFileAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/** 校验是否为支持的图片文件 */
export function isSupportedImageFile(file: File): boolean {
  if (file.type && (SUPPORTED_IMAGE_MIMES as readonly string[]).includes(file.type)) return true
  // 兜底：无 MIME 时按扩展名判断
  return /\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(file.name)
}

/** 人性化文件大小 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const v = bytes / 1024 ** i
  return `${v >= 100 ? Math.round(v) : v.toFixed(v >= 10 ? 1 : 2)} ${units[i]}`
}

/** 从文件名取扩展名（不含点，小写） */
export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim())
  return m ? m[1].toLowerCase() : ''
}

/** 替换文件扩展名 */
export function replaceExtension(name: string, newExt: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '')
  return `${base}.${newExt}`
}

/** MIME 转扩展名 */
export function mimeToExtension(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'image/avif':
      return 'avif'
    default:
      return 'png'
  }
}

/** 创建指定尺寸的 canvas */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

/** 把图片按目标尺寸绘制到新 canvas（高质量缩放） */
export function drawScaled(
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): HTMLCanvasElement {
  const canvas = createCanvas(dstW, dstH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * 带 CSS 滤镜绘制：filter 为 ctx.filter 字符串
 * （如 'blur(5px)'、'grayscale(1) contrast(1.2)'、'hue-rotate(90deg)'）。
 * 滤镜在绘制时一次性应用，输出为普通位图。
 */
export function drawWithFilter(
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
  filter: string,
): HTMLCanvasElement {
  const canvas = createCanvas(dstW, dstH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  ctx.filter = filter
  ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, canvas.width, canvas.height)
  return canvas
}

/**
 * 像素化绘制：先按块大小缩小，再关闭图像平滑放大回原尺寸，形成色块。
 * blockSize 越大色块越粗（马赛克/像素艺术效果）。
 */
export function drawPixelated(
  img: CanvasImageSource,
  srcW: number,
  srcH: number,
  blockSize: number,
): HTMLCanvasElement {
  const block = Math.max(1, Math.round(blockSize))
  const smallW = Math.max(1, Math.round(srcW / block))
  const smallH = Math.max(1, Math.round(srcH / block))
  const small = drawScaled(img, srcW, srcH, smallW, smallH)
  const canvas = createCanvas(srcW, srcH)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D 上下文不可用')
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(small, 0, 0, canvas.width, canvas.height)
  return canvas
}

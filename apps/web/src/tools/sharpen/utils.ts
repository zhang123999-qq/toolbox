/**
 * sharpen 纯函数：参数解析、卷积锐化、文件名构造。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

export const DEFAULT_STRENGTH = 50
/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 解析锐化强度 0–100；空串用默认 50 */
export function parseStrength(raw: string): number {
  const t = raw.trim()
  if (t === '') return DEFAULT_STRENGTH
  if (!/^\d+$/.test(t)) throw new Error(`强度无效：${raw}（须为 0–100 的整数）`)
  const s = Number(t)
  // 正则已保证 s 为非负整数，只需检查上界
  if (s > 100) throw new Error(`强度超出范围：${raw}（须为 0–100 的整数）`)
  return s
}

/**
 * 3×3 卷积锐化：核 [[0,-k,0],[-k,1+4k,-k],[0,-k,0]]，k = strength/100。
 * 对 R/G/B 三个通道分别卷积；边缘像素用 clamp 复制边缘
 * （邻域坐标钳制到 [0, width-1] / [0, height-1]）；alpha 通道原样保留。
 * 结果钳制到 0–255 并取整。strength=0 时返回原数据拷贝（等价于原图）。
 */
export function sharpenPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  strength: number,
): Uint8ClampedArray<ArrayBuffer> {
  if (data.length !== width * height * 4) {
    throw new Error(`像素数据长度不匹配：期望 ${width * height * 4}，实际 ${data.length}`)
  }
  if (strength === 0) {
    // 返回原数据拷贝（等价于原图）；用 new+set 而非 slice，
    // 使返回类型为 Uint8ClampedArray<ArrayBuffer>，可直接传给 new ImageData
    const copy = new Uint8ClampedArray(data.length)
    copy.set(data)
    return copy
  }

  const k = strength / 100
  const centerWeight = 1 + 4 * k
  const out = new Uint8ClampedArray(data.length)
  const lastX = width - 1
  const lastY = height - 1
  for (let y = 0; y < height; y++) {
    const yUp = Math.max(0, y - 1)
    const yDown = Math.min(lastY, y + 1)
    for (let x = 0; x < width; x++) {
      const xLeft = Math.max(0, x - 1)
      const xRight = Math.min(lastX, x + 1)
      const i = (y * width + x) * 4
      for (let c = 0; c < 3; c++) {
        const value =
          centerWeight * data[i + c] -
          k *
            (data[(yUp * width + x) * 4 + c] +
              data[(yDown * width + x) * 4 + c] +
              data[(y * width + xLeft) * 4 + c] +
              data[(y * width + xRight) * 4 + c])
        out[i + c] = Math.min(255, Math.max(0, Math.round(value)))
      }
      out[i + 3] = data[i + 3]
    }
  }
  return out
}

/** 选项 format 转 MIME */
export function formatToMime(format: 'jpeg' | 'png' | 'webp'): string {
  return format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
}

/** 构造输出文件名：原名 + 后缀按格式替换 */
export function buildOutputFileName(originalName: string, format: 'jpeg' | 'png' | 'webp'): string {
  const ext = format === 'jpeg' ? 'jpg' : format
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}-sharpen.${ext}`
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

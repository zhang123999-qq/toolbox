/**
 * ico 纯函数：ICO 二进制组装、尺寸选项解析、文件名构造、错误常量。
 * 不触碰 DOM/Canvas，可 100% 单测。
 */

/** 可选的 ICO 内嵌尺寸（px 边长） */
export const ICO_SIZE_OPTIONS = [16, 24, 32, 48, 64, 128, 256] as const

/** 默认勾选的尺寸 */
export const DEFAULT_ICO_SIZES = [16, 32, 48]

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/**
 * 组件内抛出的中文错误常量。
 * 「ico.*」i18n 键由主流程统一合入 messages 文件后，可切到 t('ico.error.*')，
 * 文案与此处保持一致。
 */
export const ERR_UNSUPPORTED_TYPE = '不支持的图片格式'
export const ERR_NO_SIZE_SELECTED = '请至少选择一个尺寸'

/** ICO 条目：正方形边长（1–256）+ PNG 二进制数据 */
export interface IcoEntry {
  size: number
  data: Uint8Array
}

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 解析复选的尺寸：去重、升序；至少选一个；仅允许 ICO_SIZE_OPTIONS。
 * 空选 / 非法值抛错（中文常量文案）。
 */
export function parseSelectedSizes(raw: string[]): number[] {
  const allowed = new Set<number>(ICO_SIZE_OPTIONS)
  const picked = new Set<number>()
  for (const item of raw) {
    const n = Number(item.trim())
    if (!Number.isInteger(n) || !allowed.has(n)) {
      throw new Error(`尺寸无效：${item}（仅支持 ${[...ICO_SIZE_OPTIONS].join('/')}）`)
    }
    picked.add(n)
  }
  if (picked.size === 0) throw new Error(ERR_NO_SIZE_SELECTED)
  return [...picked].sort((a, b) => a - b)
}

/**
 * 手写 ICO 二进制。
 * 布局：ICONDIR（6 字节）+ 每个尺寸一个 ICONDIRENTRY（16 字节）+ PNG 数据区。
 *  - reserved = 0，type = 1（LE u16，图标），count（LE u16）
 *  - width/height 为 u8，256 按规范存 0；colorCount = 0；reserved = 0；
 *    planes = 1（LE u16）；bitCount = 32（LE u16）；
 *    bytesInRes（LE u32）；imageOffset（LE u32）= 6 + 16*count + 累计偏移
 * PNG 内嵌是 Vista 之后的标准做法，无需手写 BMP/DIB 位图编码。
 */
export function buildIco(entries: IcoEntry[]): Uint8Array<ArrayBuffer> {
  if (entries.length === 0) throw new Error('ICO 至少需要包含一个尺寸')
  if (entries.length > 255) throw new Error('ICO 尺寸条目过多（上限 255）')
  for (const entry of entries) {
    if (!Number.isInteger(entry.size) || entry.size < 1 || entry.size > 256) {
      throw new Error(`尺寸无效：${entry.size}（须为 1–256 的整数）`)
    }
    if (entry.data.length === 0) throw new Error(`尺寸 ${entry.size} 的 PNG 数据为空`)
  }
  const count = entries.length
  const headerSize = 6 + 16 * count
  const totalSize = headerSize + entries.reduce((acc, e) => acc + e.data.length, 0)
  const buf = new Uint8Array(totalSize)
  const view = new DataView(buf.buffer)
  view.setUint16(0, 0, true) // reserved
  view.setUint16(2, 1, true) // type = 1（图标）
  view.setUint16(4, count, true) // count
  let offset = headerSize
  entries.forEach((entry, i) => {
    const base = 6 + 16 * i
    // 256 按规范用 0 字节表示
    view.setUint8(base, entry.size === 256 ? 0 : entry.size) // width
    view.setUint8(base + 1, entry.size === 256 ? 0 : entry.size) // height
    view.setUint8(base + 2, 0) // colorCount
    view.setUint8(base + 3, 0) // reserved
    view.setUint16(base + 4, 1, true) // planes
    view.setUint16(base + 6, 32, true) // bitCount
    view.setUint32(base + 8, entry.data.length, true) // bytesInRes
    view.setUint32(base + 12, offset, true) // imageOffset
    buf.set(entry.data, offset)
    offset += entry.data.length
  })
  return buf
}

/** 构造输出文件名：原名去扩展名 + .ico */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'image'
  return `${base}.ico`
}

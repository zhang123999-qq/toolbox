/**
 * pdf-metadata 纯函数：PDF 魔数校验、元数据读取/写入（pdf-lib）、
 * 关键字 split/join、日期本地化格式化、错误映射、文件名构造。
 * 不触碰 React/DOM，可 100% 单测。
 *
 * pdf-lib 盖章注意事项（已按 pdf-lib@1.17.1 源码实测）：
 *  - PDFDocument.load 默认 updateMetadata: true，会在构造时把 Producer 盖成
 *    'pdf-lib (https://github.com/Hopding/pdf-lib)' 并刷新 ModDate；
 *    因此读取、写入两处 load 都必须传 { updateMetadata: false }。
 *  - save() 本身不写元数据（1.17.1 的 SaveOptions 只有 useObjectStreams /
 *    addDefaultPage / objectsPerTick / updateFieldAppearances，没有
 *    updateFieldVersions 之类的盖章选项）；但默认 addDefaultPage: true 会给
 *    0 页 PDF 凭空加一页白纸，故传 addDefaultPage: false 保页数不变。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** PDF 魔数头：'%PDF-' */
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46, 0x2d] as const

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** 校验文件头是否为 %PDF（魔数检查，不依赖扩展名/MIME） */
export function isPdfFile(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false
  return PDF_MAGIC.every((b, i) => bytes[i] === b)
}

/** 判定是否为 pdf-lib 的加密文档错误 */
export function isEncryptedPdfError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return err.name === 'EncryptedPDFError' || err.message.includes('is encrypted')
}

/**
 * 把 load/save 阶段的异常映射为用户可读的错误消息；
 * encryptedText 由调用方按当前语言传入（i18n 在组件层处理）。
 */
export function pdfErrorMessage(err: unknown, encryptedText: string): string {
  if (isEncryptedPdfError(err)) return encryptedText
  return errorMessage(err)
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/** PDF 文档元数据（读取结果） */
export interface PdfMetadata {
  title: string | undefined
  author: string | undefined
  subject: string | undefined
  /** 关键字列表（已按逗号拆分、去空） */
  keywords: string[]
  creator: string | undefined
  producer: string | undefined
  /** 非法日期字符串会被视为缺失（undefined），不抛错 */
  creationDate: Date | undefined
  modificationDate: Date | undefined
  pageCount: number
}

/** 可编辑的元数据字段（写入输入） */
export interface EditableMetadata {
  title: string
  author: string
  subject: string
  keywords: string[]
}

export interface ApplyPdfMetadataResult {
  /** 精确类型，避免 new Blob([bytes]) 触发 TS2322（BlobPart 要求 ArrayBufferView<ArrayBuffer>） */
  bytes: Uint8Array<ArrayBuffer>
  pageCount: number
}

/**
 * 读取 PDF 元数据。
 * load 传 updateMetadata:false：否则 pdf-lib 在加载瞬间就把 Producer 盖章，
 * 后续「未改字段原样保留」无从谈起。
 */
export async function readPdfMetadata(data: Uint8Array): Promise<PdfMetadata> {
  const doc = await PDFDocument.load(data, { updateMetadata: false })
  return {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    subject: doc.getSubject(),
    keywords: parseKeywords(doc.getKeywords() ?? ''),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: safeReadDate(() => doc.getCreationDate()),
    modificationDate: safeReadDate(() => doc.getModificationDate()),
    pageCount: doc.getPageCount(),
  }
}

/**
 * 把可编辑元数据写回 PDF 并重新保存。
 * 未触碰的字段（创建者/生产者/日期/页数）原样保留；
 * save 不盖章（见文件头注释），清空后 Producer/Creator 不会出现 pdf-lib 字样。
 */
export async function applyPdfMetadata(
  data: Uint8Array,
  edits: EditableMetadata,
): Promise<ApplyPdfMetadataResult> {
  const doc = await PDFDocument.load(data, { updateMetadata: false })
  doc.setTitle(edits.title)
  doc.setAuthor(edits.author)
  doc.setSubject(edits.subject)
  doc.setKeywords(edits.keywords)
  const saved = await doc.save({ useObjectStreams: true, addDefaultPage: false })
  // save() 返回视图的底层 buffer 类型不确定，拷贝为确定性的 ArrayBuffer 视图
  return { bytes: new Uint8Array(saved), pageCount: doc.getPageCount() }
}

/**
 * 日期读取的防御性包装：个别 PDF 的日期字符串非法时 pdf-lib 会抛
 * InvalidPDFDateStringError；日期只读展示，非法视为缺失，不让整个工具崩掉。
 */
function safeReadDate(read: () => Date | undefined): Date | undefined {
  try {
    return read()
  } catch {
    return undefined
  }
}

/** 关键字输入按逗号拆分为列表：去首尾空格、丢弃空项（连续逗号/首尾逗号安全） */
export function parseKeywords(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/** 关键字列表拼回输入框文本（逗号分隔） */
export function joinKeywords(keywords: string[]): string {
  return keywords.join(', ')
}

/** 文本展示：空串/缺失时返回调用方传入的 emptyText（i18n 在组件层处理） */
export function textOrEmpty(value: string | undefined, emptyText: string): string {
  return value ? value : emptyText
}

/** 日期本地化展示；缺失时返回调用方传入的 emptyText（i18n 在组件层处理） */
export function formatPdfDate(
  date: Date | undefined,
  emptyText: string,
  locale: 'zh' | 'en' = 'zh',
): string {
  if (date === undefined) return emptyText
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }
  return locale === 'zh'
    ? date.toLocaleString('zh-CN', options)
    : date.toLocaleString('en-US', options)
}

/** 构造输出文件名：原名 + -metadata.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-metadata.pdf`
}

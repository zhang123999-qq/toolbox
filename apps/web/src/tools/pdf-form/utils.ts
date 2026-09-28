/**
 * pdf-form 纯函数：文件校验（魔数/大小）、表单字段枚举与类型判定、
 * 文本截断、字段值应用、填写与导出（含可选拼合）。
 * 不触碰 React/DOM；pdf-lib 为纯 JS（无 DOM 依赖），可 100% 单测。
 * 字段类型判定用 constructor 名（跨打包/跨 mock 稳定），不依赖 instanceof。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可填写的 PDF。
 */
export function isPdfFile(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  )
}

/** 校验上传文件大小 */
export function assertFileSizeOk(size: number): void {
  if (size > MAX_FILE_SIZE) {
    throw new Error(`文件过大：上限 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
  }
}

/**
 * 是否为 pdf-lib 抛出的加密 PDF 错误。
 * 注意：pdf-lib 1.17 的 EncryptedPDFError 构造器有 bug
 * （`_super.call(this, msg) || this` 返回了一个全新的普通 Error，
 * 原型链断裂），`instanceof EncryptedPDFError` 恒为 false，
 * 只能按 message 文案（"…is encrypted…"）识别。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('is encrypted')
}

/** 表单字段种类：text=文本框 checkbox=复选框 radio=单选组 dropdown=下拉框 */
export type FieldKind = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'unsupported'

/** 字段编辑器所需的值类型 */
export type FieldValue = string | boolean | string[]

/** 渲染编辑器用的字段描述（全部可序列化，可直接进 React state） */
export interface FieldDescriptor {
  /** 在 getFields() 返回数组中的下标，导出时按此定位字段 */
  index: number
  /** 字段名；无名（''）时界面用索引兜底显示 */
  name: string
  kind: FieldKind
  readOnly: boolean
  /** 文本框最大长度（undefined=不限）；超长输入由 truncateText 截断并提示 */
  maxLength: number | undefined
  /** 文本框是否为多行 */
  multiline: boolean
  /** 下拉框/单选组的可选项 */
  options: string[]
  /** 下拉框是否多选 */
  multiSelect: boolean
}

/** constructor 名 → 字段种类；未知（含 PDFButton 等）一律 unsupported */
const KIND_BY_CONSTRUCTOR: Record<string, FieldKind> = {
  PDFTextField: 'text',
  PDFCheckBox: 'checkbox',
  PDFRadioGroup: 'radio',
  PDFDropdown: 'dropdown',
}

/** 按 constructor 名判定字段种类；拿不到名字时返回 unsupported */
export function detectFieldKind(field: unknown): FieldKind {
  const name = (field as { constructor?: { name?: string } } | null | undefined)?.constructor?.name
  if (typeof name !== 'string') return 'unsupported'
  return KIND_BY_CONSTRUCTOR[name] ?? 'unsupported'
}

/** 描述 pdf-lib 字段时用到的最小鸭子类型 */
interface FieldLike {
  getName(): string
  isReadOnly(): boolean
}

/** 把 pdf-lib 字段转为可序列化的 FieldDescriptor */
export function describeField(field: FieldLike, index: number): FieldDescriptor {
  const kind = detectFieldKind(field)
  const descriptor: FieldDescriptor = {
    index,
    name: field.getName(),
    kind,
    readOnly: field.isReadOnly(),
    maxLength: undefined,
    multiline: false,
    options: [],
    multiSelect: false,
  }
  if (kind === 'text') {
    const tf = field as FieldLike & {
      getMaxLength(): number | undefined
      isMultiline(): boolean
    }
    descriptor.maxLength = tf.getMaxLength()
    descriptor.multiline = tf.isMultiline()
  } else if (kind === 'dropdown') {
    const dd = field as FieldLike & {
      getOptions(): string[]
      isMultiselect(): boolean
    }
    descriptor.options = dd.getOptions()
    descriptor.multiSelect = dd.isMultiselect()
  } else if (kind === 'radio') {
    const rg = field as FieldLike & { getOptions(): string[] }
    descriptor.options = rg.getOptions()
  }
  return descriptor
}

/** 载入 PDF（调用方负责捕获加密/损坏错误并转译） */
export function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes)
}

/** 枚举文档全部表单字段并描述；无表单时返回空数组（由调用方显示空状态） */
export function describeForm(doc: PDFDocument): FieldDescriptor[] {
  return doc
    .getForm()
    .getFields()
    .map((field, index) => describeField(field, index))
}

/**
 * 按 maxLength 截断文本（pdf-lib 的 setText 超长会直接抛错，
 * 必须先截断）。返回截断后的值与是否发生截断（界面据此提示）。
 */
export function truncateText(
  text: string,
  maxLength: number | undefined,
): { value: string; truncated: boolean } {
  if (maxLength === undefined || maxLength < 0 || text.length <= maxLength) {
    return { value: text, truncated: false }
  }
  return { value: text.slice(0, maxLength), truncated: true }
}

/** 字段的编辑器初始值 */
export function defaultFieldValue(descriptor: FieldDescriptor): FieldValue {
  switch (descriptor.kind) {
    case 'checkbox':
      return false
    case 'dropdown':
      return descriptor.multiSelect ? [] : ''
    default:
      return ''
  }
}

/**
 * 把单个值应用到 pdf-lib 字段上。非法值一律降级为“清空”
 * （单选/下拉选中了不存在的选项、下拉无选项），不抛错不崩溃；
 * 只读字段直接跳过（界面已禁用，此处双保险）。
 */
export function applyFieldValue(
  field: unknown,
  descriptor: FieldDescriptor,
  value: FieldValue,
): void {
  if (descriptor.readOnly) return
  switch (descriptor.kind) {
    case 'text': {
      const text = typeof value === 'string' ? value : ''
      const final = truncateText(text, descriptor.maxLength).value
      ;(field as { setText(text: string): void }).setText(final)
      break
    }
    case 'checkbox': {
      const box = field as { check(): void; uncheck(): void }
      if (value === true) box.check()
      else box.uncheck()
      break
    }
    case 'radio': {
      const group = field as { select(option: string): void; clear(): void }
      if (typeof value === 'string' && value !== '' && descriptor.options.includes(value)) {
        group.select(value)
      } else {
        group.clear()
      }
      break
    }
    case 'dropdown': {
      const list = field as { select(option: string | string[]): void; clear(): void }
      const picked = (Array.isArray(value) ? value : [value]).filter(
        (v): v is string => typeof v === 'string' && v !== '' && descriptor.options.includes(v),
      )
      if (picked.length === 0) {
        list.clear()
      } else if (descriptor.multiSelect) {
        list.select(picked)
      } else {
        list.select(picked[0])
      }
      break
    }
    default:
      break
  }
}

/** 导出条目：按字段下标定位，与 FieldDescriptor.index 对应 */
export interface FillEntry {
  descriptor: FieldDescriptor
  value: FieldValue
}

/**
 * 填写并导出：从原始字节重新载入（不污染界面持有的文档）→
 * 按下标逐字段应用值 → 可选拼合（字段变为静态内容）→ 保存。
 * 返回的 Uint8Array 为确定性的 ArrayBuffer 视图，可直接作 BlobPart。
 */
export async function fillForm(
  bytes: Uint8Array,
  entries: FillEntry[],
  flatten: boolean,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  const fields = doc.getForm().getFields()
  for (const entry of entries) {
    const field = fields[entry.descriptor.index]
    if (field !== undefined) applyFieldValue(field, entry.descriptor, entry.value)
  }
  if (flatten) doc.getForm().flatten()
  const saved = await doc.save()
  return new Uint8Array(saved)
}

/** 构造输出文件名：原名 + -filled.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'form'
  return `${base}-filled.pdf`
}

/**
 * pdf-to-word 纯函数：文件校验（魔数/大小）、加密识别、
 * 文本行提取、docx 文档构建与打包。
 * 不触碰 React/DOM；pdfjs-dist 与 docx 均为纯 JS，可 100% 单测。
 */
import { Document, Packer, PageBreak, Paragraph, TextRun } from 'docx'
import { PasswordException } from 'pdfjs-dist'

/**
 * getTextContent 条目的最小结构子集（pdfjs-dist 未从入口导出 TextContent 类型）：
 * 文本片段 { str, hasEOL }，或无 str 的 marked content。
 */
export type TextContentItem = { str: string; hasEOL: boolean } | { type: string; id: string }

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，避免把普通二进制文件误判为可转换的 PDF。
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
 * 是否为 pdfjs-dist 抛出的加密 PDF 错误（PasswordException）。
 * 名称兜底：跨 realm / 模块 mock 场景下 instanceof 可能失效。
 */
export function isEncryptedPdfError(err: unknown): boolean {
  return (
    err instanceof PasswordException || (err instanceof Error && err.name === 'PasswordException')
  )
}

/**
 * 将 getTextContent 的 items 转为文本行：
 * - 跳过无 str 的 marked content；
 * - 同行片段直接拼接，按 hasEOL 断行；
 * - 原文空行保留为空字符串行，末尾不产生多余空行。
 */
export function textItemsToLines(items: readonly TextContentItem[]): string[] {
  const lines: string[] = []
  let current = ''
  for (const item of items) {
    if (!('str' in item)) continue
    current += item.str
    if (item.hasEOL) {
      lines.push(current)
      current = ''
    }
  }
  if (current !== '') lines.push(current)
  return lines
}

/**
 * 由各页文本行构建 docx 文档：
 * 每行一个段落；页之间插入分页符；空页保留一个空段落占位，
 * 避免该页在 Word 中完全消失导致页码错位。
 */
export function buildDocxDocument(pages: string[][]): Document {
  const children: Paragraph[] = []
  pages.forEach((lines, pageIndex) => {
    if (pageIndex > 0) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
    if (lines.length === 0) {
      children.push(new Paragraph({ children: [new TextRun('')] }))
    }
    for (const line of lines) {
      children.push(new Paragraph({ children: [new TextRun(line)] }))
    }
  })
  return new Document({
    sections: [{ children }],
  })
}

/** 打包 docx 文档为可下载的 Blob */
export function packDocxToBlob(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc)
}

/** 构造输出文件名：原名 + -converted.docx */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'document'
  return `${base}-converted.docx`
}

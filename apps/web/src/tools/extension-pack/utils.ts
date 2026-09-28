import { unzipSync, zipSync } from 'fflate'

/**
 * extension-pack —— 全局编号 #775
 * 域：extension（浏览器扩展）｜大组：life｜优先级：P2｜可行性：A｜模板：T3
 *
 * 扩展打包：校验文件清单（必须含 manifest.json），用 fflate 打成 zip。
 * fflate 为仓库既有依赖。
 */

export interface PackFile {
  name: string
  content: string | Uint8Array
}

const encoder = new TextEncoder()

export function validatePackFiles(files: unknown): asserts files is PackFile[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error('至少需要一个文件')
  }
  const seen = new Set<string>()
  for (const f of files) {
    if (!f || typeof f !== 'object') {
      throw new Error('文件条目非法：必须是 {name, content} 对象')
    }
    const { name, content } = f as PackFile
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('文件名不能为空')
    }
    const n = name.trim()
    if (n.startsWith('/') || n.includes('\\') || n.split('/').includes('..')) {
      throw new Error(`非法文件名：${n}（不允许绝对路径、反斜杠或 ..）`)
    }
    if (seen.has(n)) {
      throw new Error(`重复文件名：${n}`)
    }
    seen.add(n)
    if (typeof content !== 'string' && !(content instanceof Uint8Array)) {
      throw new Error(`文件 ${n} 的 content 必须是字符串或 Uint8Array`)
    }
  }
  if (!seen.has('manifest.json')) {
    throw new Error('扩展包必须包含 manifest.json')
  }
}

/** 打包为 zip（Uint8Array），先校验。 */
export function packExtension(files: PackFile[]): Uint8Array {
  validatePackFiles(files)
  const data: Record<string, Uint8Array> = {}
  for (const f of files) {
    data[f.name.trim()] = typeof f.content === 'string' ? encoder.encode(f.content) : f.content
  }
  return zipSync(data, { level: 6 })
}

/** 解包（供测试与验包使用）。 */
export function unpackExtension(zip: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(zip)
}

export interface ParsedPackInput {
  files: PackFile[]
}

/** 解析页面输入的 JSON（非法抛中文错）。 */
export function parsePackInput(text: string): ParsedPackInput {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('输入必须是 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  const files = Array.isArray(o.files) ? (o.files as PackFile[]) : []
  validatePackFiles(files)
  return { files }
}

export const EXAMPLE_PACK: ParsedPackInput = {
  files: [
    {
      name: 'manifest.json',
      content: JSON.stringify({ manifest_version: 3, name: '我的扩展', version: '1.0.0' }, null, 2),
    },
    { name: 'content.js', content: '// content script\n' },
  ],
}

/** 计算打包结果摘要（文件名清单 + 总字节）。 */
export function summarizePack(zip: Uint8Array, files: PackFile[]): string {
  const names = files.map((f) => f.name.trim()).join(', ')
  return `已打包 ${files.length} 个文件（${names}），zip 大小 ${zip.length} 字节`
}

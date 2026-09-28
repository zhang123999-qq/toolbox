/**
 * pdf-encrypt 纯函数：密码校验、qpdf 参数构造、文件名构造、PDF 校验。
 * 不触碰 DOM/WASM，可 100% 单测。真正的 qpdf 调用在 Tool.tsx 中直接调
 * lib/qpdf 的 runQpdf，这里不做二次封装。
 */
import { PDFDocument } from 'pdf-lib'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024
/** 密码长度上限（字符数） */
export const MAX_PASSWORD_LENGTH = 128

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
 * 只看魔数不做完整解析，加密检测另走 isEncryptedPdf。
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
 * 密码校验：非空、上限 128 个字符。
 * 安全：错误消息绝不回显密码原文。
 */
export function validatePassword(password: string): void {
  if (password.length === 0) throw new Error('密码不能为空')
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`密码过长：上限 ${MAX_PASSWORD_LENGTH} 个字符`)
  }
}

/** 所有者密码留空时默认与用户密码相同 */
export function resolveOwnerPassword(userPassword: string, ownerPassword: string): string {
  return ownerPassword === '' ? userPassword : ownerPassword
}

/** 四项权限开关 */
export interface PdfPermissions {
  print: boolean
  extract: boolean
  modify: boolean
  annotate: boolean
}

/** 密钥长度 */
export type KeyLength = '256' | '128'

/**
 * 权限选项 → qpdf CLI flags（纯映射）。
 * flag 名以 qpdf 12.2.0 `qpdf --help=encryption` 实测为准：
 * 打印 --print=full|none；复制 --extract=y|n；修改 --modify=all|none；注释 --annotate=y|n。
 */
export function buildPermissionFlags(perms: PdfPermissions): string[] {
  return [
    `--print=${perms.print ? 'full' : 'none'}`,
    `--extract=${perms.extract ? 'y' : 'n'}`,
    `--modify=${perms.modify ? 'all' : 'none'}`,
    `--annotate=${perms.annotate ? 'y' : 'n'}`,
  ]
}

/**
 * 构造完整的 qpdf 加密参数：
 * `--encrypt <user> <owner> <bits> [权限 flags] -- <in> <out>`。
 * 128-bit 走 RC4，qpdf 12 默认拒绝弱加密，需在 --encrypt 之前加 --allow-weak-crypto；
 * 256-bit（AES）不需要。
 */
export function buildEncryptArgs(
  userPassword: string,
  ownerPassword: string,
  keyLength: KeyLength,
  perms: PdfPermissions,
  inputPath: string,
  outputPath: string,
): string[] {
  const args: string[] = keyLength === '128' ? ['--allow-weak-crypto'] : []
  args.push(
    '--encrypt',
    userPassword,
    ownerPassword,
    keyLength,
    ...buildPermissionFlags(perms),
    '--',
    inputPath,
    outputPath,
  )
  return args
}

/** 构造输出文件名：原名 + -encrypted.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'pdf'
  return `${base}-encrypted.pdf`
}

/**
 * 检测 PDF 是否已加密：pdf-lib 解析 trailer 时发现 /Encrypt 即抛 EncryptedPDFError
 *（message 含 'is encrypted'），无需密码即可判定。其它解析错误（文件损坏）
 * 向上传播，由调用方转译为"文件损坏"。
 */
export async function isEncryptedPdf(bytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(bytes)
    return false
  } catch (err) {
    if (errorMessage(err).includes('is encrypted')) return true
    throw err
  }
}

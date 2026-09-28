/**
 * pdf-decrypt 纯函数：文件校验（魔数/大小）、密码非空校验、加密探测、
 * qpdf 参数构造、输出文件名、解密失败分类。
 *
 * 说明：
 *  - 解密本身由共享封装 src/lib/qpdf.ts 的 runQpdf 执行（qpdf-wasm，
 *    pdf-lib 1.17.1 的 load 不支持 password，无法解密，只能用 qpdf）。
 *  - 密码只出现在 buildDecryptArgs 返回的本次调用参数数组里，
 *    绝不拼进任何错误消息或日志（classifyDecryptError 只看退出码）。
 *  - 不触碰 DOM；PDFDocument.load 仅用于探测是否加密，可 100% 单测。
 */
import { PDFDocument } from 'pdf-lib'
import type { MessageKey } from '../../i18n'

/** 单文件上限 50MB（浏览器内存安全边界） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** 提取错误消息（纯函数） */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * %PDF 魔数校验：前 5 字节为 "%PDF-"（0x25 0x50 0x44 0x46 0x2D）。
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

/**
 * 密码非空校验：不 trim——密码允许首尾空格，只有完全未输入才算空。
 */
export function validatePassword(raw: string): boolean {
  return raw.length > 0
}

/**
 * 加密探测：能正常载入 → 'plain'（未加密）；
 * 抛加密错误 → 'encrypted'；其他解析失败原样抛出，
 * 调用方按“文件损坏”处理。
 */
export async function probePdfEncryption(bytes: Uint8Array): Promise<'plain' | 'encrypted'> {
  try {
    await PDFDocument.load(bytes)
    return 'plain'
  } catch (err) {
    if (isEncryptedPdfError(err)) return 'encrypted'
    throw err
  }
}

/**
 * 构造 qpdf 解密参数（纯函数，可单测）：
 * ['--password=<密码>', '--decrypt', '--', 输入路径, 输出路径]。
 * qpdf 约定：密码错误时退出码为 2（已实测）。
 */
export function buildDecryptArgs(
  password: string,
): (inputPath: string, outputPath: string) => string[] {
  return (inputPath, outputPath) => [
    '--password=' + password,
    '--decrypt',
    '--',
    inputPath,
    outputPath,
  ]
}

/** 构造输出文件名：原名 + -decrypted.pdf */
export function buildOutputFileName(originalName: string): string {
  const base = originalName.replace(/\.[a-z0-9]+$/i, '') || 'decrypted'
  return `${base}-decrypted.pdf`
}

/** 解密失败种类：wrongPassword=密码错误；decryptFailed=其他解密失败 */
export type DecryptFailureKind = 'wrongPassword' | 'decryptFailed'

/**
 * qpdf 失败转译为失败种类（纯函数，可单测）：
 * runQpdf 把“退出码 2”写进错误消息（`qpdf 执行失败（退出码 2）`），
 * 密码错误即走此分支；其余一律归为解密失败，不泄露细节、
 * 不把密码原文拼进文案。
 */
export function classifyDecryptError(err: unknown): DecryptFailureKind {
  return errorMessage(err).includes('退出码 2') ? 'wrongPassword' : 'decryptFailed'
}

/**
 * 失败种类 → 用户文案的 i18n key。
 * 变量 key 显式标注 MessageKey 类型：key 对齐由 tsc 在词典合并后校验。
 */
export const DECRYPT_FAILURE_KEYS: Record<DecryptFailureKind, MessageKey> = {
  wrongPassword: 'pdfDecrypt.error.wrongPassword',
  decryptFailed: 'pdfDecrypt.error.decryptFailed',
}

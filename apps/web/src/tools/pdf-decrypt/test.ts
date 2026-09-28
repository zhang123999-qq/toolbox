import { beforeAll, describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
// 真实 qpdf-wasm：只用来在测试现场生成“已加密 PDF”夹具，
// 不经过 src/lib/qpdf.ts（该封装在组件测试中 mock）。
// vitest 下 `?url` 解析为 /@fs/ 开头的 dev URL，Emscripten 在 node
// 环境打不开，需剥掉前缀还原为真实文件路径（已实测可用）。
import createModule from '@neslinesli93/qpdf-wasm'
import wasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'
import {
  DECRYPT_FAILURE_KEYS,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildDecryptArgs,
  buildOutputFileName,
  classifyDecryptError,
  errorMessage,
  isEncryptedPdfError,
  isPdfFile,
  probePdfEncryption,
  validatePassword,
} from './utils'

interface TestFs {
  writeFile(path: string, data: Uint8Array): void
  readFile(path: string): Uint8Array
}

let qpdfCallMain: (args: string[]) => number
let qpdfFs: TestFs
let plainPdf: Uint8Array
let encryptedPdf: Uint8Array

beforeAll(async () => {
  const doc = await PDFDocument.create()
  doc.addPage([600, 800])
  doc.addPage([600, 800])
  plainPdf = await doc.save()

  const wasmPath = (wasmUrl as string).replace(/^\/@fs/, '')
  // 与 src/lib/qpdf.ts 一致：locateFile 无条件返回 wasm 真实路径
  const qpdf = (await createModule({
    locateFile: () => wasmPath,
  })) as unknown as { callMain: (args: string[]) => number; FS: TestFs }
  qpdfCallMain = (args) => qpdf.callMain(args)
  qpdfFs = qpdf.FS

  // 用真实 qpdf 生成 AES-256 加密夹具（密码 fixture-pw）
  qpdfFs.writeFile('/t-plain.pdf', plainPdf)
  expect(
    qpdfCallMain([
      '--encrypt',
      'fixture-pw',
      'fixture-pw',
      '256',
      '--',
      '/t-plain.pdf',
      '/t-enc.pdf',
    ]),
  ).toBe(0)
  encryptedPdf = qpdfFs.readFile('/t-enc.pdf')
}, 60000)

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('识别 %PDF- 魔数', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
    expect(isPdfFile(plainPdf)).toBe(true)
  })

  it('拒绝非 PDF', () => {
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x00, 0x50, 0x44, 0x46, 0x2d]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]))).toBe(false)
    expect(isPdfFile(new TextEncoder().encode('hello'))).toBe(false)
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('isEncryptedPdfError', () => {
  it('按 message 识别 pdf-lib 加密错误（原型链断裂，instanceof 不可用）', async () => {
    let caught: unknown = null
    try {
      await PDFDocument.load(encryptedPdf)
    } catch (err) {
      caught = err
    }
    expect(caught).not.toBeNull()
    expect(isEncryptedPdfError(caught)).toBe(true)
  })

  it('非加密错误返回 false', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF structure'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('validatePassword', () => {
  it('非空通过（含首尾空格的密码也算有效，不 trim）', () => {
    expect(validatePassword('pw123')).toBe(true)
    expect(validatePassword('  ')).toBe(true)
  })

  it('空串不通过', () => {
    expect(validatePassword('')).toBe(false)
  })
})

describe('probePdfEncryption', () => {
  it('未加密 PDF → plain（真实 pdf-lib 载入）', async () => {
    await expect(probePdfEncryption(plainPdf)).resolves.toBe('plain')
  })

  it('加密 PDF → encrypted（真实 qpdf 加密夹具 + 真实 pdf-lib 探测）', async () => {
    await expect(probePdfEncryption(encryptedPdf)).resolves.toBe('encrypted')
  })

  it('损坏的 PDF 原样抛错（调用方按文件损坏处理）', async () => {
    const garbage = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x99, 0x88])
    await expect(probePdfEncryption(garbage)).rejects.toThrow()
  })
})

describe('buildDecryptArgs', () => {
  it('构造 qpdf 解密参数（纯函数）', () => {
    expect(buildDecryptArgs('s3cr3t')('/in.pdf', '/out.pdf')).toEqual([
      '--password=s3cr3t',
      '--decrypt',
      '--',
      '/in.pdf',
      '/out.pdf',
    ])
  })

  it('构造出的参数可被真实 qpdf 执行：正确密码退出码 0，输出为合法 PDF', async () => {
    qpdfFs.writeFile('/d-in.pdf', encryptedPdf)
    const code = qpdfCallMain(buildDecryptArgs('fixture-pw')('/d-in.pdf', '/d-out.pdf'))
    expect(code).toBe(0)
    const out = qpdfFs.readFile('/d-out.pdf')
    expect(isPdfFile(out)).toBe(true)
    // 解密成功后 pdf-lib 可直接载入（updateMetadata:false 避免盖章），页数保留
    const doc = await PDFDocument.load(out, { updateMetadata: false })
    expect(doc.getPageCount()).toBe(2)
  })

  it('错误密码时真实退出码为 2', () => {
    qpdfFs.writeFile('/d-in2.pdf', encryptedPdf)
    expect(qpdfCallMain(buildDecryptArgs('wrong-pw')('/d-in2.pdf', '/d-out2.pdf'))).toBe(2)
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -decrypted 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-decrypted.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-decrypted.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-decrypted.pdf')
  })

  it('空基名兜底为 decrypted', () => {
    expect(buildOutputFileName('.pdf')).toBe('decrypted-decrypted.pdf')
    expect(buildOutputFileName('')).toBe('decrypted-decrypted.pdf')
  })
})

describe('classifyDecryptError', () => {
  it('退出码 2 → wrongPassword（密码错误）', () => {
    expect(classifyDecryptError(new Error('qpdf 执行失败（退出码 2）'))).toBe('wrongPassword')
  })

  it('其他错误 → decryptFailed，且不透传密码原文', () => {
    expect(classifyDecryptError(new Error('qpdf 执行失败（退出码 3）'))).toBe('decryptFailed')
    expect(classifyDecryptError(new Error('qpdf 输出文件为空'))).toBe('decryptFailed')
    expect(classifyDecryptError('boom')).toBe('decryptFailed')
    // 即使错误消息里混入密码字样，映射结果也只是固定种类，不透传
    const kind = classifyDecryptError(new Error('qpdf 执行失败（退出码 2） password=s3cr3t'))
    expect(kind).toBe('wrongPassword')
    expect(kind).not.toContain('s3cr3t')
  })
})

describe('DECRYPT_FAILURE_KEYS', () => {
  it('失败种类映射到 pdfDecrypt 命名空间的 i18n key', () => {
    expect(DECRYPT_FAILURE_KEYS.wrongPassword).toBe('pdfDecrypt.error.wrongPassword')
    expect(DECRYPT_FAILURE_KEYS.decryptFailed).toBe('pdfDecrypt.error.decryptFailed')
    expect(Object.keys(DECRYPT_FAILURE_KEYS).sort()).toEqual(['decryptFailed', 'wrongPassword'])
  })
})

import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  MAX_PASSWORD_LENGTH,
  assertFileSizeOk,
  buildEncryptArgs,
  buildOutputFileName,
  buildPermissionFlags,
  errorMessage,
  isEncryptedPdf,
  isPdfFile,
  resolveOwnerPassword,
  validatePassword,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
    expect(isPdfFile(bytes)).toBe(true)
  })

  it('魔数不对/过短不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(false)
    expect(isPdfFile(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
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

describe('validatePassword', () => {
  it('空密码抛错（不回显密码）', () => {
    expect(() => validatePassword('')).toThrow(/密码不能为空/)
  })

  it('超长抛错', () => {
    expect(() => validatePassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toThrow(/密码过长/)
  })

  it('合法密码通过（含边界 128）', () => {
    expect(() => validatePassword('abc123')).not.toThrow()
    expect(() => validatePassword('x'.repeat(MAX_PASSWORD_LENGTH))).not.toThrow()
  })
})

describe('resolveOwnerPassword', () => {
  it('留空默认与用户密码相同', () => {
    expect(resolveOwnerPassword('user123', '')).toBe('user123')
  })

  it('填写则用填写值', () => {
    expect(resolveOwnerPassword('user123', 'owner456')).toBe('owner456')
  })
})

describe('buildPermissionFlags', () => {
  it('全允许', () => {
    expect(
      buildPermissionFlags({ print: true, extract: true, modify: true, annotate: true }),
    ).toEqual(['--print=full', '--extract=y', '--modify=all', '--annotate=y'])
  })

  it('全禁止', () => {
    expect(
      buildPermissionFlags({ print: false, extract: false, modify: false, annotate: false }),
    ).toEqual(['--print=none', '--extract=n', '--modify=none', '--annotate=n'])
  })

  it('混合：只禁打印与修改', () => {
    expect(
      buildPermissionFlags({ print: false, extract: true, modify: false, annotate: true }),
    ).toEqual(['--print=none', '--extract=y', '--modify=none', '--annotate=y'])
  })
})

describe('buildEncryptArgs', () => {
  const perms = { print: true, extract: true, modify: true, annotate: true }

  it('256-bit：--encrypt user owner 256 [flags] -- in out', () => {
    expect(buildEncryptArgs('u', 'o', '256', perms, '/in.pdf', '/out.pdf')).toEqual([
      '--encrypt',
      'u',
      'o',
      '256',
      '--print=full',
      '--extract=y',
      '--modify=all',
      '--annotate=y',
      '--',
      '/in.pdf',
      '/out.pdf',
    ])
  })

  it('128-bit：前面加 --allow-weak-crypto（qpdf 12 拒绝 RC4 弱加密）', () => {
    const args = buildEncryptArgs('u', 'o', '128', perms, '/in.pdf', '/out.pdf')
    expect(args[0]).toBe('--allow-weak-crypto')
    expect(args).toContain('--encrypt')
    expect(args).toContain('128')
    expect(args.slice(-3)).toEqual(['--', '/in.pdf', '/out.pdf'])
  })

  it('权限 flags 随选项变化', () => {
    const args = buildEncryptArgs(
      'u',
      'u',
      '256',
      { print: false, extract: false, modify: false, annotate: false },
      '/in.pdf',
      '/out.pdf',
    )
    expect(args).toContain('--print=none')
    expect(args).toContain('--extract=n')
    expect(args).toContain('--modify=none')
    expect(args).toContain('--annotate=n')
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -encrypted.pdf 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-encrypted.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-encrypted.pdf')
  })

  it('无扩展名/空名兜底', () => {
    expect(buildOutputFileName('noext')).toBe('noext-encrypted.pdf')
    expect(buildOutputFileName('')).toBe('pdf-encrypted.pdf')
  })
})

/**
 * 构造"看起来已加密"的 PDF fixture：pdf-lib 生成合法 PDF 后，
 * 用增量更新追加真实的加密字典对象并在 trailer 写 /Encrypt。
 * pdf-lib 的 PDFDocument.load 见到 trailer /Encrypt 即抛 EncryptedPDFError，
 * 无需真实加密内容。
 */
async function makeEncryptedMarkerPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([300, 200])
  const bytes = Buffer.from(await doc.save())
  const s = bytes.toString('latin1')
  const root = s.match(/\/Root\s+(\d+\s+\d+\s+R)/)?.[1]
  const prev = Number(s.match(/startxref\s+(\d+)/)?.[1])
  if (!root || !Number.isFinite(prev)) throw new Error('fixture 构造失败：解析 trailer 失败')
  const encObj = '10 0 obj\n<< /Filter /Standard /V 4 /R 4 /O (xx) /U (yy) /P -4 >>\nendobj\n'
  const encOffset = bytes.length
  const xrefOffset = encOffset + encObj.length
  const xref =
    'xref\n0 1\n0000000000 65535 f \n10 1\n' + String(encOffset).padStart(10, '0') + ' 00000 n \n'
  const trailer =
    `trailer\n<< /Size 11 /Root ${root} /Encrypt 10 0 R /Prev ${prev} >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`
  return new Uint8Array(Buffer.concat([bytes, Buffer.from(encObj + xref + trailer, 'latin1')]))
}

describe('isEncryptedPdf', () => {
  it('普通 PDF 返回 false', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([300, 200])
    const bytes = await doc.save()
    await expect(isEncryptedPdf(bytes)).resolves.toBe(false)
  })

  it('trailer 带 /Encrypt 返回 true', async () => {
    const bytes = await makeEncryptedMarkerPdf()
    // 先确认 pdf-lib 确实按"已加密"拒绝（message 含 is encrypted）
    await expect(PDFDocument.load(bytes)).rejects.toThrow(/is encrypted/)
    await expect(isEncryptedPdf(bytes)).resolves.toBe(true)
  })

  it('损坏的 PDF（非加密解析错误）向上传播', async () => {
    const garbage = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 1, 2, 3, 4])
    await expect(isEncryptedPdf(garbage)).rejects.toThrow()
  })
})

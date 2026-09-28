import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-encrypt —— 全局编号 #489
 * 域：pdf（PDF / 办公）｜大组：office｜优先级：P2｜可行性：B｜模板：T2
 * 来源：docs/tools/09-PDF-Office.md
 * PDF 加密：为 PDF 设置打开密码（用户密码）与所有者密码，AES-256 真加密。
 * 可行性 B 说明：pdf-lib 1.17.1 既不能写入加密 PDF（无加密 API），也不能解密，
 * 因此改用 @neslinesli93/qpdf-wasm（qpdf 12.2.0 编译的 WASM，ISC 许可证），
 * 通过共享封装 apps/web/src/lib/qpdf.ts 的 runQpdf 调用。
 */
export const meta: ToolMeta = {
  id: 'pdf-encrypt',
  slug: 'pdf-encrypt',
  title: 'PDF 加密',
  description:
    '为 PDF 设置打开密码：AES-256 标准真加密，可选 128-bit 兼容与打印/复制/修改/注释权限，全程本地不上传',
  titleEn: 'PDF Encrypt',
  descriptionEn:
    'Password-protect a PDF: real AES-256 standard encryption, optional 128-bit compatibility and print/copy/modify/annotate permissions, fully local, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'encrypt', 'password', 'security', 'aes'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['userPassword', 'ownerPassword', 'keyLength', 'permissions'],

  deps: ['@neslinesli93/qpdf-wasm'],
  worker: false,
  wasm: true,
  api: false,
}

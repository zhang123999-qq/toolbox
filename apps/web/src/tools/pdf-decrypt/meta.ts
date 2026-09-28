import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-decrypt —— 全局编号 #490
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P2｜可行性：B｜模板：T2
 * PDF 解密：本地移除 PDF 的打开密码，输出无密码的干净 PDF（保留原内容与页数）。
 *
 * 可行性 B 的原因：pdf-lib 1.17.1 的 load 不支持 password 参数，
 * 加密文件直接抛 EncryptedPDFError，无法解密；改用 qpdf-wasm
 *（qpdf 12.2.0 编译为 WASM，主线程同步调用），共享封装见 src/lib/qpdf.ts。
 */
export const meta: ToolMeta = {
  id: 'pdf-decrypt',
  slug: 'pdf-decrypt',
  title: 'PDF 解密',
  description: '本地移除 PDF 的打开密码：输入密码解密为无密码的干净 PDF，全程不上传',
  titleEn: 'PDF Decrypt',
  descriptionEn:
    'Remove a PDF open password locally: decrypt into a clean password-free PDF, no upload',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'decrypt', 'password', 'qpdf', 'security'],

  priority: 'P2',
  feasibility: 'B',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['password'],

  deps: ['@neslinesli93/qpdf-wasm', 'pdf-lib'],
  worker: false,
  wasm: true,
  api: false,
}

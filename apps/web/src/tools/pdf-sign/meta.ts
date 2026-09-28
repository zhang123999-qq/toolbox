import type { ToolMeta } from '@toolbox/catalog'

/**
 * pdf-sign —— 全局编号 #491
 * 域：pdf（PDF / Office / 文档）｜大组：office｜优先级：P2｜可行性：A｜模板：T2
 * PDF 可视化签名：用户在画布上手写签名（鼠标/触摸）或上传签名图片
 * （PNG/JPEG），选择页码、位置、缩放后由 pdf-lib 嵌入 PDF 页面。
 *
 * 重要声明：本工具添加的是可视化电子签名（位图盖章），绝不是密码学
 * 数字证书签名——不提供身份认证、不防篡改、不产生可验证的签名者身份。
 * 需要法律效力的数字签名请使用 Adobe Acrobat 等支持证书签名的工具。
 */
export const meta: ToolMeta = {
  id: 'pdf-sign',
  slug: 'pdf-sign',
  title: 'PDF 签名',
  description:
    '可视化电子签名：手写或上传签名图片，选定页码、位置与缩放后嵌入 PDF（非数字证书签名），全程本地不上传',
  titleEn: 'PDF Sign',
  descriptionEn:
    'Visual e-signature: draw or upload a signature image, place it on a chosen page with position and scale (not a cryptographic digital signature), all local',

  category: 'pdf',
  group: 'office',
  tags: ['pdf', 'sign', 'signature', 'image', 'stamp'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['page', 'position', 'scale', 'signature'],

  deps: ['pdf-lib'],
  worker: false,
  wasm: false,
  api: false,
}

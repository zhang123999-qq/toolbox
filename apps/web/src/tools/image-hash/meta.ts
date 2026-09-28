import type { ToolMeta } from '@toolbox/catalog'

/**
 * image-hash —— 全局编号 #468
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 感知哈希：上传 1–2 张图片，计算 aHash / dHash / pHash（16 位 hex），
 * 上传 2 张时计算 Hamming 距离与相似度百分比，全程本地不上传。
 *
 * 可行性说明：文档技术路线标注 WebCrypto，但感知哈希（aHash/dHash/pHash）
 * 本质是图像算法，用 Canvas 下采样 + 纯 JS 实现（pHash 的二维 DCT 亦为纯 JS），
 * 无需 WebCrypto；无 wasm、无后端 api，故 feasibility 记为 A。
 */
export const meta: ToolMeta = {
  id: 'image-hash',
  slug: 'image-hash',
  title: '图片哈希',
  description: '计算图片感知哈希（aHash/dHash/pHash），比对两张图片的相似度，全程不上传',
  titleEn: 'Image Hash',
  descriptionEn:
    'Compute perceptual hashes (aHash/dHash/pHash) of images and compare similarity, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'hash', 'phash', 'similarity'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

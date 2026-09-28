import type { ToolMeta } from '@toolbox/catalog'

/**
 * background-remove —— 全局编号 #457
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 *
 * 背景移除：上传图片 → 移除背景 → 输出透明 PNG。
 * 两种模式：① 边缘抠除（默认）：采样四角及四条边均值作为背景色，从四条边
 * flood fill 将与背景色距离 ≤ 容差的连通域置透明；② 色度键：与用户所选
 * 目标色距离 ≤ 容差的像素全图置透明（适合绿幕）。
 *
 * 技术路线决策（纯 JS，不用 ML）：
 * 文档技术路线为纯 JS。ML 方案（如 @imgly/background-removal）体积约 40MB+、
 * 首次使用需下载模型，不符合本项目「纯本地、轻量、无网络依赖」的定位，
 * 故采用边缘洪水填充 + 色度键的纯 Canvas 实现，feasibility 记为 A，
 * worker / wasm / api 均为 false，deps 为空。
 */
export const meta: ToolMeta = {
  id: 'background-remove',
  slug: 'background-remove',
  title: '背景移除',
  description: '本地移除图片背景并输出透明 PNG：边缘抠除或色度键两种模式，全程不上传',
  titleEn: 'Background Remove',
  descriptionEn:
    'Remove image backgrounds locally to transparent PNG: edge cutout or chroma key, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'background', 'transparent', 'png'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['mode', 'tolerance', 'targetColor'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

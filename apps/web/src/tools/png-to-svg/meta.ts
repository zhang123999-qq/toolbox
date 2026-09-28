import type { ToolMeta } from '@toolbox/catalog'

/**
 * png-to-svg —— 全局编号 #454
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * PNG 转 SVG 矢量化：本地把位图海报化分层并描摹为 SVG 路径，可下载 .svg。
 *
 * 技术路线决策：文档建议用 potrace，但 potrace 的 npm 包是 GPL-2.0 许可证，
 * 被本项目 check-licenses 门禁拒绝（仅允许 MIT / Apache-2.0 等宽松许可证），
 * 且批次内不允许安装新依赖；因此改用零依赖、自研纯 JS 位图描摹
 * （marching squares 简化版：逐行扫描合并连续前景像素为矩形子路径），
 * deps: []，feasibility 记为 A（纯 JS，无 worker / wasm / 后端）。
 */
export const meta: ToolMeta = {
  id: 'png-to-svg',
  slug: 'png-to-svg',
  title: 'PNG 转 SVG',
  description: '本地把位图矢量化为 SVG 路径：海报化分层描摹，可下载 SVG，全程不上传',
  titleEn: 'PNG to SVG',
  descriptionEn:
    'Vectorize bitmaps to SVG paths locally: posterize-and-trace, downloadable SVG, no upload',

  category: 'image',
  group: 'design',
  tags: ['png', 'svg', 'vector', 'trace'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['colors', 'maxEdge', 'minArea', 'keepBackground'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

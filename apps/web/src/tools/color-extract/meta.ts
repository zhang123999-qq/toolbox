import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-extract —— 全局编号 #456
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 图片主色提取：本地下采样到 100×100 后做 12bit 均匀量化桶统计，
 * 按频次取 TopN 桶、桶内像素均值作为代表色，输出主色调色板。
 */
export const meta: ToolMeta = {
  id: 'color-extract',
  slug: 'color-extract',
  title: '图片主色提取',
  description: '提取图片主色调色板：HEX / RGB / 占比一目了然，点击色块复制，全程不上传',
  titleEn: 'Color Extract',
  descriptionEn:
    'Extract the dominant color palette from an image: HEX / RGB / share at a glance, click a swatch to copy, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'color', 'palette'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['palette'],
  options: ['count'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

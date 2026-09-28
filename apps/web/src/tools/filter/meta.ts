import type { ToolMeta } from '@toolbox/catalog'

/**
 * filter —— 全局编号 #434
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 照片滤镜：8 种预设风格（原图/黑白/复古/反色/暖阳/冷调/褪色/鲜明）一键应用，
 * 纯 Canvas ctx.filter 本地绘制，不上传。
 */
export const meta: ToolMeta = {
  id: 'filter',
  slug: 'filter',
  title: '照片滤镜',
  description: '8 种预设滤镜风格一键应用：黑白、复古、反色、暖阳、冷调、褪色、鲜明，全程本地不上传',
  titleEn: 'Photo Filters',
  descriptionEn:
    'Apply 8 preset photo filters in one click: B&W, sepia, invert, warm, cool, fade, vivid — all local, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'filter', 'preset', 'photo', 'png'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['preset', 'format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

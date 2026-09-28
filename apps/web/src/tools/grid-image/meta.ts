import type { ToolMeta } from '@toolbox/catalog'

/**
 * grid-image —— 全局编号 #441
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 九宫格切图：按 docs/tools/08-图片图形.md 实现为「切图」——单张图片按 rows×cols
 * 网格切成小块（默认 3×3 九宫格），纯 Canvas 本地处理。
 * 区别于 #439 多图拼接（image-merge 系）：那边是多张图拼成一张，本工具是
 * 一张图切成多块。
 */
export const meta: ToolMeta = {
  id: 'grid-image',
  slug: 'grid-image',
  title: '九宫格切图',
  description: '单张图片切成行×列网格小块（默认 3×3 九宫格），每块独立下载，全程不上传',
  titleEn: 'Grid Image Splitter',
  descriptionEn:
    'Split one image into a rows×cols grid of tiles (default 3×3 nine-grid), download each tile, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'grid', 'split', 'nine-grid'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['rows', 'cols', 'format', 'quality'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * compress-compare —— 全局编号 #470
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 单张图片输入，6 组固定压缩方案（JPEG q90/q70/q50、WebP q80/q60、PNG）串行
 * 生成并排对比：每组一张卡片（方案名、预览缩略图、体积、压缩率、尺寸、独立
 * 下载按钮），顶部另有原图卡片（体积/尺寸），体积最小的方案标「最小」徽标；
 * 用户可勾选启用/禁用方案（至少保留 1 组，0 组时提示不执行）。
 * 边界：
 *  - vs #421 image-compress（单方案压缩下载）：本工具是多方案并排对比选优，
 *    输出多张方案卡片供横向比较，而非单次压缩即下载。
 *  - vs #479 image-slider（两图滑块拖拽对比）：本工具是参数方案表格式对比，
 *    以卡片表格呈现各方案的体积/压缩率/尺寸，而非滑块拖拽的视觉对比。
 */
export const meta: ToolMeta = {
  id: 'compress-compare',
  slug: 'compress-compare',
  title: '图片压缩对比',
  description:
    '一张图片生成 6 组固定压缩方案并排对比：体积、压缩率、尺寸一目了然，选优下载，全程不上传',
  titleEn: 'Compression Compare',
  descriptionEn:
    'Compare 6 fixed compression presets side by side for one image: size, ratio and dimensions at a glance, download the best, no upload',

  category: 'image',
  group: 'design',
  tags: ['image', 'compress', 'compare', 'jpeg', 'webp'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['schemes'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

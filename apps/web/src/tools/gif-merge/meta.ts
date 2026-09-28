import type { ToolMeta } from '@toolbox/catalog'

/**
 * gif-merge —— 全局编号 #443
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：C｜模板：T2
 * GIF 合成：上传多张图片作为帧，可调整帧顺序，设置帧延迟/循环次数/质量，
 * 经 gif.js（Web Worker 并行编码）合成为一张 GIF 动图，全程本地不上传。
 *
 * 可行性说明：规格文档（docs/tools/08-图片图形.md #443）标注为 B，
 * 但 B 要求 wasm=true，而本工具实际依赖 gif.js 的 Web Worker 编码，
 * 并未使用 WASM；若虚假标注 B 会违反目录校验的一致性规则。
 * 参照 #421 先例，诚实标注为 C（C 仅要求 api=false），差异已在 README 注明。
 */
export const meta: ToolMeta = {
  id: 'gif-merge',
  slug: 'gif-merge',
  title: 'GIF 合成',
  description: '把多张图片合成为 GIF 动图：可调帧顺序、帧延迟、循环次数与质量，本地合成不上传',
  titleEn: 'GIF Merge',
  descriptionEn:
    'Merge multiple images into an animated GIF: reorder frames, set delay, loop count and quality, all locally',

  category: 'image',
  group: 'design',
  tags: ['gif', 'merge', 'animation', 'frames', 'image'],

  priority: 'P2',
  feasibility: 'C',
  template: 'T2',

  inputs: ['file'],
  outputs: ['file'],
  options: ['delay', 'repeat', 'quality'],

  deps: ['gif.js'],
  worker: true,
  wasm: false,
  api: false,
}

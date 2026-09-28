import type { ToolMeta } from '@toolbox/catalog'

/**
 * eyedropper —— 全局编号 #573
 * 域：media（音视频媒体）｜大组：design｜优先级：P0｜可行性：B（EyeDropper API + canvas 兜底）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'eyedropper',
  slug: 'eyedropper',
  title: '取色器',
  description: '用系统取色器从屏幕任意位置取色，不支持时从上传图片取色，输出 HEX / RGB / HSL',
  titleEn: 'Color Eyedropper',
  descriptionEn: 'Pick colors from anywhere on screen, or from an uploaded image as fallback',

  category: 'media',
  group: 'design',
  tags: ['color', 'eyedropper', 'picker', 'hex', 'rgb'],

  priority: 'P0',
  feasibility: 'C',
  template: 'T3',

  inputs: ['file'],
  outputs: ['text'],
  options: ['radius'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

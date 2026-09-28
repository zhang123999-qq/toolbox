import type { ToolMeta } from '@toolbox/catalog'

/**
 * color-picker —— 全局编号 #466
 * 域：image（图片 / 图形）｜大组：design｜优先级：P1｜可行性：A｜模板：T2
 * 文档原标注 C（EyeDropper 系统级取色），无 wasm/api，故 feasibility 记为 A。
 * 屏幕取色器：主路径用 EyeDropper 系统级取色（Chromium 系浏览器），
 * 兜底路径上传图片后在 Canvas 上点选像素取色；结果统一展示 HEX / RGB / HSL，点击复制。
 */
export const meta: ToolMeta = {
  id: 'color-picker',
  slug: 'color-picker',
  title: '屏幕取色器',
  description: '屏幕取色：EyeDropper 系统级拾色，浏览器不支持时可上传图片点选像素取色',
  titleEn: 'Color Picker',
  descriptionEn:
    'Pick colors from the screen via EyeDropper, or from an uploaded image via Canvas fallback',

  category: 'image',
  group: 'design',
  tags: ['color', 'picker', 'eyedropper', 'hex', 'rgb'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T2',

  inputs: ['screen', 'file'],
  outputs: ['color'],
  options: ['manualHex'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

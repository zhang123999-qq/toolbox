import type { ToolMeta } from '@toolbox/catalog'

/**
 * screen-capture —— 全局编号 #463
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 注：文档原标注 C（MediaDevices 系统权限），无 wasm/api，故 feasibility 记为 A。
 * 屏幕截取：getDisplayMedia 共享屏幕 → 预览 → 截取当前帧为 PNG 下载，
 * 截取后立即释放共享，全程本地不上传。
 */
export const meta: ToolMeta = {
  id: 'screen-capture',
  slug: 'screen-capture',
  title: '屏幕截取',
  description: '截取屏幕当前帧：浏览器原生屏幕共享，预览后一键保存为 PNG，全程本地不上传',
  titleEn: 'Screen Capture',
  descriptionEn:
    'Capture the current screen frame via native screen sharing; preview and save as PNG locally, no upload',

  category: 'image',
  group: 'design',
  tags: ['screen', 'capture', 'screenshot'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['screen'],
  outputs: ['file'],
  options: ['format'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

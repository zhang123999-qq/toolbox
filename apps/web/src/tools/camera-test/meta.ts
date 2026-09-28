import type { ToolMeta } from '@toolbox/catalog'

/**
 * camera-test —— 全局编号 #836
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P1｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'camera-test',
  slug: 'camera-test',
  title: '摄像头测试',
  description: '摄像头检测：枚举摄像头设备，申请权限后实时预览画面并切换分辨率',
  titleEn: 'Camera Test',
  descriptionEn:
    'Camera test: enumerates video devices, requests permission and shows a live preview with resolution switching',

  category: 'education',
  group: 'life',
  tags: ['camera', 'test', 'video', 'education'],

  priority: 'P1',
  feasibility: 'C',
  template: 'T3',

  inputs: ['interactive'],
  outputs: ['text'],
  options: [],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

import type { ToolMeta } from '@toolbox/catalog'

/**
 * screen-record —— 全局编号 #464
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 注：文档原标注 C（MediaRecorder 系统权限），无 wasm/api，故 feasibility 记为 A。
 * 屏幕录制：getDisplayMedia 采集屏幕 + MediaRecorder 录制为 webm，本地下载。
 */
export const meta: ToolMeta = {
  id: 'screen-record',
  slug: 'screen-record',
  title: '屏幕录制',
  description: '录制屏幕为 webm 视频：可选 VP9/VP8 编码与系统音频，全程本地不上传',
  titleEn: 'Screen Record',
  descriptionEn:
    'Record your screen as a webm video: optional VP9/VP8 codec and system audio, local only, no upload',

  category: 'image',
  group: 'design',
  tags: ['screen', 'record', 'webm'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['screen'],
  outputs: ['file'],
  options: ['codec', 'audio'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

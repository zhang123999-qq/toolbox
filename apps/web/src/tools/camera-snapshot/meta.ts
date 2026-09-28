import type { ToolMeta } from '@toolbox/catalog'

/**
 * camera-snapshot —— 全局编号 #465
 * 域：image（图片 / 图形）｜大组：design｜优先级：P2｜可行性：A｜模板：T2
 * 文档原标注 C（MediaDevices 系统权限），无 wasm/api，故 feasibility 记为 A。
 * 调用设备摄像头拍照：getUserMedia 预览 → canvas 截取当前帧 → PNG 下载，全程本地。
 */
export const meta: ToolMeta = {
  id: 'camera-snapshot',
  slug: 'camera-snapshot',
  title: '相机拍照',
  description: '调用设备摄像头拍照并下载 PNG，视频流仅本地预览、不上传',
  titleEn: 'Camera Snapshot',
  descriptionEn:
    'Capture photos with your device camera and download as PNG; the stream is previewed locally, never uploaded',

  category: 'image',
  group: 'design',
  tags: ['camera', 'photo', 'snapshot'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: [],
  outputs: ['file'],
  options: ['facing', 'mirror'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

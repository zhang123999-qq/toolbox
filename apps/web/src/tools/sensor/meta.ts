import type { ToolMeta } from '@toolbox/catalog'

/**
 * sensor —— 全局编号 #867
 * 域：education（教育 / 学习 / 趣味）｜大组：life｜优先级：P2｜可行性：C（Web API）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'sensor',
  slug: 'sensor',
  title: '传感器',
  description: '读取设备运动与方向传感器（加速度/倾斜角），支持 iOS 权限申请',
  titleEn: 'Sensor Test',
  descriptionEn:
    'Reads device motion and orientation sensors (acceleration/tilt), with iOS permission request',

  category: 'education',
  group: 'life',
  tags: ['sensor', 'accelerometer', 'gyroscope', 'mobile'],

  priority: 'P2',
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

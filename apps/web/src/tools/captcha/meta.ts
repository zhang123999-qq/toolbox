import type { ToolMeta } from '@toolbox/catalog'

/**
 * captcha —— 全局编号 #383
 * 域：random（随机 / 生成 / 设计）｜大组：design｜优先级：P1｜可行性：A｜模板：T3
 * 图形验证码：canvas 2D 绘制随机旋转字符 + 干扰线 + 噪点，crypto 随机源
 */
export const meta: ToolMeta = {
  id: 'captcha',
  slug: 'captcha',
  title: '图形验证码',
  description: '用 canvas 生成带旋转、干扰线与噪点的随机验证码图片，可一键刷新',
  titleEn: 'Captcha Generator',
  descriptionEn:
    'Draw a random captcha image on canvas with rotated characters, interference lines and noise dots; one-click refresh',

  category: 'random',
  group: 'design',
  tags: ['captcha', 'canvas', 'random', 'verify'],

  priority: 'P1',
  feasibility: 'A',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['length', 'charset', 'noAmbiguous'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}

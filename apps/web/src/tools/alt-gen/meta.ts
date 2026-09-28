import type { ToolMeta } from '@toolbox/catalog'

/**
 * alt-gen —— 全局编号 #731
 * 域：a11y（无障碍 / 国际化）｜大组：life｜优先级：P2｜可行性：D（BYOK 调用 OpenAI-compatible chat/completions 多模态）｜模板：T3
 * 为图片生成无障碍 alt 替代文本 */
export const meta: ToolMeta = {
  id: 'alt-gen',
  slug: 'alt-gen',
  title: '图片 Alt 生成',
  description: '上传图片，填自己的 Key 调用多模态模型，生成简洁客观的无障碍 alt 替代文本',
  titleEn: 'Alt Text Generator',
  descriptionEn:
    'Generate concise, objective alt text for images with a multimodal model using your own key',

  category: 'a11y',
  group: 'life',
  tags: ['alt', 'a11y', 'image', 'vision', 'byok'],

  priority: 'P2',
  feasibility: 'D',
  template: 'T3',

  inputs: ['image', 'text'],
  outputs: ['text'],
  options: ['model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

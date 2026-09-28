import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-image-gen —— 全局编号 #602
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 调用 OpenAI-compatible images/generations）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-image-gen',
  slug: 'ai-image-gen',
  title: '图像生成',
  description: '填自己的 Key 调用兼容 OpenAI 的图像生成接口，输入描述生成图片并下载',
  titleEn: 'AI Image Generation',
  descriptionEn: 'Generate images via an OpenAI-compatible images API with your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'image', 'generate', 'byok'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['image'],
  options: ['model', 'size'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

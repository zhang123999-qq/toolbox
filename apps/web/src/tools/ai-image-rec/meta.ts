import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-image-rec —— 全局编号 #603
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 调用 OpenAI-compatible chat/completions 多模态）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-image-rec',
  slug: 'ai-image-rec',
  title: '图像识别',
  description: '上传图片，填自己的 Key 调用多模态模型，返回图片内容的识别描述',
  titleEn: 'AI Image Recognition',
  descriptionEn: 'Describe uploaded images with a multimodal model using your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'image', 'vision', 'byok'],

  priority: 'P3',
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

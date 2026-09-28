import type { ToolMeta } from '@toolbox/catalog'

/**
 * ai-detect —— 全局编号 #604
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 请 LLM 分析文本是否疑似 AI 生成）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'ai-detect',
  slug: 'ai-detect',
  title: 'AI 检测',
  description: '填自己的 Key，请大模型分析一段文本是否疑似 AI 生成并给出理由',
  titleEn: 'AI Content Detection',
  descriptionEn: 'Ask an LLM whether a text looks AI-generated, with reasons, using your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'detect', 'byok', 'openai'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

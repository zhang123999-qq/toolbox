import type { ToolMeta } from '@toolbox/catalog'

/**
 * email-gen —— 全局编号 #611
 * 域：ai（AI / LLM）｜大组：life｜优先级：P3｜可行性：D（BYOK 请 LLM 生成邮件）｜模板：T3
 */
export const meta: ToolMeta = {
  id: 'email-gen',
  slug: 'email-gen',
  title: '邮件生成',
  description: '填写收件人与写信目的，填自己的 Key 请大模型按语气与语言生成邮件主题与正文',
  titleEn: 'Email Generator',
  descriptionEn: 'Generate email subject and body by tone and language with your own key',

  category: 'ai',
  group: 'life',
  tags: ['ai', 'llm', 'email', 'byok'],

  priority: 'P3',
  feasibility: 'D',
  template: 'T3',

  inputs: ['text'],
  outputs: ['text'],
  options: ['model', 'tone', 'language'],

  deps: [],
  worker: false,
  wasm: false,
  api: true,
}

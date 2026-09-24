import { chat } from '../../lib/ai'
import type { TitleGenInput, TitleGenOptions } from './schema'

/** 四种标题风格对应的指令 */
const INSTRUCTIONS: Record<TitleGenOptions['style'], string> = {
  neutral: '请为下面的内容拟标题：准确概括主题，不夸张。',
  seo: '请为下面的内容拟适合搜索引擎的标题：包含核心关键词，长度控制在 30 字以内。',
  question: '请为下面的内容拟疑问句式的标题，能勾起读者好奇。',
  howto: '请为下面的内容拟「如何……」式的实操标题，突出可执行的动作。',
}

/** 拼出给模型的指令（导出便于测试覆盖每种风格） */
export function promptOf(style: TitleGenOptions['style'], count: string, text: string): string {
  return INSTRUCTIONS[style] + '\n请给出 ' + count + ' 个候选，每行一个，不要编号。\n\n' + text
}

/** 生成标题：调你自备的模型接口，返回候选列表 */
export async function transform(input: TitleGenInput, options: TitleGenOptions): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  return chat(
    { apiBase: input.apiBase, apiKey: input.apiKey, model: input.model },
    '你是标题助手：只输出标题候选，每行一个，不要解释、不要加前后缀。',
    promptOf(options.style, options.count, text),
  )
}

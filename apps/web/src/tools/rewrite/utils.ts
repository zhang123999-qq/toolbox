import { chat } from '../../lib/ai'
import type { RewriteInput, RewriteOptions } from './schema'

/** 五种改写诉求对应的指令 */
const INSTRUCTIONS: Record<RewriteOptions['style'], string> = {
  polish: '请润色下面的文本：保持原意，让表达更通顺、用词更准确。',
  formal: '请把下面的文本改写成正式书面语。',
  casual: '请把下面的文本改写成口语化的轻松表达。',
  concise: '请压缩下面的文本，保留关键信息，尽量缩短。',
  expand: '请在保持原意的前提下，把下面的文本展开写得更充分。',
}

/** 拼出给模型的指令（导出便于测试覆盖每种风格） */
export function promptOf(style: RewriteOptions['style'], text: string): string {
  return INSTRUCTIONS[style] + '\n\n' + text
}

/** 改写：调你自备的模型接口，返回改写后的正文 */
export async function transform(input: RewriteInput, options: RewriteOptions): Promise<string> {
  const text = input.text.trim()
  if (text === '') return ''
  return chat(
    { apiBase: input.apiBase, apiKey: input.apiKey, model: input.model },
    '你是文本改写助手：只输出改写后的正文，不要解释、不要加前后缀。',
    promptOf(options.style, text),
  )
}

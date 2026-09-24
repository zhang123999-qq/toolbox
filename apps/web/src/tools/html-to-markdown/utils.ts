import TurndownService from 'turndown'
import type { HtmlToMarkdownInput } from './schema'

/** ATX 标题 + 围栏代码块，是最通用的 Markdown 写法 */
export function createService(): TurndownService {
  return new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
    emDelimiter: '*',
  })
}

export function transform(input: HtmlToMarkdownInput): string {
  if (input.text.trim() === '') return ''
  return createService().turndown(input.text)
}

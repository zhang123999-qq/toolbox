import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { formatTag, isValidLanguageTag, parseLanguageTag } from './utils'
import type { LanguageTagInput, LanguageTagOptions } from './schema'

/** 示例：繁体中文（台湾） */
const EXAMPLE: LanguageTagInput = { text: 'zh-Hant-TW' }

function run(input: LanguageTagInput): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  if (!isValidLanguageTag(text)) {
    try {
      parseLanguageTag(text)
    } catch (e) {
      return `标签非法：${(e as Error).message}`
    }
  }
  return formatTag(parseLanguageTag(text))
}

export default function Tool() {
  return (
    <TwoColumn<LanguageTagInput, LanguageTagOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={run}
      idleText="输入 BCP 47 语言标签（如 zh-Hant-TW），查看解析与中文含义"
      example={EXAMPLE}
    />
  )
}

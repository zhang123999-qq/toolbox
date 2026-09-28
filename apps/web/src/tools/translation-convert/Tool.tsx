import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { FORMAT_LABELS, convertI18n, type I18nFormat } from './utils'
import type { TranslationConvertInput, TranslationConvertOptions } from './schema'

/** 示例：嵌套 JSON */
const EXAMPLE: TranslationConvertInput = {
  text: '{\n  "app": {\n    "title": "你好",\n    "ok": "确定"\n  }\n}',
}

const FORMATS: readonly I18nFormat[] = ['json', 'po', 'yaml', 'csv']

const optionDefs: readonly OptionDef<TranslationConvertOptions>[] = [
  { key: 'from', label: '源格式', kind: 'select', values: FORMATS },
  { key: 'to', label: '目标格式', kind: 'select', values: FORMATS },
]

function run(input: TranslationConvertInput, options: TranslationConvertOptions): string {
  const text = input.text.trim() === '' ? EXAMPLE.text : input.text
  try {
    const { text: out, count } = convertI18n(text, options.from, options.to)
    return `转换成功：${count} 条（${FORMAT_LABELS[options.from]} → ${FORMAT_LABELS[options.to]}）\n\n${out}`
  } catch (e) {
    return `转换失败：${e instanceof Error ? e.message : String(e)}`
  }
}

export default function Tool() {
  return (
    <TwoColumn<TranslationConvertInput, TranslationConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'json', to: 'po' }}
      optionDefs={optionDefs}
      run={run}
      idleText="粘贴 i18n 文本，选择源格式与目标格式后自动转换"
      example={EXAMPLE}
    />
  )
}

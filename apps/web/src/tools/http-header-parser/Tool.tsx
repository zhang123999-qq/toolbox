import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { HttpHeaderInput, HttpHeaderOptions } from './schema'

const EXAMPLE: HttpHeaderInput = {
  text: [
    'GET /api/tools?page=2 HTTP/1.1',
    'Host: toolbox.example.com',
    'Accept: application/json',
    'Accept-Encoding: gzip, deflate',
    'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9',
    'User-Agent: Mozilla/5.0',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<HttpHeaderOptions>[] = [
    { key: 'direction', label: t('option.direction'), kind: 'select', values: ['parse', 'build'] },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['json', 'text'] },
  ]

  return (
    <TwoColumn<HttpHeaderInput, HttpHeaderOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ direction: 'parse', format: 'text' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ShortUrlInput, ShortUrlOptions } from './schema'

const EXAMPLE: ShortUrlInput = {
  text: 'https://example.com/very/long/article/title?utm_source=newsletter',
}

export default function Tool() {
  const optionDefs: readonly OptionDef<ShortUrlOptions>[] = [
    { key: 'baseUrl', label: '短域名', kind: 'text', placeholder: 'https://s.example.com' },
  ]

  return (
    <TwoColumn<ShortUrlInput, ShortUrlOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ baseUrl: 'https://s.example.com' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="粘贴一条长 URL，本地按内容 hash 生成短码，并给出自建重定向方案"
    />
  )
}

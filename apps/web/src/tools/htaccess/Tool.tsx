import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { HtaccessInput, HtaccessOptions } from './schema'

const EXAMPLE: HtaccessInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<HtaccessOptions>[] = [
    { key: 'redirects', label: '重定向（每行：旧路径 新URL）', kind: 'textarea' },
    { key: 'rewrites', label: 'URL 重写', kind: 'boolean' },
    { key: 'cache', label: '浏览器缓存', kind: 'boolean' },
    { key: 'hotlink', label: '防盗链', kind: 'boolean' },
    { key: 'deny', label: '禁止访问隐藏文件', kind: 'boolean' },
  ]
  return (
    <TwoColumn<HtaccessInput, HtaccessOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ redirects: '', rewrites: true, cache: false, hotlink: false, deny: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

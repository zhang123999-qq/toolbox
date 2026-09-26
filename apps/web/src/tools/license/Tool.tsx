import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { LicenseInput, LicenseOptions } from './schema'

const EXAMPLE: LicenseInput = { text: 'generate LICENSE' }

export default function Tool() {
  const optionDefs: readonly OptionDef<LicenseOptions>[] = [
    {
      key: 'licenseType',
      label: '许可证',
      kind: 'select',
      values: ['MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-3-Clause', 'ISC', 'Unlicense'],
    },
    { key: 'author', label: '作者', kind: 'text', placeholder: '张三' },
    { key: 'year', label: '年份', kind: 'text', placeholder: '2026' },
  ]

  return (
    <TwoColumn<LicenseInput, LicenseOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ licenseType: 'MIT', author: '张三', year: '2026' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

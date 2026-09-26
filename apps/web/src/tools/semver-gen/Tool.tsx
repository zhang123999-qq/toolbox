import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { SemverGenInput, SemverGenOptions } from './schema'

const EXAMPLE: SemverGenInput = { text: '1.4.2' }

export default function Tool() {
  const optionDefs: readonly OptionDef<SemverGenOptions>[] = [
    {
      key: 'bump',
      label: 'bump 类型',
      kind: 'select',
      values: ['major', 'minor', 'patch', 'premajor', 'preminor', 'prepatch', 'prerelease'],
    },
    { key: 'preId', label: '预发布标签', kind: 'text', placeholder: 'beta' },
  ]

  return (
    <TwoColumn<SemverGenInput, SemverGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ bump: 'patch', preId: 'beta' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入当前版本号（如 1.4.2），选 bump 类型，生成下一个版本"
    />
  )
}

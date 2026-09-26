import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ReadmeInput, ReadmeOptions } from './schema'

const EXAMPLE: ReadmeInput = { text: '零依赖\nTypeScript 编写\n支持 Tree Shaking' }

export default function Tool() {
  const optionDefs: readonly OptionDef<ReadmeOptions>[] = [
    { key: 'projectName', label: '项目名', kind: 'text', placeholder: 'my-utils' },
    { key: 'description', label: '一句话描述', kind: 'text', placeholder: '一个轻量工具库' },
    {
      key: 'license',
      label: '许可证',
      kind: 'select',
      values: ['MIT', 'Apache-2.0', 'GPL-3.0', 'Unlicense'],
    },
  ]

  return (
    <TwoColumn<ReadmeInput, ReadmeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ projectName: 'my-utils', description: '', license: 'MIT' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="输入框每行写一个功能点；选项里填项目名、描述与许可证"
    />
  )
}

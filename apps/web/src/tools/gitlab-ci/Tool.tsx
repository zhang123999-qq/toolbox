import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { GitlabCiInput, GitlabCiOptions } from './schema'

const EXAMPLE: GitlabCiInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<GitlabCiOptions>[] = [
    { key: 'image', label: '镜像', kind: 'text', placeholder: 'node:20' },
    { key: 'stages', label: 'stages(逗号分隔)', kind: 'text', placeholder: 'build,test,deploy' },
    {
      key: 'script',
      label: '脚本步骤(每行一条)',
      kind: 'textarea',
      placeholder: 'npm ci\nnpm test',
    },
  ]

  return (
    <TwoColumn<GitlabCiInput, GitlabCiOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        image: 'node:20',
        stages: 'build,test,deploy',
        script: 'npm ci\nnpm test\nnpm run build',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

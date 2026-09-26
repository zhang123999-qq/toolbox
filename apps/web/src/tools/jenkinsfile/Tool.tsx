import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { JenkinsfileInput, JenkinsfileOptions } from './schema'

const EXAMPLE: JenkinsfileInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<JenkinsfileOptions>[] = [
    { key: 'agent', label: 'Agent', kind: 'select', values: ['any', 'none'] },
    { key: 'stages', label: 'stages(逗号分隔)', kind: 'text', placeholder: 'build,test,deploy' },
    { key: 'post', label: 'post 块', kind: 'boolean' },
  ]

  return (
    <TwoColumn<JenkinsfileInput, JenkinsfileOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ agent: 'any', stages: 'build,test,deploy', post: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

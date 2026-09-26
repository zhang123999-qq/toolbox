import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CommitGenInput, CommitGenOptions } from './schema'
import { COMMIT_TYPES } from './schema'

const EXAMPLE: CommitGenInput = { text: 'generate' }

export default function Tool() {
  const optionDefs: readonly OptionDef<CommitGenOptions>[] = [
    { key: 'type', label: '提交类型', kind: 'select', values: [...COMMIT_TYPES] },
    { key: 'scope', label: '影响范围', kind: 'text', placeholder: 'auth' },
    { key: 'description', label: '描述', kind: 'text', placeholder: '一句话说明' },
    { key: 'body', label: '正文', kind: 'textarea' },
    { key: 'breaking', label: '包含不兼容变更', kind: 'boolean' },
    { key: 'footer', label: '脚注', kind: 'text', placeholder: 'Closes #123' },
  ]
  return (
    <TwoColumn<CommitGenInput, CommitGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        type: 'feat',
        scope: 'auth',
        description: '新增手机号登录',
        body: '',
        breaking: false,
        footer: '',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

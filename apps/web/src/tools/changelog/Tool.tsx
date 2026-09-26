import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ChangelogInput, ChangelogOptions } from './schema'

const EXAMPLE: ChangelogInput = {
  text: 'feat: 新增批量导出\nfix: 修复空状态错位\nfeat: 支持深色模式\ndoc: 补充安装说明',
}

export default function Tool() {
  const optionDefs: readonly OptionDef<ChangelogOptions>[] = [
    { key: 'version', label: '版本号', kind: 'text', placeholder: '1.2.0' },
  ]

  return (
    <TwoColumn<ChangelogInput, ChangelogOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ version: '1.2.0' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="每行写一条 `类型: 描述`（feat/fix/perf/deprecate/remove/security/doc），自动归类"
    />
  )
}

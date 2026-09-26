import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CiConfigInput, CiConfigOptions } from './schema'

const EXAMPLE: CiConfigInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<CiConfigOptions>[] = [
    { key: 'branch', label: '触发分支', kind: 'text', placeholder: 'main' },
    { key: 'nodeVersion', label: 'Node 版本', kind: 'select', values: ['18', '20', '22'] },
    { key: 'install', label: '安装依赖', kind: 'boolean' },
    { key: 'test', label: '跑测试', kind: 'boolean' },
    { key: 'build', label: '构建', kind: 'boolean' },
    { key: 'deploy', label: '部署', kind: 'boolean' },
  ]

  return (
    <TwoColumn<CiConfigInput, CiConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        branch: 'main',
        nodeVersion: '20',
        install: true,
        test: true,
        build: true,
        deploy: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

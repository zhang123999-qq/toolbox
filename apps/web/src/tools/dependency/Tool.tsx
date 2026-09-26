import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { DependencyInput, DependencyOptions } from './schema'

const EXAMPLE: DependencyInput = {
  text: JSON.stringify(
    {
      name: 'demo',
      dependencies: {
        react: '^18.2.0',
        lodash: '~4.17.21',
        chalk: '*',
        express: '4.18.2',
      },
      devDependencies: {
        vitest: '^1.0.0',
        react: '^18.2.0',
      },
    },
    null,
    2,
  ),
}

export default function Tool() {
  return (
    <TwoColumn<DependencyInput, DependencyOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      idleText="粘贴 package.json 内容，统计依赖数量、重复与版本范围风险"
    />
  )
}

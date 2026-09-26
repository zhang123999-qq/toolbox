import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ClocInput, ClocOptions } from './schema'

const EXAMPLE: ClocInput = {
  text: `// 入口
import { foo } from './foo'

/* 多行
   注释 */
export function main() {
  console.log(foo())
}
`,
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<ClocOptions>[] = [
    {
      key: 'language',
      label: t('option.language'),
      kind: 'select',
      values: ['c-style', 'python', 'shell'],
    },
  ]

  return (
    <TwoColumn<ClocInput, ClocOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'c-style' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="粘贴源代码，统计代码行 / 注释行 / 空行"
    />
  )
}

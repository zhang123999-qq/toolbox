import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { CodeConvertInput, CodeConvertOptions } from './schema'

const EXAMPLE: CodeConvertInput = {
  text: `function greet(name) {
  let msg = 'hi ' + name
  console.log(msg)
  for (let i = 0; i < 3; i++) {
    console.log(i)
  }
  if (msg.length > 0) {
    console.log(true)
  } else {
    console.log(false)
  }
}`,
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<CodeConvertOptions>[] = [
    { key: 'from', label: t('option.source'), kind: 'select', values: ['javascript', 'python'] },
    { key: 'to', label: '目标语言', kind: 'select', values: ['javascript', 'python'] },
  ]

  return (
    <TwoColumn<CodeConvertInput, CodeConvertOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ from: 'javascript', to: 'python' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      idleText="粘贴 JS 或 Python 代码，按基础语法映射转换到另一语言（不做完整编译）"
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { WorkbenchInput, WorkbenchOptions } from './schema'

const EXAMPLE: WorkbenchInput = {
  text: ['  香蕉  ', '', '苹果', '橙子', '苹果', ''].join('\n'),
}

/** 演示用的步骤串：先整理行，再排序去重 —— 一眼能看出每步在干什么 */
const STEPS = ['trimlines', 'removeempty', 'sort', 'dedupe'].join('\n')

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<WorkbenchOptions>[] = [
    {
      key: 'steps',
      label: t('option.steps'),
      kind: 'textarea',
      placeholder: 'upper\nsort\ndedupe',
    },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['steps', 'final'] },
  ]

  return (
    <TwoColumn<WorkbenchInput, WorkbenchOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ steps: STEPS, mode: 'steps' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

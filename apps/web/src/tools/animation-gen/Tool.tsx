import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { AnimationGenInput, AnimationGenOptions } from './schema'

const EXAMPLE: AnimationGenInput = { text: 'generate' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<AnimationGenOptions>[] = [
    { key: 'name', label: '动画名', kind: 'text', placeholder: 'fadeIn' },
    { key: 'duration', label: '时长', kind: 'text', placeholder: '1s' },
    {
      key: 'timing',
      label: '缓动',
      kind: 'select',
      values: ['ease', 'linear', 'ease-in', 'ease-out', 'ease-in-out'],
    },
    { key: 'delay', label: '延迟', kind: 'text', placeholder: '0s' },
    { key: 'iteration', label: '次数', kind: 'select', values: ['infinite', '1', '2', '3'] },
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['normal', 'reverse', 'alternate', 'alternate-reverse'],
    },
    { key: 'from', label: 'from 样式', kind: 'text', placeholder: 'opacity: 0' },
    { key: 'to', label: 'to 样式', kind: 'text', placeholder: 'opacity: 1' },
  ]

  return (
    <TwoColumn<AnimationGenInput, AnimationGenOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        name: 'fadeIn',
        duration: '1s',
        timing: 'ease',
        delay: '0s',
        iteration: 'infinite',
        direction: 'normal',
        from: 'opacity: 0',
        to: 'opacity: 1',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

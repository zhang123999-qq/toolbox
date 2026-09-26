import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CronGeneratorInput, CronGeneratorOptions } from './schema'

/** 输入框只作触发用：点「示例」填入占位符即按当前选项生成 */
const EXAMPLE: CronGeneratorInput = { text: 'generate' }

export default function Tool() {
  // 词典里没有「分/时/日/月/周」这类 cron 字段标签，直接用中文字面量
  const optionDefs: readonly OptionDef<CronGeneratorOptions>[] = [
    { key: 'minute', label: '分', kind: 'text', placeholder: '*' },
    { key: 'hour', label: '时', kind: 'text', placeholder: '*' },
    { key: 'dom', label: '日', kind: 'text', placeholder: '*' },
    { key: 'month', label: '月', kind: 'text', placeholder: '*' },
    { key: 'dow', label: '周', kind: 'text', placeholder: '*' },
  ]

  return (
    <TwoColumn<CronGeneratorInput, CronGeneratorOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ minute: '*', hour: '*', dom: '*', month: '*', dow: '*' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

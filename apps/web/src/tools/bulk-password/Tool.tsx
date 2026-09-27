import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { LENGTHS, MAX_COUNT, transform } from './utils'
import type { BulkPasswordInput, BulkPasswordOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，随即按默认选项生成 10 条 */
const EXAMPLE: BulkPasswordInput = { text: 'generate' }

const NOTE_CLASS =
  'mb-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<BulkPasswordOptions>[] = [
    { key: 'count', label: t('bulkPassword.count'), kind: 'text', placeholder: '10' },
    { key: 'length', label: t('option.length'), kind: 'select', values: LENGTHS },
    { key: 'includeLower', label: t('option.includeLower'), kind: 'boolean' },
    { key: 'includeUpper', label: t('option.includeUpper'), kind: 'boolean' },
    { key: 'includeNumbers', label: t('option.includeNumbers'), kind: 'boolean' },
    { key: 'includeSymbols', label: t('option.includeSymbols'), kind: 'boolean' },
  ]

  return (
    <>
      {/* 与「随机密码」划清界限 + 性能边界说明：上限 10000 条，全部本地生成 */}
      <p className={NOTE_CLASS}>{t('bulkPassword.note', { max: String(MAX_COUNT) })}</p>
      <TwoColumn<BulkPasswordInput, BulkPasswordOptions>
        meta={meta}
        initialInput={{ text: '' }}
        initialOptions={{
          count: '10',
          length: '16',
          includeLower: true,
          includeUpper: true,
          includeNumbers: true,
          includeSymbols: true,
        }}
        run={(input, options) => transform(input, options, t)}
        example={EXAMPLE}
        optionDefs={optionDefs}
      />
    </>
  )
}

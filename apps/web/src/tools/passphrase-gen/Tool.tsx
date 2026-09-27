import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PassphraseInput, PassphraseOptions } from './schema'

/** 输入框只作触发用：点「示例」把内容填成固定占位符，随即生成一条短语 */
const EXAMPLE: PassphraseInput = { text: 'generate' }

const NOTE_CLASS =
  'mb-3 rounded border border-slate-200 bg-white p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<PassphraseOptions>[] = [
    { key: 'words', label: t('option.words'), kind: 'select', values: ['3', '4', '5', '6'] },
    { key: 'separator', label: t('option.separator'), kind: 'text', placeholder: '-' },
    { key: 'capitalize', label: t('passphraseGen.capitalize'), kind: 'boolean' },
  ]

  return (
    <>
      {/* 与「随机密码」划清界限：本工具产出的是多词短语，不是单个随机字符串 */}
      <p className={NOTE_CLASS}>{t('passphraseGen.note')}</p>
      <TwoColumn<PassphraseInput, PassphraseOptions>
        meta={meta}
        initialInput={{ text: '' }}
        initialOptions={{ words: '4', separator: '-', capitalize: false }}
        run={(input, options) => transform(input, options, t)}
        example={EXAMPLE}
        optionDefs={optionDefs}
      />
    </>
  )
}

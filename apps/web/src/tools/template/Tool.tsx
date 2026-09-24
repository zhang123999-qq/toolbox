import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TemplateInput, TemplateOptions } from './schema'

const EXAMPLE: TemplateInput = {
  text: '你好 {{name}}，欢迎使用 {{product}}！\n---\nname=张三\nproduct=工具箱',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TemplateOptions>[] = [
    { key: 'syntax', label: t('option.syntax'), kind: 'select', values: ['mustache', 'dollar'] },
    { key: 'keepMissing', label: t('option.keepMissing'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<TemplateInput, TemplateOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ syntax: 'mustache', keepMissing: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

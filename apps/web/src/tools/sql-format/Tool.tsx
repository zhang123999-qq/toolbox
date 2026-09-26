import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlFormatInput, SqlFormatOptions } from './schema'

const EXAMPLE: SqlFormatInput = {
  text: [
    '-- 查活跃用户及其订单数',
    "select u.id, u.name, count(*) as cnt from users u left join orders o on o.user_id = u.id where u.age > 18 and u.status = 'active' group by u.id having count(*) > 1 order by cnt desc limit 10",
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SqlFormatOptions>[] = [
    {
      key: 'mode',
      label: t('option.mode'),
      kind: 'select',
      values: ['upper', 'lower', 'keep'],
    },
    {
      key: 'indent',
      label: t('option.indent'),
      kind: 'select',
      values: ['2', '4', '8'],
    },
  ]

  return (
    <TwoColumn<SqlFormatInput, SqlFormatOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ mode: 'upper', indent: '2' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

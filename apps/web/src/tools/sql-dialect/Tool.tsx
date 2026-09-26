import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlDialectInput, SqlDialectOptions } from './schema'

const EXAMPLE: SqlDialectInput = {
  text: [
    '-- 建表 + 查询：MySQL 方言',
    'CREATE TABLE users (',
    '  id INT UNSIGNED NOT NULL AUTO_INCREMENT,',
    '  `name` VARCHAR(64) NOT NULL,',
    '  birth DATETIME NULL,',
    '  PRIMARY KEY (id)',
    ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;',
    'SELECT `name`, IFNULL(birth, NOW()) FROM users WHERE id > 1 LIMIT 10, 5',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SqlDialectOptions>[] = [
    {
      key: 'source',
      label: t('option.source'),
      kind: 'select',
      values: ['auto', 'mysql', 'postgres'],
    },
    {
      key: 'target',
      label: t('option.target'),
      kind: 'select',
      values: ['mysql', 'postgres'],
    },
  ]

  return (
    <TwoColumn<SqlDialectInput, SqlDialectOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ source: 'auto', target: 'postgres' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SchemaDiffInput, SchemaDiffOptions } from './schema'

const EXAMPLE: SchemaDiffInput = {
  text: [
    'CREATE TABLE users (',
    '  id BIGINT PRIMARY KEY AUTO_INCREMENT,',
    '  email VARCHAR(100) NOT NULL UNIQUE,',
    '  created_at DATETIME',
    ');',
  ].join('\n'),
  schemaB: [
    'CREATE TABLE users (',
    '  id BIGINT PRIMARY KEY AUTO_INCREMENT,',
    '  email VARCHAR(255) NOT NULL UNIQUE,',
    '  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    ');',
    'CREATE TABLE logs (',
    '  id BIGINT PRIMARY KEY,',
    '  message TEXT',
    ');',
  ].join('\n'),
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SchemaDiffOptions>[] = [
    {
      key: 'format',
      label: t('option.format'),
      kind: 'select',
      values: ['report', 'json', 'markdown'],
    },
    { key: 'ignoreCase', label: t('option.ignoreCase'), kind: 'boolean' },
  ]

  return (
    <TwoColumn<SchemaDiffInput, SchemaDiffOptions>
      meta={meta}
      initialInput={{ text: '', schemaB: '' }}
      initialOptions={{ format: 'report', ignoreCase: true }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[{ key: 'schemaB', label: t('tool.textB'), rows: 8 }]}
    />
  )
}

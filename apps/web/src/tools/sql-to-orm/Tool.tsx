import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { SqlToOrmInput, SqlToOrmOptions } from './schema'

const EXAMPLE: SqlToOrmInput = {
  text: `CREATE TABLE \`users\` (
  \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`email\` VARCHAR(255) UNIQUE,
  \`age\` INT,
  \`active\` TINYINT(1) NOT NULL DEFAULT 1,
  \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE \`posts\` (
  \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`user_id\` INT NOT NULL,
  \`title\` VARCHAR(200) NOT NULL,
  \`body\` TEXT
);`,
}

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<SqlToOrmOptions>[] = [
    { key: 'target', label: t('option.target'), kind: 'select', values: ['sequelize', 'typeorm'] },
  ]

  return (
    <TwoColumn<SqlToOrmInput, SqlToOrmOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ target: 'sequelize' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

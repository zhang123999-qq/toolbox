import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { hashFile, transform } from './utils'
import type { FileHashInput, FileHashOptions } from './schema'

/** 示例：文本模式只要一段内容；文件模式用左下的「选择文件」 */
const EXAMPLE: FileHashInput = { text: 'hello world' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<FileHashOptions>[] = [
    {
      key: 'algorithm',
      label: t('option.algorithm'),
      kind: 'select',
      values: ['all', 'md5', 'sha1', 'sha256', 'sha384', 'sha512'],
    },
    { key: 'format', label: t('option.format'), kind: 'select', values: ['hex', 'base64'] },
  ]

  return (
    <TwoColumn<FileHashInput, FileHashOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ algorithm: 'all', format: 'hex' }}
      runAsync={transform}
      idleText={'填好文本后点「运行」，或直接用左下的「选择文件」'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file'), onFile: hashFile }}
    />
  )
}

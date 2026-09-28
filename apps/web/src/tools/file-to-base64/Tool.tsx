import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { encodeFile, transform } from './utils'
import type { FileToBase64Input, FileToBase64Options } from './schema'

/** 示例：一段文本 */
const EXAMPLE: FileToBase64Input = { text: 'hello world' }

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<FileToBase64Options>[] = [
    { key: 'dataUrl', label: '输出 DataURL', kind: 'boolean' },
  ]

  return (
    <TwoColumn<FileToBase64Input, FileToBase64Options>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ dataUrl: false }}
      run={(input, options) => transform(input, options)}
      idleText="在左侧粘贴文本点「运行」，或用左下的「选择文件」直接转整个文件"
      example={EXAMPLE}
      optionDefs={optionDefs}
      fileInput={{ label: t('tool.file') + '（≤ 200 MiB）', onFile: encodeFile }}
    />
  )
}

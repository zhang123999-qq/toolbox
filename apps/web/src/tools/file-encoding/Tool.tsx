import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { analyzeFile } from './utils'
import type { FileEncodingInput, FileEncodingOptions } from './schema'

export default function Tool() {
  const t = useTranslate()
  const optionDefs: readonly OptionDef<FileEncodingOptions>[] = [
    {
      key: 'topN',
      label: '候选个数',
      kind: 'select',
      values: [1, 3, 5, 10],
    },
    { key: 'preview', label: '解码预览', kind: 'boolean' },
  ]

  return (
    <TwoColumn<FileEncodingInput, FileEncodingOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: 3, preview: true }}
      idleText="用左下的「选择文件」上传文本文件，检测其编码并预览解码结果"
      optionDefs={optionDefs}
      fileInput={{
        label: t('tool.file') + '（文本文件，≤ 200 MiB）',
        onFile: (file, options) => analyzeFile(file, options),
      }}
    />
  )
}

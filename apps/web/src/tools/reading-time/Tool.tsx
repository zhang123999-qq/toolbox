import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { ReadingTimeInput, ReadingTimeOptions } from './schema'

const EXAMPLE: ReadingTimeInput = {
  text: '工具箱是一个纯前端在线工具库，所有计算都在浏览器本地完成，数据不会上传服务器。',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<ReadingTimeOptions>[] = [
    { key: 'speed', label: t('option.speed'), kind: 'select', values: [200, 300, 500] },
  ]

  return (
    <TwoColumn<ReadingTimeInput, ReadingTimeOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ speed: '300' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

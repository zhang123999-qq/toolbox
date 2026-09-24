import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { TitleGenInput, TitleGenOptions } from './schema'

const EXAMPLE: TitleGenInput = {
  text: '本文记录了把静态站点部署到服务器的过程：先在本地构建产物，再用 Nginx 托管静态文件，最后用 Docker 复现线上环境做一致性校验，避免「本机好好的、线上不行」。',
  apiBase: '',
  apiKey: '',
  model: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TitleGenOptions>[] = [
    {
      key: 'style',
      label: t('option.style'),
      kind: 'select',
      values: ['neutral', 'seo', 'question', 'howto'],
    },
    { key: 'count', label: t('option.count'), kind: 'select', values: ['1', '3', '5'] },
  ]

  return (
    <TwoColumn<TitleGenInput, TitleGenOptions>
      meta={meta}
      initialInput={{ text: '', apiBase: '', apiKey: '', model: '' }}
      initialOptions={{ style: 'neutral', count: '3' }}
      runAsync={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'apiBase', label: t('tool.apiBase'), rows: 1 },
        { key: 'apiKey', label: t('tool.apiKey'), rows: 1 },
        { key: 'model', label: t('tool.model'), rows: 1 },
      ]}
    />
  )
}

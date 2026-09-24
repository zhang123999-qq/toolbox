import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { AI_ENV_DEFAULTS } from '../../lib/ai'
import { transform } from './utils'
import type { TagGenInput, TagGenOptions } from './schema'

const EXAMPLE: TagGenInput = {
  text: '静态站点把构建产物交给 Nginx 托管，静态站点的配置文件也要一起发布。容器镜像与宿主机共享网络，容器镜像的构建复用同一份脚本。',
  apiBase: '',
  apiKey: '',
  model: '',
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TagGenOptions>[] = [
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['local', 'ai'] },
    { key: 'limit', label: t('option.limit'), kind: 'select', values: [5, 10, 15] },
  ]

  return (
    <TwoColumn<TagGenInput, TagGenOptions>
      meta={meta}
      initialInput={{
        text: '',
        apiBase: AI_ENV_DEFAULTS.apiBase,
        apiKey: '',
        model: AI_ENV_DEFAULTS.model,
      }}
      initialOptions={{ mode: 'local', limit: '5' }}
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

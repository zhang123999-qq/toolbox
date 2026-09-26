import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { RouteDebugInput, RouteDebugOptions } from './schema'

const EXAMPLE: RouteDebugInput = { text: '/users/123/posts/456' }

export default function Tool() {
  const t = useTranslate()
  void t
  const optionDefs: readonly OptionDef<RouteDebugOptions>[] = [
    { key: 'pattern', label: '路由规则', kind: 'text', placeholder: '/users/:id/posts/:postId' },
  ]

  return (
    <TwoColumn<RouteDebugInput, RouteDebugOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ pattern: '/users/:id/posts/:postId' }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}

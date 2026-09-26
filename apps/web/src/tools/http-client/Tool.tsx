import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef, ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { HttpClientInput, HttpClientOptions } from './schema'

const EXAMPLE: HttpClientInput = {
  text: 'https://httpbin.org/get',
  headers: '',
  body: '',
}

export default function Tool() {
  const optionDefs: readonly OptionDef<HttpClientOptions>[] = [
    {
      key: 'method',
      label: '请求方法',
      kind: 'select',
      values: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
    { key: 'noCors', label: 'no-cors 模式', kind: 'boolean' },
  ]
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'headers', label: '请求头（每行 Key: Value）', rows: 3 },
    { key: 'body', label: '请求体（POST/PUT/PATCH）', rows: 4 },
  ]

  return (
    <TwoColumn<HttpClientInput, HttpClientOptions>
      meta={meta}
      initialInput={{ text: '', headers: '', body: '' }}
      initialOptions={{ method: 'GET', noCors: false }}
      runAsync={transform}
      idleText="输入 URL 后点「运行」；注意浏览器同源策略，跨域目标需允许 CORS"
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={extraInputs}
    />
  )
}

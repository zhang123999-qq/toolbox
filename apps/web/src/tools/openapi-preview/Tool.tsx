import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { OpenapiPreviewInput, OpenapiPreviewOptions } from './schema'

const EXAMPLE: OpenapiPreviewInput = {
  text: JSON.stringify(
    {
      openapi: '3.0.3',
      info: { title: '示例 API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            summary: '列出用户',
            operationId: 'listUsers',
            parameters: [{ name: 'page', in: 'query', required: false }],
            responses: { '200': { description: 'OK' }, '500': { description: 'Err' } },
          },
          post: {
            summary: '创建用户',
            requestBody: { content: { 'application/json': {} } },
            responses: { '201': { description: 'Created' } },
          },
        },
        '/users/{id}': {
          get: {
            summary: '取单个用户',
            parameters: [{ name: 'id', in: 'path', required: true }],
            responses: { '200': {}, '404': {} },
          },
        },
      },
    },
    null,
    2,
  ),
}

export default function Tool() {
  return (
    <TwoColumn<OpenapiPreviewInput, OpenapiPreviewOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}

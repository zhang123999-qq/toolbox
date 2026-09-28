import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { ExtraInputDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { MixedContentInput, MixedContentOptions } from './schema'

const EXAMPLE: MixedContentInput = {
  text: '<!doctype html>\n<html>\n<head><script src="http://cdn.example.com/app.js"></script></head>\n<body><img src="http://example.com/logo.png"></body>\n</html>',
  pageUrl: 'https://example.com/',
}

export default function Tool() {
  const extraInputs: readonly ExtraInputDef[] = [
    { key: 'pageUrl', label: '页面 URL', rows: 1 },
  ]

  return (
    <TwoColumn<MixedContentInput, MixedContentOptions>
      meta={meta}
      initialInput={{ text: '', pageUrl: '' }}
      initialOptions={{}}
      run={transform}
      idleText="粘贴网页 HTML 并填写页面 URL，扫描其中的 http:// 资源引用"
      example={EXAMPLE}
      extraInputs={extraInputs}
    />
  )
}

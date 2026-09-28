import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildManifestJson } from './utils'
import type { ManifestInput, ManifestOptions } from './schema'

const EXAMPLE: ManifestInput = { text: '我的应用' }

/** 运行入口：name 取主输入，其余取选项；必填缺失/格式错误抛中文错 */
function run(input: ManifestInput, options: ManifestOptions): string {
  return buildManifestJson({
    name: input.text,
    shortName: options.shortName,
    startUrl: options.startUrl,
    display: options.display,
    themeColor: options.themeColor,
    backgroundColor: options.backgroundColor,
    icons: options.icons,
  })
}

export default function Tool() {
  return (
    <TwoColumn<ManifestInput, ManifestOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        shortName: '',
        startUrl: '/',
        display: 'standalone',
        themeColor: '#2563eb',
        backgroundColor: '#ffffff',
        icons: 'icon-192.png 192x192\nicon-512.png 512x512',
      }}
      optionDefs={[
        { key: 'shortName', label: 'short_name（短名称）*', kind: 'text', placeholder: '应用' },
        { key: 'startUrl', label: 'start_url（启动地址）', kind: 'text', placeholder: '/' },
        { key: 'display', label: 'display（显示模式）', kind: 'select', values: ['standalone', 'fullscreen', 'minimal-ui', 'browser'] },
        { key: 'themeColor', label: 'theme_color', kind: 'text', placeholder: '#2563eb' },
        { key: 'backgroundColor', label: 'background_color', kind: 'text', placeholder: '#ffffff' },
        { key: 'icons', label: 'icons（每行「图标路径 尺寸」）', kind: 'textarea', placeholder: 'icon-192.png 192x192' },
      ]}
      run={run}
      example={EXAMPLE}
    />
  )
}

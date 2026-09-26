import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { ScreenshotDevInput, ScreenshotDevOptions } from './schema'

export default function Tool() {
  return (
    <TwoColumn<ScreenshotDevInput, ScreenshotDevOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      runAsync={transform}
      idleText="点「运行」后，浏览器会弹窗让你选择要截取的屏幕 / 窗口 / 标签页，授权后自动导出一帧 PNG"
      example={{ text: '' }}
    />
  )
}

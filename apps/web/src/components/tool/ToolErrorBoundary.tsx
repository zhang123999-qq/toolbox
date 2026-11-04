import { Component } from 'react'
import type { ReactNode } from 'react'

interface ToolErrorBoundaryProps {
  /** 出错时展示的兜底内容（由调用方按当前语言构造） */
  readonly fallback: ReactNode
  readonly children: ReactNode
  /** 兜底区域「重试」按钮的回调：复位后重新挂载 children。未提供时不渲染重试按钮。 */
  readonly onReset?: () => void
  /** 这些值变化时自动复位（如切换工具 / 切换路由），避免错误状态粘滞。 */
  readonly resetKeys?: readonly unknown[]
}

interface ToolErrorBoundaryState {
  readonly hasError: boolean
  readonly error: unknown
}

/**
 * 工具渲染错误边界（同时用作全站根错误边界，见 App.tsx）。
 * 任一子树在渲染期抛错时只降级当前区域，全站其余部分（导航 / 页脚）不受影响，避免整页白屏。
 * 复位方式三选一：resetKeys 变化、调用方 key 重挂载、或点击兜底区的重试按钮（onReset）。
 */
export class ToolErrorBoundary extends Component<ToolErrorBoundaryProps, ToolErrorBoundaryState> {
  override state: ToolErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: unknown): ToolErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: unknown) {
    console.error('[tool] 渲染出错', error)
  }

  override componentDidUpdate(prevProps: ToolErrorBoundaryProps) {
    if (!this.state.hasError) return
    const prevKeys = prevProps.resetKeys ?? []
    const nextKeys = this.props.resetKeys ?? []
    const changed =
      prevKeys.length !== nextKeys.length ||
      nextKeys.some((key, index) => !Object.is(key, prevKeys[index]))
    if (changed) {
      this.setState({ hasError: false, error: null })
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  override render() {
    if (!this.state.hasError) return this.props.children
    return (
      <>
        {this.props.fallback}
        {this.props.onReset ? (
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-3 rounded border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-600"
          >
            重试
          </button>
        ) : null}
      </>
    )
  }
}

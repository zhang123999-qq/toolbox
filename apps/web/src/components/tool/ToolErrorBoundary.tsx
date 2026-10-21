import { Component } from 'react'
import type { ReactNode } from 'react'

interface ToolErrorBoundaryProps {
  /** 出错时展示的兜底内容（由调用方按当前语言构造） */
  readonly fallback: ReactNode
  readonly children: ReactNode
}

interface ToolErrorBoundaryState {
  readonly hasError: boolean
}

/**
 * 工具渲染错误边界。
 * 任一工具在渲染期抛错（T3 的 renderOutput、图表组件等）时，
 * 只降级当前工具区，全站其余部分（导航 / 页脚）不受影响，避免整页白屏。
 * 切换工具时由调用方用 key 强制重挂载来复位。
 */
export class ToolErrorBoundary extends Component<ToolErrorBoundaryProps, ToolErrorBoundaryState> {
  override state: ToolErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ToolErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: unknown) {
    console.error('[tool] 渲染出错', error)
  }

  override render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

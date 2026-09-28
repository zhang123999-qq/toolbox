import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { SECONDARY_BUTTON } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { connectWallet, detectProviders, getWalletInfo, type Eip1193Provider, type WalletInfo } from './utils'
import type { WalletConnectInput, WalletConnectOptions } from './schema'

const EXAMPLE: WalletConnectInput = { text: '' }

const ERROR_CLASS = 'text-sm text-red-700 dark:text-red-300'

function getWindowEthereum(): unknown {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as Record<string, unknown>).ethereum
}

export default function Tool() {
  const [account, setAccount] = useState<string | null>(null)
  const [info, setInfo] = useState<WalletInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  async function connect() {
    setConnecting(true)
    setError(null)
    try {
      const providers = detectProviders(() => ({ ethereum: getWindowEthereum() }))
      if (providers.length === 0) {
        throw new Error('未检测到浏览器钱包：请先安装 MetaMask（或兼容 EIP-1193 的钱包扩展）后刷新重试')
      }
      const provider: Eip1193Provider = providers[0]
      const accounts = await connectWallet(provider)
      const walletInfo = await getWalletInfo(provider, accounts[0])
      setAccount(accounts[0])
      setInfo(walletInfo)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConnecting(false)
    }
  }

  function infoToText(): string {
    if (info === null) return '未连接钱包'
    return [`地址：${info.address}`, `链 ID：${info.chainId}`, `余额：${info.balanceEther} ETH (${info.balanceWei} wei)`].join('\n')
  }

  function renderOutput(_input: WalletConnectInput, _options: WalletConnectOptions) {
    return (
      <div data-testid="results" className="space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          通过 EIP-1193 连接浏览器注入钱包（MetaMask 等）。只读取地址 / 链 ID / 余额，不发起任何交易；断开连接请在钱包扩展内操作。
        </p>
        <button type="button" data-testid="connect" onClick={connect} disabled={connecting} className={SECONDARY_BUTTON}>
          {connecting ? '连接中…' : account === null ? '连接钱包' : '重新连接'}
        </button>
        {error !== null ? (
          <p role="alert" className={ERROR_CLASS}>
            {error}
          </p>
        ) : null}
        {info !== null ? (
          <div className="space-y-2">
            <div className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">地址</p>
              <p className="font-mono text-xs break-all" data-testid="value-address">
                {info.address}
              </p>
            </div>
            <div className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">链 ID</p>
              <p className="font-mono text-xs break-all" data-testid="value-chainId">
                {info.chainId}
              </p>
            </div>
            <div className="rounded border p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">余额</p>
              <p className="font-mono text-xs break-all" data-testid="value-balance">
                {info.balanceEther} ETH
              </p>
              <p className="font-mono text-xs break-all text-gray-500 dark:text-gray-400">{info.balanceWei} wei</p>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <MultiPanel<WalletConnectInput, WalletConnectOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      example={EXAMPLE}
      renderOutput={renderOutput}
      toText={() => infoToText()}
      downloadExt="txt"
    />
  )
}

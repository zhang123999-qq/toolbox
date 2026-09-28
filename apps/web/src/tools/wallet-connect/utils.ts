/** EIP-1193 注入提供者的最小接口（测试可注入 mock） */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>
  providers?: Eip1193Provider[]
  isMetaMask?: boolean
}

export interface WalletInfo {
  readonly address: string
  readonly chainId: number
  readonly balanceWei: string
  readonly balanceEther: string
}

/** 未知错误 → 中文可读信息（可单独测试） */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * 检测注入钱包。getWindow 由调用方传入（浏览器侧传 () => window），
 * utils 本体不直接访问 window，保证可测试。
 */
export function detectProviders(getWindow: () => unknown): Eip1193Provider[] {
  let w: unknown
  try {
    w = getWindow()
  } catch {
    return []
  }
  if (w === null || w === undefined || typeof w !== 'object') return []
  const eth = (w as Record<string, unknown>).ethereum
  if (eth === null || eth === undefined || typeof eth !== 'object') return []
  const provider = eth as Eip1193Provider
  if (Array.isArray(provider.providers) && provider.providers.length > 0) {
    return provider.providers
  }
  return [provider]
}

/** 请求连接钱包，返回账户地址列表 */
export async function connectWallet(provider: Eip1193Provider): Promise<string[]> {
  let result: unknown
  try {
    result = await provider.request({ method: 'eth_requestAccounts' })
  } catch (e) {
    throw new Error(`钱包连接被拒绝或失败：${errorMessage(e)}`, { cause: e })
  }
  if (!Array.isArray(result) || result.length === 0 || typeof result[0] !== 'string') {
    throw new Error('钱包未返回任何账户')
  }
  return result as string[]
}

/** wei（hex）→ ether 十进制字符串（18 位精度） */
export function formatWeiToEther(weiHex: string): string {
  let hex = weiHex.trim()
  if (hex.startsWith('0x') || hex.startsWith('0X')) hex = hex.slice(2)
  if (!/^[0-9a-fA-F]+$/.test(hex)) throw new Error(`余额格式非法：${weiHex}`)
  const wei = BigInt('0x' + hex)
  const unit = 10n ** 18n
  const int = wei / unit
  const frac = (wei % unit).toString().padStart(18, '0').replace(/0+$/, '')
  return frac === '' ? int.toString() : `${int.toString()}.${frac}`
}

/** 读取链 ID 与余额 */
export async function getWalletInfo(provider: Eip1193Provider, address: string): Promise<WalletInfo> {
  let chainIdRaw: unknown
  let balanceRaw: unknown
  try {
    chainIdRaw = await provider.request({ method: 'eth_chainId' })
    balanceRaw = await provider.request({ method: 'eth_getBalance', params: [address, 'latest'] })
  } catch (e) {
    throw new Error(`读取钱包信息失败：${errorMessage(e)}`, { cause: e })
  }
  if (typeof chainIdRaw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(chainIdRaw)) {
    throw new Error('钱包返回的 chainId 格式非法')
  }
  if (typeof balanceRaw !== 'string' || !/^0x[0-9a-fA-F]+$/.test(balanceRaw)) {
    throw new Error('钱包返回的余额格式非法')
  }
  return {
    address,
    chainId: parseInt(chainIdRaw, 16),
    balanceWei: BigInt(balanceRaw).toString(),
    balanceEther: formatWeiToEther(balanceRaw),
  }
}

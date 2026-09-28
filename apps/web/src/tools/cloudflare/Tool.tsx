import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import { meta } from './meta'
import type { CloudflareInput, CloudflareOptions } from './schema'
import {
  buildDnsRecord,
  buildPageRule,
  dnsInputFromKv,
  EXAMPLE_DNS_KV,
  pageRuleInputFromKv,
  parseKvLines,
} from './utils'

function buildResult(input: CloudflareInput, options: CloudflareOptions): string {
  const kv = parseKvLines(input.text)
  if (options.mode === 'dns') {
    const record = buildDnsRecord(dnsInputFromKv(kv))
    return JSON.stringify(record, null, 2)
  }
  return buildPageRule(pageRuleInputFromKv(kv))
}

export default function Tool() {
  return (
    <MultiPanel<CloudflareInput, CloudflareOptions>
      meta={meta}
      initialInput={{ text: EXAMPLE_DNS_KV }}
      initialOptions={{ mode: 'dns' }}
      example={{ text: EXAMPLE_DNS_KV }}
      optionDefs={[
        { key: 'mode', label: '生成类型', kind: 'select', values: ['dns', 'page-rule'] },
      ]}
      renderOutput={(input, options) => {
        let result = ''
        let error = ''
        try {
          result = buildResult(input, options)
        } catch (err) {
          error = err instanceof Error ? err.message : '生成失败'
        }
        return (
          <div className="flex flex-col gap-3">
            {error !== '' && (
              <p data-testid="cloudflare-error" className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            {result !== '' && (
              <pre
                data-testid="cloudflare-result"
                className="whitespace-pre-wrap font-mono text-sm"
              >
                {result}
              </pre>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              说明：左侧按「key=value」逐行填写参数；DNS 模式字段为 type / name / content / ttl /
              proxied，页面规则模式字段为 pattern / cacheLevel / browserTtl。输出可直接用于
              Cloudflare API 或控制台。
            </p>
          </div>
        )
      }}
      toText={(input, options) => {
        try {
          return buildResult(input, options)
        } catch {
          return ''
        }
      }}
      downloadExt="json"
    />
  )
}

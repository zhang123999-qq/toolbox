import type { PortLookupInput, PortLookupOptions } from './schema'

interface PortEntry {
  port: number
  name: string
  desc: string
}

/** [端口, 服务名, 说明] */
const TABLE: ReadonlyArray<readonly [number, string, string]> = [
  [21, 'FTP', '文件传输协议（控制连接）'],
  [22, 'SSH', '安全 Shell，远程登录 / SCP / SFTP'],
  [23, 'Telnet', '明文远程终端（不推荐）'],
  [25, 'SMTP', '简单邮件传输协议（发送）'],
  [43, 'WHOIS', '域名注册信息查询'],
  [53, 'DNS', '域名系统解析'],
  [67, 'DHCP-Server', 'DHCP 服务端'],
  [68, 'DHCP-Client', 'DHCP 客户端'],
  [69, 'TFTP', '简单文件传输协议'],
  [80, 'HTTP', '超文本传输协议（明文）'],
  [110, 'POP3', '邮局协议 v3（收信）'],
  [123, 'NTP', '网络时间协议'],
  [135, 'MS-RPC', 'Windows RPC 端点映射器'],
  [139, 'NetBIOS', 'Windows 网上会话服务'],
  [143, 'IMAP', '互联网消息访问协议（收信）'],
  [161, 'SNMP', '简单网络管理协议'],
  [162, 'SNMP-Trap', 'SNMP 告警上报'],
  [389, 'LDAP', '轻量目录访问协议'],
  [443, 'HTTPS', 'HTTP over TLS'],
  [445, 'SMB', 'Windows 文件共享'],
  [465, 'SMTPS', 'SMTP over TLS（隐式）'],
  [500, 'IKE', 'IPsec 密钥交换'],
  [514, 'Syslog', '系统日志'],
  [587, 'SMTP-Submission', '邮件提交（STARTTLS）'],
  [636, 'LDAPS', 'LDAP over TLS'],
  [993, 'IMAPS', 'IMAP over TLS'],
  [995, 'POP3S', 'POP3 over TLS'],
  [1080, 'SOCKS', 'SOCKS 代理'],
  [1433, 'MSSQL', 'Microsoft SQL Server'],
  [1521, 'Oracle', 'Oracle 数据库监听'],
  [1723, 'PPTP', 'VPN 隧道协议'],
  [1883, 'MQTT', '物联网消息队列（明文）'],
  [2049, 'NFS', '网络文件系统'],
  [2181, 'ZooKeeper', '分布式协调服务'],
  [2375, 'Docker', 'Docker daemon（明文，危险）'],
  [2376, 'Docker-TLS', 'Docker daemon（TLS）'],
  [3306, 'MySQL', 'MySQL 数据库'],
  [3389, 'RDP', 'Windows 远程桌面'],
  [3690, 'SVN', 'Subversion 版本控制'],
  [5060, 'SIP', '会话发起协议（VoIP）'],
  [5432, 'PostgreSQL', 'PostgreSQL 数据库'],
  [5601, 'Kibana', 'Elasticsearch 数据可视化'],
  [5672, 'RabbitMQ', 'AMQP 消息队列'],
  [5900, 'VNC', '远程帧缓冲'],
  [5984, 'CouchDB', 'CouchDB REST 数据库'],
  [6379, 'Redis', 'Redis 缓存（默认无密码，勿暴露公网）'],
  [6443, 'K8s-API', 'Kubernetes API Server'],
  [8080, 'HTTP-Alt', 'HTTP 备用端口（代理 / 应用常占）'],
  [8081, 'HTTP-Alt-2', 'HTTP 备用端口 2'],
  [8443, 'HTTPS-Alt', 'HTTPS 备用端口'],
  [8500, 'Consul', 'Consul 服务发现 / UI'],
  [8888, 'Jupyter', 'Jupyter Notebook / 其他 Web'],
  [9000, 'FastCGI/MinIO', 'FastCGI 或 MinIO API'],
  [9090, 'Prometheus', 'Prometheus 监控'],
  [9200, 'Elasticsearch', 'ES REST 接口（明文，勿暴露公网）'],
  [9300, 'ES-Node', 'ES 集群节点通信'],
  [11211, 'Memcached', 'Memcached 缓存'],
  [15672, 'RabbitMQ-Mgmt', 'RabbitMQ 管理 UI'],
  [27017, 'MongoDB', 'MongoDB 数据库（勿暴露公网）'],
]

const BY_PORT: ReadonlyMap<number, PortEntry> = new Map(
  TABLE.map(([port, name, desc]) => [port, { port, name, desc }]),
)

function format(e: PortEntry): string {
  return `${e.port}/tcp  ${e.name}  —  ${e.desc}`
}

/** T2 同步入口 */
export function transform(input: PortLookupInput, _options: PortLookupOptions): string {
  const q = input.text.trim()
  if (q === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  // 纯数字 → 按端口号查
  if (/^\d{1,5}$/.test(q)) {
    const port = Number(q)
    if (port < 0 || port > 65535) throw new Error('端口号须在 0-65535 之间')
    const hit = BY_PORT.get(port)
    if (!hit) throw new Error('未收录该端口：' + port)
    return format(hit)
  }

  // 否则按服务名 / 说明模糊匹配
  const lower = q.toLowerCase()
  const hits = TABLE.map(([port, name, desc]) => ({ port, name, desc })).filter(
    (e) => e.name.toLowerCase().includes(lower) || e.desc.toLowerCase().includes(lower),
  )
  if (hits.length === 0) throw new Error('未找到匹配的服务：' + q)
  return hits.slice(0, 20).map(format).join('\n')
}

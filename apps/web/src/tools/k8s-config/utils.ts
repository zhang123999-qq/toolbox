import type { K8sConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新指令） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

/**
 * 校验 K8s 资源名称（RFC 1123 子域）：小写字母数字、'-'、'.'，
 * 首尾必须是字母数字，长度 1-253。拒绝换行/冒号/空格等可破坏 YAML 的字符。
 */
function validateName(raw: string): string {
  const name = raw.trim()
  if (name === '') throw new Error('资源名称不能为空')
  if (name.length > 253) throw new Error('资源名称不能超过 253 个字符')
  if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(name)) {
    throw new Error('资源名称只能包含小写字母、数字、“-”和“.”，且首尾须为字母数字')
  }
  return name
}

/** 校验镜像引用：允许常规镜像字符，拒绝空白、换行等会破坏/注入 YAML 的字符 */
function validateImage(raw: string): string {
  const image = raw.trim()
  if (image === '') throw new Error('镜像地址不能为空')
  if (/\s/.test(image) || hasControlChar(image)) {
    throw new Error('镜像地址不能包含空白或换行')
  }
  if (!/^[A-Za-z0-9._/@:+-]+$/.test(image)) {
    throw new Error('镜像地址包含非法字符')
  }
  return image
}

/** 校验端口：1-65535 的整数 */
function validatePort(raw: string): number {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) throw new Error('端口必须是 1-65535 之间的整数')
  const port = Number(text)
  if (port < 1 || port > 65535) throw new Error('端口必须在 1-65535 之间')
  return port
}

/** 校验副本数：0-1000 的非负整数 */
function validateReplicas(raw: string): number {
  const text = raw.trim()
  if (!/^\d+$/.test(text)) throw new Error('副本数必须是非负整数')
  const replicas = Number(text)
  if (replicas > 1000) throw new Error('副本数不能超过 1000')
  return replicas
}

function deployment(name: string, image: string, port: number, replicas: number): string {
  return [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    `  replicas: ${replicas}`,
    '  selector:',
    '    matchLabels:',
    '      app: ' + name,
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: ' + name,
    '    spec:',
    '      containers:',
    `        - name: ${name}`,
    `          image: ${image}`,
    '          ports:',
    `            - containerPort: ${port}`,
  ].join('\n')
}

function service(name: string, port: number): string {
  return [
    'apiVersion: v1',
    'kind: Service',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    '  selector:',
    '    app: ' + name,
    '  ports:',
    `    - protocol: TCP`,
    `      port: 80`,
    `      targetPort: ${port}`,
    '  type: ClusterIP',
  ].join('\n')
}

function configMap(name: string): string {
  return [
    'apiVersion: v1',
    'kind: ConfigMap',
    'metadata:',
    `  name: ${name}`,
    'data:',
    '  app.properties: |',
    '    key=value',
  ].join('\n')
}

function ingress(name: string, port: number): string {
  return [
    'apiVersion: networking.k8s.io/v1',
    'kind: Ingress',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    '  rules:',
    '    - host: example.local',
    '      http:',
    '        paths:',
    '          - path: /',
    '            pathType: Prefix',
    '            backend:',
    '              service:',
    `                name: ${name}`,
    '                port:',
    `                  number: ${port}`,
  ].join('\n')
}

function pvc(name: string): string {
  return [
    'apiVersion: v1',
    'kind: PersistentVolumeClaim',
    'metadata:',
    `  name: ${name}`,
    'spec:',
    '  accessModes:',
    '    - ReadWriteOnce',
    '  resources:',
    '    requests:',
    '      storage: 1Gi',
  ].join('\n')
}

export function transform(input: { text: string }, options: K8sConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const name = options.name.trim() === '' ? 'app' : validateName(options.name)
  const image = options.image.trim() === '' ? 'nginx:alpine' : validateImage(options.image)
  const port = options.port.trim() === '' ? 80 : validatePort(options.port)
  const replicas = options.replicas.trim() === '' ? 1 : validateReplicas(options.replicas)

  switch (options.kind) {
    case 'Deployment':
      return deployment(name, image, port, replicas) + '\n'
    case 'Service':
      return service(name, port) + '\n'
    case 'ConfigMap':
      return configMap(name) + '\n'
    case 'Ingress':
      return ingress(name, port) + '\n'
    case 'PersistentVolumeClaim':
      return pvc(name) + '\n'
    default:
      throw new Error('不支持的资源类型：' + options.kind)
  }
}

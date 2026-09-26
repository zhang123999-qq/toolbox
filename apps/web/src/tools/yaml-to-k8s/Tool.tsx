import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { YamlToK8sInput, YamlToK8sOptions } from './schema'

const EXAMPLE: YamlToK8sInput = {
  text: [
    'apiVersion: apps/v1',
    'kind: Deployment',
    'metadata:',
    '  name: web',
    'spec:',
    '  replicas: 3',
    '  selector:',
    '    matchLabels:',
    '      app: web',
    '  template:',
    '    metadata:',
    '      labels:',
    '        app: web',
    '    spec:',
    '      containers:',
    '        - name: web',
    '          image: nginx:alpine',
    '          ports:',
    '            - containerPort: 80',
  ].join('\n'),
}

export default function Tool() {
  return (
    <TwoColumn<YamlToK8sInput, YamlToK8sOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
    />
  )
}

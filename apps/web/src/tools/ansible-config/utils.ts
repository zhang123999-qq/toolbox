import type { AnsibleConfigOptions } from './schema'

/** 是否含 C0 控制字符（换行/回车等，用于阻止注入新的 YAML 键） */
function hasControlChar(v: string): boolean {
  for (const ch of v) {
    if ((ch.codePointAt(0) ?? 0) <= 0x1f) return true
  }
  return false
}

/** 单行标量：拒绝换行等控制字符；返回值由调用方以 YAML 双引号安全包裹 */
function singleLine(raw: string, field: string): string {
  const v = raw.trim()
  if (hasControlChar(v)) throw new Error(`${field}不能包含换行或控制字符`)
  return v
}

export function transform(input: { text: string }, options: AnsibleConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')

  const hosts = singleLine(options.hosts || 'all', '主机模式（hosts）') || 'all'
  const playName = singleLine(options.taskName || 'configure servers', '剧本名称（name）')

  const lines: string[] = [
    '- name: ' + JSON.stringify(playName),
    '  hosts: ' + JSON.stringify(hosts),
  ]
  if (options.become) lines.push('  become: yes')
  lines.push('  tasks:')

  if (options.installPackage) {
    lines.push(
      '    - name: Install packages',
      '      ansible.builtin.apt:',
      '        name: curl',
      '        state: present',
    )
  }
  if (options.copyFile) {
    lines.push(
      '    - name: Copy config file',
      '      ansible.builtin.copy:',
      '        src: files/app.conf',
      '        dest: /etc/app.conf',
    )
  }
  if (options.startService) {
    lines.push(
      '    - name: Start and enable service',
      '      ansible.builtin.systemd:',
      '        name: app',
      '        state: started',
      '        enabled: yes',
    )
  }
  if (options.manageUser) {
    lines.push(
      '    - name: Create deploy user',
      '      ansible.builtin.user:',
      '        name: deploy',
      '        shell: /bin/bash',
    )
  }

  const taskCount = [
    options.installPackage,
    options.copyFile,
    options.startService,
    options.manageUser,
  ].filter(Boolean).length
  if (taskCount === 0) throw new Error('请至少选择一个任务')

  return lines.join('\n') + '\n'
}

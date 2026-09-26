import type { LinuxCheatsheetOptions } from './schema'

interface Command {
  readonly cmd: string
  readonly desc: string
  readonly example: string
}
interface Section {
  readonly key: string
  readonly title: string
  readonly commands: readonly Command[]
}

export const SECTIONS: readonly Section[] = [
  {
    key: 'file',
    title: '文件',
    commands: [
      { cmd: 'ls -lah', desc: '详细列出文件', example: 'ls -lah' },
      { cmd: 'cd <dir>', desc: '切换目录', example: 'cd /var/log' },
      { cmd: 'pwd', desc: '显示当前目录', example: 'pwd' },
      { cmd: 'cp -r <src> <dst>', desc: '递归复制', example: 'cp -r app backup/' },
      { cmd: 'mv <src> <dst>', desc: '移动 / 重命名', example: 'mv old.txt new.txt' },
      { cmd: 'rm -rf <dir>', desc: '强制递归删除', example: 'rm -rf build/' },
      { cmd: 'mkdir -p <dir>', desc: '递归建目录', example: 'mkdir -p a/b/c' },
      { cmd: 'touch <file>', desc: '新建空文件', example: 'touch log.txt' },
      { cmd: 'cat <file>', desc: '输出文件全部内容', example: 'cat app.conf' },
      {
        cmd: 'tail -f <file>',
        desc: '实时查看文件末尾',
        example: 'tail -f /var/log/nginx/access.log',
      },
      { cmd: 'head -n 20 <file>', desc: '查看文件开头', example: 'head -n 20 app.log' },
      { cmd: 'wc -l <file>', desc: '统计行数', example: 'wc -l data.csv' },
    ],
  },
  {
    key: 'process',
    title: '进程',
    commands: [
      { cmd: 'ps aux', desc: '查看全部进程', example: 'ps aux' },
      { cmd: 'top / htop', desc: '实时资源占用', example: 'htop' },
      { cmd: 'kill <pid>', desc: '结束进程', example: 'kill 1234' },
      { cmd: 'kill -9 <pid>', desc: '强制结束', example: 'kill -9 1234' },
      { cmd: 'pkill <name>', desc: '按名字结束', example: 'pkill node' },
      { cmd: 'jobs', desc: '查看后台任务', example: 'jobs' },
      { cmd: 'bg / fg', desc: '后台 / 前台切换', example: 'fg %1' },
    ],
  },
  {
    key: 'network',
    title: '网络',
    commands: [
      { cmd: 'ip addr', desc: '查看网卡与 IP', example: 'ip addr' },
      { cmd: 'ss -tlnp', desc: '查看监听端口', example: 'ss -tlnp' },
      { cmd: 'ping <host>', desc: '测连通性', example: 'ping -c 4 example.com' },
      { cmd: 'curl -I <url>', desc: '查看响应头', example: 'curl -I https://example.com' },
      {
        cmd: 'curl -X POST <url>',
        desc: '发 POST 请求',
        example: "curl -X POST -d 'a=1' https://api.example.com",
      },
      { cmd: 'netstat -anp', desc: '查看连接（旧）', example: 'netstat -anp' },
      { cmd: 'wget <url>', desc: '下载文件', example: 'wget https://example.com/file.tar.gz' },
    ],
  },
  {
    key: 'permission',
    title: '权限',
    commands: [
      { cmd: 'chmod 755 <file>', desc: '改数字权限', example: 'chmod +x deploy.sh' },
      { cmd: 'chown user:group <file>', desc: '改所有者', example: 'chown www-data:www-data app/' },
      { cmd: 'sudo <cmd>', desc: '以 root 执行', example: 'sudo systemctl restart nginx' },
      { cmd: 'su - <user>', desc: '切换用户', example: 'su - deploy' },
    ],
  },
  {
    key: 'disk',
    title: '磁盘',
    commands: [
      { cmd: 'df -h', desc: '查看分区占用', example: 'df -h' },
      { cmd: 'du -sh <dir>', desc: '查看目录大小', example: 'du -sh /var/log' },
      { cmd: 'lsblk', desc: '查看块设备', example: 'lsblk' },
      { cmd: 'fdisk -l', desc: '查看磁盘分区', example: 'sudo fdisk -l' },
      { cmd: 'mount / umount', desc: '挂载 / 卸载', example: 'mount /dev/sdb1 /mnt' },
    ],
  },
  {
    key: 'user',
    title: '用户',
    commands: [
      { cmd: 'whoami', desc: '当前用户', example: 'whoami' },
      { cmd: 'id', desc: '当前 UID/GID', example: 'id' },
      { cmd: 'useradd <name>', desc: '新建用户', example: 'sudo useradd -m deploy' },
      { cmd: 'passwd <name>', desc: '改密码', example: 'sudo passwd deploy' },
      { cmd: 'groups <name>', desc: '查看用户组', example: 'groups deploy' },
    ],
  },
  {
    key: 'search',
    title: '搜索',
    commands: [
      { cmd: 'grep -r "<text>" <dir>', desc: '递归搜内容', example: 'grep -r "TODO" src/' },
      { cmd: 'find <dir> -name <pat>', desc: '按名找文件', example: 'find /var -name "*.log"' },
      { cmd: 'which <cmd>', desc: '定位命令', example: 'which node' },
      { cmd: 'locate <file>', desc: '按索引找文件', example: 'locate nginx.conf' },
      { cmd: 'awk / sed', desc: '文本处理', example: "ps aux | awk '{print $1}'" },
    ],
  },
  {
    key: 'archive',
    title: '压缩',
    commands: [
      { cmd: 'tar -czf out.tgz <dir>', desc: '打包 gzip', example: 'tar -czf app.tgz app/' },
      { cmd: 'tar -xzf in.tgz', desc: '解包 gzip', example: 'tar -xzf app.tgz' },
      { cmd: 'zip -r out.zip <dir>', desc: 'zip 压缩', example: 'zip -r out.zip app/' },
      { cmd: 'unzip in.zip', desc: '解压 zip', example: 'unzip in.zip' },
      { cmd: 'gzip / gunzip', desc: '单文件压缩', example: 'gzip big.log' },
    ],
  },
]

export const CATEGORY_TITLES: Readonly<Record<string, string>> = {
  all: '全部',
  file: '文件',
  process: '进程',
  network: '网络',
  permission: '权限',
  disk: '磁盘',
  user: '用户',
  search: '搜索',
  archive: '压缩',
}

export function assertCategory(category: string): void {
  if (!(category in CATEGORY_TITLES)) throw new Error('不支持的分类：' + category)
}

export function transform(input: { text: string }, options: LinuxCheatsheetOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertCategory(options.category)
  const picked =
    options.category === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === options.category)
  const out: string[] = []
  for (const s of picked) {
    out.push(`## ${s.title}`, '', '命令 | 说明 | 示例', '--- | --- | ---')
    for (const c of s.commands) out.push(`${c.cmd} | ${c.desc} | ${c.example}`)
    out.push('')
  }
  return out.join('\n').trimEnd()
}

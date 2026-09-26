# Ansible 配置

按勾选的任务拼出一个 Ansible Playbook YAML。

## 输入

| 字段   | 类型   | 约束              |
| ------ | ------ | ----------------- |
| `text` | string | 最大 200,000 字符 |

输入框只作触发用。

## 选项

| 选项 key         | 界面标签     | 默认                |
| ---------------- | ------------ | ------------------- |
| `hosts`          | 主机组       | `all`               |
| `taskName`       | Play 名称    | `configure servers` |
| `become`         | sudo 提权    | 开                  |
| `installPackage` | 安装软件包   | apt 装 curl         |
| `copyFile`       | 复制配置文件 | copy 模块           |
| `startService`   | 启动服务     | systemd 模块        |
| `manageUser`     | 管理用户     | user 模块           |

## 输出

```yaml
- name: configure servers
  hosts: all
  become: yes
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: curl
        state: present
```

## 限制

- 包管理写死 apt（Debian/Ubuntu），RHEL 系需换成 yum/dnf
- 一个任务都不选时报错

## 数据流向

**纯本地处理。** `meta.api = false`。

## 元信息

| 项       | 值                               |
| -------- | -------------------------------- |
| 全局编号 | #224                             |
| 域       | `devops`（开发 / 运维 / 云原生） |
| 大组     | `dev`                            |
| 优先级   | P2                               |
| 可行性   | A（纯 JS）                       |
| 模板     | T2（双栏）                       |

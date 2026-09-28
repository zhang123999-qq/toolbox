# 表单无障碍

表单 HTML 无障碍检查：控件标签关联（label[for] / 包裹 / aria-label / aria-labelledby）、placeholder 冒充 label、必填标识、aria-describedby 引用存在性、aria-invalid 错误提示关联、图片按钮 alt、fieldset/legend 分组、表单提交按钮、重复 id。

## 用途

- 发版前快速扫描表单页面的无障碍问题
- 排查屏幕阅读器读不出表单项的原因
- 给出错误/警告分级与修复方向

## 输入

| 字段   | 类型   | 约束            |
| ------ | ------ | --------------- |
| `text` | string | 表单 HTML 片段  |

## 说明

- 纯本地检查（DOMParser 解析），无网络请求。
- 静态检查：无法判断标签文字是否有意义、颜色对比度等动态/视觉问题。
- 输入需包含表单结构，纯文本输入会提示粘贴 HTML。

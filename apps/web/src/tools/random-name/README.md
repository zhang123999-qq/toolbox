# 随机人名 random-name（#374）

## 用途 | Purpose

- 批量生成中文 / 英文人名，用于测试数据填充、注册模拟、占位文案。
- Generate random Chinese / English names in batch for test data, signup mocking, or placeholder copy.

## 输入 | Input

- 本工具无实质输入，文本框留空即可。
- No real input needed; leave the textarea empty.

## 选项 | Options

| 选项          | 说明                                | Option   | Description                            |
| ------------- | ----------------------------------- | -------- | -------------------------------------- |
| 数量 count    | 1–50 的整数，默认 1                 | Count    | Integer 1–50, defaults to 1            |
| 性别 gender   | male / female / random，默认 random | Gender   | male / female / random, default random |
| 语言 language | zh / en，默认 zh                    | Language | zh / en, defaults to zh                |

## 输出 | Output

- 每行一个名字：中文为「姓 + 名」，英文为「名 + 姓」。
- One name per line: Chinese = surname + given; English = given + surname.

## 限制 | Limits

- 数量上限 50；非法数量 / 性别 / 语言会显示中文错误提示。
- 词库为常见姓氏与名字子集，非穷尽统计分布。
- Count capped at 50; invalid options show a Chinese error.
- The dictionary covers common surnames/given names, not a full statistical distribution.

## 数据流向 | Data flow

- 全部在浏览器本地计算，随机选取取自 `crypto.getRandomValues`，无网络请求。
- All computation happens locally in the browser; randomness from `crypto.getRandomValues`; no network requests.

## 示例 | Example

数量 3、中文、随机性别 →

```
王浩然
李芳
张伟
```

（实际值随机）

## 元信息 | Meta

- 编号 #374 · category `random` · group `design` · 优先级 P1 · 可行性 A · 纯前端 · deps: 无

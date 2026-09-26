# JSON 转 Python

由 JSON 样本生成 Python 模型：`@dataclass`、Pydantic `BaseModel` 或 `TypedDict`。

## 用途

写数据类 / 请求响应模型时，贴一份真实 JSON 即可得到类型齐全的 Python 定义，
嵌套对象自动拆成模块级类（被引用者先声明），可直接复制进项目。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 2,000,000 字符 |

根节点必须是对象，或元素全为对象的非空数组。

## 输出

| 字段   | 类型   | 说明                        |
| ------ | ------ | --------------------------- |
| `text` | string | Python 模型；空输入返回空串 |

输出含必要的 `import` 头；空类用 `pass` 占位。

## 选项

| 选项     | 取值                            | 默认        | 说明                                                          |
| -------- | ------------------------------- | ----------- | ------------------------------------------------------------- |
| `style`  | dataclass / pydantic / typedict | `dataclass` | 目标模型风格                                                  |
| `mode`   | snake / keep                    | `snake`     | snake 转 snake_case 字段并附「原 JSON 键」注释；keep 保留原键 |
| `indent` | 2 / 4 / tab                     | `4`         | 一级缩进（PEP 8 默认 4）                                      |

## 类型映射

| JSON            | Python（非空） | Python（可能为 null / 缺失） |
| --------------- | -------------- | ---------------------------- |
| string          | `str`          | `str`                        |
| true / false    | `bool`         | `Optional[bool]`             |
| 整数            | `int`          | `Optional[int]`              |
| 浮点            | `float`        | `Optional[float]`            |
| null / 无法推断 | `Any`          | `Any`                        |
| 数组            | `List[T]`      | `List[T]`                    |
| 对象            | 独立类         | 独立类                       |

## 限制

- 全部逻辑为纯 TS 自研，不依赖 npm 代码生成库，行为以本文档为准
- 类型由样本推断：样本未出现的字段无法预知；数组多条样本合并后，缺失键标记为 `Optional[T]`
- `str` 可承载空值，可空字符串不再包 `Optional`；嵌套对象可空时也不额外包 `Optional`
- snake 模式只改名并附原键注释，不自动生成 Pydantic `alias` / `Field`
- 类型注解使用 `typing.List/Optional`（兼容旧版 Python）；字段名撞关键字时加尾下划线
- 输入上限 2,000,000 字符，超限抛 `JsonToPythonError`

## 数据流向

**纯本地处理。** 输入仅在浏览器内存中处理，不发送网络请求，不写入服务端。`meta.api = false`。

## 示例

输入：

```json
{ "userId": 1, "userName": "工具库" }
```

输出（dataclass + snake，4 空格）：

```python
from dataclasses import dataclass
from typing import Any, List, Optional


@dataclass
class Root:
    # 原 JSON 键: "userId"
    user_id: int
    user_name: str
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #145                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

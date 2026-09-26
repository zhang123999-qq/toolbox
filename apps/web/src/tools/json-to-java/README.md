# JSON 转 Java

由 JSON 样本生成 Java 类：传统 POJO（带 getter / setter）、紧凑 `record` 或 Lombok `@Data`。

## 用途

对接后端或对照 JSON 设计模型时，贴一份真实样本即可得到可用的 Java 类，省去手抄字段；
嵌套对象自动拆成独立类，被引用的子类先声明，可直接复制进项目。

## 输入

| 字段   | 类型   | 约束                |
| ------ | ------ | ------------------- |
| `text` | string | 最大 2,000,000 字符 |

根节点必须是对象，或元素全为对象的非空数组。

## 输出

| 字段   | 类型   | 说明                    |
| ------ | ------ | ----------------------- |
| `text` | string | Java 类；空输入返回空串 |

## 选项

| 选项     | 取值                   | 默认     | 说明                                     |
| -------- | ---------------------- | -------- | ---------------------------------------- |
| `style`  | pojo / record / lombok | `pojo`   | 传统 POJO、Java record 或 Lombok `@Data` |
| `mode`   | public / package       | `public` | 类与方法是否带 `public` 修饰             |
| `indent` | 2 / 4 / tab            | `2`      | 一级缩进                                 |

## 类型映射

| JSON         | Java（非空） | Java（可能为 null） |
| ------------ | ------------ | ------------------- |
| string       | `String`     | `String`            |
| true / false | `boolean`    | `Boolean`           |
| 整数         | `long`       | `Long`              |
| 浮点         | `double`     | `Double`            |
| null         | `Object`     | `Object`            |
| 数组         | `T[]`        | `T[]`               |
| 对象         | 独立类       | 独立类              |

## 限制

- 全部逻辑为纯 TS 自研，不依赖 npm 代码生成库，行为以本文档为准
- 类型由样本推断：样本没出现的字段无法预知；数组多条样本会合并，缺失键用包装类型表示可空
- 字段名转 camelCase、类名转 PascalCase；键名无 ASCII 字母时字段回退 `fieldN`、类名回退 `Nested`
- 不生成泛型反序列化代码、不写注解（Lombok 风格仅加一个 `@Data`）
- 输入上限 2,000,000 字符，超限抛 `JsonToJavaError`

## 数据流向

**纯本地处理。** 输入仅在浏览器内存中处理，不发送网络请求，不写入服务端。`meta.api = false`。

## 示例

输入：

```json
{ "meta": { "stars": 870 }, "name": "工具库" }
```

输出（POJO，节选）：

```java
public class Meta {
  private long stars;

  public long getStars() {
    return stars;
  }

  public void setStars(long stars) {
    this.stars = stars;
  }
}

public class Root {
  private Meta meta;
  private String name;
  // …省略 getter / setter
}
```

## 元信息

| 项       | 值                        |
| -------- | ------------------------- |
| 全局编号 | #143                      |
| 域       | `data-format`（数据格式） |
| 大组     | `dev`                     |
| 优先级   | P1                        |
| 可行性   | A（纯 JS）                |
| 模板     | T2（双栏）                |

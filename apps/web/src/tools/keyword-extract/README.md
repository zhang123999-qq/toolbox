# 关键词提取 Keyword Extraction（#613）

纯 JS 的 TF（词频）关键词提取：分词 → 去停用词 → 按词频排序取 TopN。
中英停用词表内置，不联网、不调外部 API。

## 使用方法

1. 左侧粘贴文本（上限 50,000 字符）；
2. 右上角设置 TopN（1~100，默认 20）；
3. 输出 `词 ×次数（占比%）` 列表，可复制/下载。

分词规则：英文单词转小写；中文连续序列整体保留并追加二元滑动窗口，
兼容无空格的中文文本。

## 错误处理

- 文本为空 / 超长显示中文错误；
- 全停用词（如只输入"的 the"）提示输入包含实词的文本；
- TopN 非法提示范围。

## English

TF-based keyword extraction in pure JavaScript: tokenize → remove stopwords
(built-in Chinese/English lists) → rank by term frequency → top N.
No network calls. Set TopN (1–100, default 20) in the options panel.

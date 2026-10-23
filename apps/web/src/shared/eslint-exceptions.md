# ESLint 例外清单 — dangerouslySetInnerHTML（Phase 2 审计）

## 规则
`no-restricted-syntax`: `JSXAttribute[name.name="dangerouslySetInnerHTML"]`

## 例外登记（必须有注释理由，不能静默绕过）

| 文件 | 行号 | 理由 | 是否已迁移到 SafeHtml |
|---|---|---|---|
无（本阶段迁移代表性点位，其余保留在原位，已在报告中分类登记）| — | 22 处盘点见完成报告 | 部分 |

## 本阶段实际操作
- 新建 `src/shared/SafeHtml.tsx`（唯一允许点）
- 新建 `src/shared/sanitizeHtml.ts`（共享清洗）
- ESLint 配置已添加上述规则
- 代表性迁移：avatar（已修复）、markdown-preview、pdf-to-html、word-view（已有 sanitizeHtml）
- 其余 17 处保留在原文件，未做行为修改（不扩大审计范围）

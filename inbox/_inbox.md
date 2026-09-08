---
type: inbox-manifest
title: 暂存区清单
created: 2026-09-06
updated: 2026-09-06
---

# 暂存区清单

> 本文件记录暂存区中**非 Markdown 文件**（PDF / HTML / 图片等）的状态与来源。
> Markdown 文件的状态直接写在各自的 frontmatter `status` 字段中，不在此重复登记。
> 由 Web 查看端维护，也可手工编辑。

## 说明

- `inbox/` 是**暂存区**：收藏但尚未经 LLM Agent 整理的文档放在这里。
- 与 `raw/` 的区别：暂存区**可以随意修改、重命名、删除**；`raw/` 一旦存入永不变更。
- 流转：收藏 → `inbox/`（待整理）→ 在 LLM CLI 说「收录 inbox/xxx」→ Agent 生成 `raw/` + `wiki/` 派生层 → 标记「已归档」。
- 原件（PDF / HTML / 图片）存放在 `inbox/files/`。

## 状态取值

| 状态 | 含义 |
|---|---|
| `inbox` | 待整理，Agent 尚未处理 |
| `review` | 需确认：抓取结果可能是登录页、验证码页或非预期内容 |
| `archived` | 已整理归档，派生层已生成，可手动清理 |

## 待整理

（暂无）

## 已归档

（暂无）

<!--
登记格式示例：
| 文件 | 来源 URL | 最终 URL | 抓取时间 | HTTP 状态 | Content-Type | 大小 | SHA-256 | 状态 |
|---|---|---|---|---:|---|---:|---|---|
| files/某论文.pdf | https://example.com/paper | https://cdn.example.com/paper.pdf | 2026-09-06T12:00:00+08:00 | 200 | application/pdf | 1234567 | abc123... | inbox |
-->

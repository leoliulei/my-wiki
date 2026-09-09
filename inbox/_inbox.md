---
type: inbox-manifest
title: 暂存区清单
created: 2026-09-06
updated: 2026-09-10
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

| 文件 | 来源 URL | 抓取时间 | 大小 | 状态 |
|---|---|---|---:|---|
| files/2026-09-10-Linux 文件 IO 演进史-从 read-write 到 io_uring 的四次范式跃迁.html | https://mp.weixin.qq.com/s/F4DSsGd6VGgW6xybDbrFog | 2026-09-09T17:17:58Z | 8,608,939 | archived |

<!--
登记格式示例：
| 文件 | 来源 URL | 最终 URL | 抓取时间 | HTTP 状态 | Content-Type | 大小 | SHA-256 | 状态 |
|---|---|---|---|---:|---|---:|---|---|
| files/某论文.pdf | https://example.com/paper | https://cdn.example.com/paper.pdf | 2026-09-06T12:00:00+08:00 | 200 | application/pdf | 1234567 | abc123... | inbox |
-->

<!-- WEB_VIEWER_DATA
[
  {
    "path": "inbox/files/wappoc_appmsgcaptcha.html",
    "sourceUrl": "https://mp.weixin.qq.com/s/F4DSsGd6VGgW6xybDbrFog",
    "finalUrl": "https://mp.weixin.qq.com/mp/wappoc_appmsgcaptcha?poc_token=HN6LoWqjnZKRsQabeaNQoWzFvrhv78BsyAOp27XC&target_url=https%3A%2F%2Fmp.weixin.qq.com%2Fs%2FF4DSsGd6VGgW6xybDbrFog",
    "fetchedAt": "2026-09-09T16:39:58.343Z",
    "httpStatus": 200,
    "contentType": "text/html",
    "size": 18164,
    "sha256": "a07966ef85b67f2ccc006fa57582b9074270b5de51dcca79f41888ad3115e0e2",
    "status": "review"
  },
  {
    "path": "inbox/files/2026-09-10-Linux 文件 IO 演进史-从 read-write 到 io_uring 的四次范式跃迁.html",
    "title": "Linux 文件 IO 演进史-从 read-write 到 io_uring 的四次范式跃迁",
    "sourceUrl": "https://mp.weixin.qq.com/s/F4DSsGd6VGgW6xybDbrFog",
    "finalUrl": "https://mp.weixin.qq.com/s/F4DSsGd6VGgW6xybDbrFog",
    "fetchedAt": "2026-09-09T17:17:58.062Z",
    "httpStatus": 200,
    "contentType": "text/html",
    "size": 8608939,
    "sha256": "fab3729e0e246b7e0f05655fd2211c730c62b8dc69556e062fb4df459090af75",
    "contentSha256": "f729c1fe4ebd8b652cd064e3c6851dab2fdc05010f2846588cf8350fdc1e5e45",
    "status": "archived"
  }
]
WEB_VIEWER_DATA -->

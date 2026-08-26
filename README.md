# 我的 LLM Wiki 个人知识库

基于 [Andrej Karpathy LLM Wiki 方法论](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) 搭建的个人知识库。

## 核心理念

- **人负责 sourcing，LLM 负责记账**：你只管找资料和提问，LLM 做摘要、交叉引用、归档、维护。
- **知识复利累积**：每加一篇资料、每问一个问题，知识库都在变厚，而不是问完即散。
- **纯 Markdown，无黑盒**：所有内容都是可读、可编辑、可 Git 版本控制的 Markdown 文件，不用向量数据库，不用 RAG 框架。

## 快速开始

### 1. 收录新资料

在能读写本地文件的 LLM CLI（Claude Code / Cursor / OpenCode / 豆包等）中，进入本目录后直接说：

```
收录 https://example.com/article
```

或把 PDF / 文本丢给它，LLM 会自动完成：抓取 → 存 raw → 生成摘要 → 更新实体/概念页 → 建对比 → 更新索引 → 写日志。

### 2. 查询知识

```
这个知识库里关于 X 有哪些讨论？
A 和 B 的核心区别是什么？
```

LLM 先读索引定位，再综合回答。有价值的答案会归档到 `wiki/synthesis/`。

### 3. 健康检查

```
lint wiki
```

LLM 扫描断链、孤立页面、矛盾描述、过时信息，自动修复或给出建议。

## 目录结构

```
my-wiki/
├── CLAUDE.md              # 规则文件（LLM 的"程序"）
├── AGENTS.md              # 软链到 CLAUDE.md，兼容多家 CLI
├── README.md              # 本文件
├── raw/                   # 不可变原始资料
│   ├── YYYY-MM-DD-标题.md
│   └── assets/            # 图片、PDF 等附件
└── wiki/                  # LLM 派生的理解层
    ├── summaries/         # 每篇资料一个摘要
    ├── entities/          # 人物、组织、产品、技术
    ├── concepts/          # 方法论、架构模式、理论
    ├── comparisons/       # A vs B 对比
    ├── overviews/         # 主题综述
    ├── synthesis/         # 问答归档（你的观点库）
    ├── _index.md          # 全库内容索引
    └── _log.md            # 操作日志
```

## 浏览方式

- **Obsidian**（推荐）：把本目录作为 Vault 打开，自动识别 `[[wiki-link]]` 并生成关系图谱。
- **VS Code + Foam 插件**：IDE 派首选。
- **任意 Markdown 编辑器**：纯文本，任何编辑器都能打开。
- **命令行**：`grep -r "\[\[" wiki/` 足以应付大多数查询。

## 进阶建议

1. **Git 版本控制**：`git init`，每次摄取后 commit，知识可回溯、可多设备同步。
2. **多知识库分离**：不同领域建不同目录（如 `research-wiki/`、`product-wiki/`），避免单库过大。
3. **本地模型**：数据敏感时可配合 Ollama + OpenCode 完全离线运行。
4. **网页剪藏**：安装 Obsidian Web Clipper 浏览器插件，一键把网页存为 Markdown 到 `raw/`。

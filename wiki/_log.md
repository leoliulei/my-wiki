---
type: log
title: 操作日志
created: 2026-08-26
---

# 操作日志

> 按时间倒序记录知识库的所有变更操作。

## 2026-08-26

### 收录：Mooncake 论文（第一篇资料）

- **原始资料**：`raw/2026-08-26-mooncake-paper.md`
- **来源**：arXiv:2407.00079，"Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving"
- **作者**：Ruoyu Qin, Zheming Li, Weiran He, Mingxing Zhang, Yongwei Wu, Weimin Zheng, Xinran Xu（Moonshot AI + 清华大学）
- **发表**：USENIX FAST 2025，最佳论文奖

**新建页面（6 个）**：
1. `wiki/summaries/mooncake-kvcache-centric-architecture.md` — 论文摘要
2. `wiki/entities/moonshot-ai.md` — Moonshot AI 实体页
3. `wiki/entities/kimi.md` — Kimi 实体页
4. `wiki/entities/tsinghua-madsys-lab.md` — 清华大学 MADSys 实验室实体页
5. `wiki/entities/usenix-fast-2025.md` — USENIX FAST 2025 会议实体页
6. 更新 `wiki/_index.md` 索引

**未建立**：概念页（按规则需 2 篇以上资料提及同一概念才建立）、对比页、综述页。

**值得注意**：
- Mooncake 的"以存换算"思路与传统 RAG 的"以算换存"形成有趣对比，后续可关注是否建立对比页。
- PD 分离（Prefill-Decoding Disaggregation）正成为业界主流，后续资料可能触发概念页建立。

---

### 初始化知识库

- 创建目录结构、CLAUDE.md 规则文件、初始索引和日志。基于 Karpathy LLM Wiki 方法论。

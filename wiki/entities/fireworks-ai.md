---
type: entity
title: Fireworks AI
aliases: [Fireworks AI]
sources:
  - raw/2026-09-01-fireworks-ai-research.md
created: 2026-09-01
updated: 2026-09-01
tags: [公司, AI基础设施, 推理平台, 开源模型, 美国]
---

# Fireworks AI

## 基本信息

- **类型**：美国 AI 推理/模型服务平台（B2B 基础设施）
- **成立**：2022 年 10 月
- **总部**：加州圣马特奥/雷德伍德城
- **员工**：约 304 人
- **创始人/CEO**：[[Lin Qiao]]（前 Meta PyTorch 负责人）
- **定位**：开源与私有模型的生产级托管推理——企业无需自建 GPU 机队即可微调、部署、规模化运行开源大模型
- **累计融资**：约 $18 亿；D 轮后估值 **$175 亿**（2026-07）

## 业务模式

- **产品矩阵（按生命周期）**：
  - Serverless 推理（按 Token 计费）
  - On-Demand 专用 GPU（按 GPU 秒/小时）
  - 企业预留容量（BYOC、多区域）
  - 微调 / RL 强化学习微调
  - Training API / Training Agent（2026-08 GA）
  - Voice Agent 平台（目标 <500ms，切客服/BPO 预算池）
- **技术壁垒**：自研 FireAttention 推理引擎（含 AMD 优化）、FireOptimizer、投机解码、前缀缓存、Multi-LoRA 多适配器合并、连续批处理
- **战略**：开源模型中立（日 0 支持新开源模型）+ "专业化智能"（95% Token 来自客户定制模型）

## 财务与增长

| 时间 | 年化收入 ARR | 日处理 Token |
|---|---|---|
| 2025-12 | ~$3.05亿 | ~15万亿 |
| 2026-02 | $3.15亿 | ~18万亿 |
| 2026-05 | ~$8亿 | ~28万亿 |
| 2026-07 | $10亿+（~5x YoY） | 40万亿+ |

- 客户：1,000+（2024-07）→ 10,000+（2025-11）
- 毛利率：约 50%，目标 60%
- 估值倍数：D 轮约 17.5x 收入

## 融资历程

| 轮次 | 时间 | 金额 | 估值 | 领投 |
|---|---|---|---|---|
| A轮 | 2024-03 | $25M | — | Benchmark |
| B轮 | 2024-07 | $52M | $5.52亿 | 红杉 |
| C轮 | 2025-10 | $250M | $40亿 | Lightspeed/Index/Evantic |
| D轮 | 2026-07 | $1.505B | $175亿 | Atreides/Index/TCV |

## 客户

[[Cursor]]、Perplexity、Notion、Sourcegraph、Uber、DoorDash、Shopify、Upwork、Samsung、Verizon、GitLab、Quora、Harvey、Cresta、Hebbia 等。
典型案例：Cursor ~1000 Token/秒；Notion 延迟 2s→350ms；Cresta 数千 LoRA 成本较 GPT-4 低约 100 倍。

## 竞争

- 直接对手：[[Together AI]]、[[Baseten]]
- 硅片层：Groq、Cerebras、SambaNova
- 云厂商：AWS Bedrock、Google Vertex、Azure Foundry、Databricks（结构性威胁）
- 开源框架：vLLM、SGLang、NVIDIA NIM（长期商品化压力）

## 市场与前景

- **市场**：生成式 AI 模型支出 2025 ~$140亿 → 2028 ~$390亿；推理 SaaS 市场 2030 预计 ~$1052亿
- **TAM 扩张逻辑**：从纯推理 API 向语音/Agent 微调/多模态/企业治理延伸，把"单点推理"做成一站式 AI 运行时
- **机遇**：Voice Agent、Agent RL 微调、Multi-LoRA 适配器舰队、多区域部署（法兰克福/冰岛/东京/亚太）、英伟达+AMD 双重背书
- **风险**：推理商品化与价格下行；云厂商捆绑；GPU 依赖英伟达（其收购 Lepton 做竞品云）；客户集中（Cursor，且 SpaceX 拟 600 亿美元收购 Cursor）；17.5x 估值对增长/毛利兑现要求高

## 在知识库中的关联

- 调研来源：[[Fireworks AI 深度调研摘要]]（`raw/2026-09-01-fireworks-ai-research.md`）
- 与 Mooncake/KVCache（`raw/2026-08-26-mooncake-paper.md`）同属"推理基础设施"主题：一个讲架构（以存换算），一个讲商业模式（推理层价值卡位）
- 待关注：与 [[Together AI]] 的增速对比；英伟达收购 Lepton 后的 GPU 云竞争

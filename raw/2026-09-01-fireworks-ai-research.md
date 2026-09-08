---
type: raw
title: Fireworks AI 深度调研（公司、业务与前景）
source: 综合公开信息调研（官方公告 + 第三方研究 + 媒体报道）
author: Doubao（LLM 调研整理）
researched: 2026-09-01
tags: [Fireworks AI, 推理平台, 开源模型, AI基础设施, 融资]
attachments:
  - assets/2026-09-01-fireworks-ai-research.html
ingested: 2026-09-01
---

# Fireworks AI 深度调研（公司、业务与前景）

> 调研对象：https://fireworks.ai/ ｜ 调研日期：2026-09-01
> 完整报告（HTML）：[assets/2026-09-01-fireworks-ai-research.html](assets/2026-09-01-fireworks-ai-research.html)

## 一句话结论

Fireworks AI 是当前"开源模型推理平台"赛道规模与增长双领先的头部玩家：2026 年 7 月完成 15.05 亿美元 D 轮、投后估值 175 亿美元，年化收入突破 10 亿美元（一年约 5 倍），日处理 40 万亿+ Token，其中 95% 来自企业定制化模型。前景关键在三点：守住毛利率、摆脱单一客户依赖、抵御云厂商捆绑与开源商品化。

## 公司概况

- **成立**：2022 年 10 月，美国加州（总部圣马特奥/雷德伍德城）
- **员工**：约 304 人（2026-08）
- **创始人/CEO**：Lin Qiao（乔琳）——复旦计算机本硕、UCSB 博士，前 Meta 工程高级总监，构建过 Caffe2、PyTorch
- **联合创始人**：Dmytro Dzhulgakov（CTO）、Benny Chen（陈本尼）、Chenyu Zhao（赵晨宇）、Dmytro Ivchenko、James Reed、Pawel Garbacki（7 位中 3 位华人）
- **定位**：介于"闭源大模型 API"与"自建 GPU 自托管"之间的托管推理平台；黄仁勋称其为"AI 界的台积电"
- **累计融资**：约 18 亿美元

## 融资历程

| 轮次 | 时间 | 金额 | 估值 | 领投/参投 |
|---|---|---|---|---|
| 种子轮 | 2023-2024 | — | — | — |
| A轮 | 2024-03 | $25M | — | Benchmark 领投 |
| B轮 | 2024-07 | $52M | $5.52亿 | 红杉领投；英伟达、AMD、MongoDB、Databricks Ventures |
| C轮 | 2025-10 | $250M | $40亿 | Lightspeed、Index、Evantic；英伟达/AMD/MongoDB/Databricks 战略参投 |
| D轮 | 2026-07 | $1.505B | $175亿 | Atreides、Index、TCV；英伟达、Lightspeed、Bessemer、Menlo、Insight、Lone Pine、安大略教师退休基金、20VC |

- D 轮距 C 轮仅 9 个月，估值 7-9 个月从 $4B 跳到 $17.5B（约 4.4x）
- D 轮约 17.5x 收入倍数（显著高于传统基础设施软件 8-12x，低于部分模型实验室 20x+）

## 财务与增长

| 时间节点 | 年化收入 ARR | 同比增速 | 日处理 Token |
|---|---|---|---|
| 2025-12 | ~$3.05亿 | — | ~15万亿 |
| 2026-02 | $3.15亿 | +416% | ~18万亿 |
| 2026-05 | ~$8亿 | +724%（Sacra 估算） | ~28万亿 |
| 2026-07（D轮） | $10亿+ | ~5x | 40万亿+ |

- **客户量**：约 1,000 家（2024-07）→ 10,000+ 家（2025-11），企业客户 10 倍、日 Token 70 倍增长
- **毛利率**：约 50%（目标 60%）
- **客户集中**：Cursor 曾贡献约一半收入（2025 年）；2026-06 SpaceX 宣布 600 亿美元全股票收购 Cursor

## 业务模式

- **产品矩阵**：Serverless 推理（按 Token）→ On-Demand 专用 GPU（按 GPU 秒/小时）→ 企业预留容量 → 微调/RL 微调 → Training API（2026-08 GA）→ Voice Agent 平台（<500ms）
- **技术壁垒**：自研 FireAttention 推理引擎（含 AMD 优化）、FireOptimizer、投机解码、前缀缓存、Multi-LoRA 多适配器合并、连续批处理
- **战略**：开源模型中立（谁开源当红就日 0 支持谁）；"专业化智能"叙事——95% Token 来自客户定制模型
- **模型库**：1000+ 模型（Llama、DeepSeek、Qwen、Mistral、Kimi、GLM 等）
- **重大动作**：2026-03 收购实时算力编排公司 Hathora；AWS 战略合作协议；入驻 Microsoft Foundry

## 客户案例

- 客户：Cursor、Perplexity、Notion、Sourcegraph、Uber、DoorDash、Shopify、Upwork、Samsung、Verizon、GitLab、Quora、Harvey、Cresta、Hebbia 等
- Cursor：投机解码约 1000 Token/秒（标准 Llama 70B 的 13 倍）
- Notion：AI 功能延迟从约 2 秒降到 350ms（覆盖 1 亿+ 用户）
- Cresta：1 个基座模型 + 数千 LoRA 适配器，部分场景成本较 GPT-4 低约 100 倍

## 竞争格局

| 层级 | 玩家 | 威胁 |
|---|---|---|
| 托管开源平台 | Together AI、Baseten、Replicate、DeepInfra、Modal | 最直接对手；Together 2026-07 融 $8亿 @ $83亿；Baseten 主打 VPC 自托管 |
| 垂直硅片 | Groq、Cerebras、SambaNova | 硬件层压低延迟成本；Groq 与 Meta 合作 Llama 官方 API |
| 云厂商捆绑 | AWS Bedrock、Google Vertex、Azure Foundry、Databricks | 结构性威胁：并入既有云合同 |
| 开源商品化 | vLLM、SGLang、TensorRT、NVIDIA NIM | 长期压缩专有引擎优势；OpenRouter 路由层聚合 |

## 市场（TAM 相关）

- 生成式 AI 模型支出：2025 年 ~$140 亿 → 2028 年 ~$390 亿
- 推理 SaaS 市场：2030 年预计 ~$1052 亿（行业估算）
- "TAM 扩张"逻辑：从纯推理 API 向语音/Agent 微调/多模态/企业治理延伸

## 前景与风险

**机遇**：Voice Agent 切入客服/BPO 更大预算池；Agent 强化学习微调成为适配层；Multi-LoRA 适配器舰队加深粘性；多区域部署（法兰克福、冰岛、东京、亚太）；英伟达/AMD 双重背书

**风险**：① 推理商品化与 Token 价格下行；② 云厂商捆绑把其压成"优化插件"；③ GPU 不自建机队、重度依赖英伟达（后者收购 Lepton 做竞品云）；④ 客户集中（Cursor/SpaceX）；⑤ 17.5x 收入倍数对增长与毛利兑现要求极高

## 资料来源

- Fireworks 官方：D 轮公告 https://fireworks.ai/blog/series-d-announcement ；产品页 https://fireworks.ai/inference
- Sacra：https://sacra.com/c/fireworks-ai/
- Contrary Research：https://research.contrary.com/company/fireworks-ai
- Value Add VC：https://valueaddvc.com/blog/fireworks-ai-valuation-2026-17-5b-series-d-and-the-1b-arr-inference-business
- 媒体：SiliconANGLE、Fortune、CNBC、金融界、腾讯新闻、新浪、36氪、网易、Lanceum、AI2.Work、TechFastForward 等

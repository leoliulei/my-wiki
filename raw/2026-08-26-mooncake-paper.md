---
type: raw
title: Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving
source: https://arxiv.org/abs/2407.00079
authors: Ruoyu Qin, Zheming Li, Weiran He, Mingxing Zhang, Yongwei Wu, Weimin Zheng, Xinran Xu
affiliations: Moonshot AI, Tsinghua University
published: 2024-06-24 (arXiv v1), 2025-09-03 (v4)
venue: USENIX FAST 2025 (Best Paper Award)
tags: [LLM serving, KVCache, disaggregated architecture, inference]
attachments:
  - assets/2407.00079-mooncake.pdf
ingested: 2026-08-26
---

# Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving

## 原文摘要（Abstract）

Mooncake is the serving platform for Kimi, a leading LLM service provided by Moonshot AI. It features a KVCache-centric disaggregated architecture that separates the prefill and decoding clusters. It also leverages the underutilized CPU, DRAM, and SSD resources of the GPU cluster to implement a disaggregated cache of KVCache.

The core of Mooncake is its KVCache-centric scheduler, which balances maximizing overall effective throughput while meeting latency-related Service Level Objectives (SLOs). Unlike traditional studies that assume all requests will be processed, Mooncake faces challenges due to highly overloaded scenarios. To mitigate these, we developed a prediction-based early rejection policy.

Experiments show that Mooncake excels in long-context scenarios. Compared to the baseline method, Mooncake can achieve up to a 525% increase in throughput in certain simulated scenarios while adhering to SLOs. Under real workloads, Mooncake's innovative architecture enables Kimi to handle 75% more requests.

## 论文元信息

- **arXiv ID**: 2407.00079
- **DOI**: https://doi.org/10.48550/arXiv.2407.00079
- **页数**: 23 pages, 13 figures
- **学科分类**: cs.DC (Distributed, Parallel, and Cluster Computing); cs.AI; cs.AR
- **GitHub**: https://github.com/kvcache-ai/Mooncake
- **正式发表**: 第23届 USENIX 文件与存储技术会议 (FAST 2025)，获最佳论文奖 (Best Paper Award)
- **第一作者**: 秦若愚 (Ruoyu Qin)，清华大学计算机系博士生，导师章明星 (Mingxing Zhang)

## 核心技术要点

1. **PD 分离 (Prefill-Decoding Disaggregation)**: 将预填充阶段和解码阶段部署到独立的资源池，各自独立扩缩容。
2. **以 KVCache 为中心的全局缓存**: 利用 GPU 集群中闲置的 CPU、DRAM、SSD 和 NIC 资源，构建分布式 KVCache 缓存层，实现"以存换算"。
3. **KVCache 中心调度器**: 在最大化有效吞吐量的同时满足延迟相关的 SLO。
4. **基于预测的早期拒绝策略**: 针对高过载场景，提前预测并拒绝无法在 SLO 内完成的请求。
5. **Transfer Engine + Mooncake Store**: 已开源的两个核心组件，Transfer Engine 负责高速数据传输，Mooncake Store 负责分布式 KVCache 存储。

## 实验结果

- 模拟场景：最高 525% 吞吐量提升（相比 baseline），同时满足 SLO。
- 真实工作负载：Kimi 能多处理 75% 的请求。
- 在长上下文场景下表现尤为突出。

## 相关资源

- 本地 PDF: [assets/2407.00079-mooncake.pdf](assets/2407.00079-mooncake.pdf)（666KB，已下载）
- 论文 PDF（在线）: https://arxiv.org/pdf/2407.00079.pdf
- 开源仓库: https://github.com/kvcache-ai/Mooncake
- 清华大学报道: https://www.cs.tsinghua.edu.cn/info/1034/6611.htm

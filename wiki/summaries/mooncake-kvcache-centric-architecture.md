---
type: summary
title: Mooncake 论文摘要 — 以 KVCache 为中心的 LLM 推理分离架构
sources:
  - raw/2026-08-26-mooncake-paper.md
created: 2026-08-26
updated: 2026-08-26
tags: [LLM serving, KVCache, PD分离, 推理优化, 以存换算]
---

# Mooncake 论文摘要

## 一句话概括

Mooncake 是 [[Moonshot AI]] 旗下 [[Kimi]] 的底层推理服务平台，采用**以 KVCache 为中心的分离架构**，将 prefill 和 decoding 集群分离，并利用 GPU 集群中闲置的 CPU/DRAM/SSD 资源构建分布式 KVCache 缓存，实现"以存换算"，在长上下文场景下最高带来 525% 的吞吐量提升。

## 核心问题

传统 LLM 推理系统在高过载、长上下文场景下面临两大痛点：
1. **资源利用率不均**：prefill 阶段计算密集，decoding 阶段内存带宽密集，混部导致资源浪费。
2. **KVCache 重复计算**：相同前缀的请求重复计算 KVCache，没有跨请求复用机制。

## 解决方案

### 1. PD 分离架构
- 将 prefill 和 decoding 部署到独立集群，各自独立扩缩容。
- prefill 集群侧重计算吞吐，decoding 集群侧重并发连接数。

### 2. 分布式 KVCache 全局缓存（Mooncake Store）
- 利用 GPU 集群中未充分利用的 CPU、DRAM、SSD、NIC 资源。
- 构建跨节点的 KVCache 缓存层，相同前缀只需计算一次。
- 通过 Transfer Engine 实现高速缓存块迁移。

### 3. KVCache 中心调度器
- 以 KVCache 命中率为核心调度指标，而非传统的 GPU 利用率。
- 在最大化有效吞吐量的同时满足延迟 SLO。

### 4. 基于预测的早期拒绝
- 高过载场景下，预测请求是否能在 SLO 内完成。
- 提前拒绝无法满足的请求，避免拖累整体系统。

## 关键结果

| 场景 | 效果 |
|---|---|
| 模拟场景（长上下文） | 最高 **525%** 吞吐量提升 |
| Kimi 真实工作负载 | 多处理 **75%** 请求 |
| 学术认可 | [[USENIX FAST 2025]] **最佳论文奖** |

## 相关实体

- **机构**：[[Moonshot AI]]、[[清华大学 MADSys 实验室]]
- **产品**：[[Kimi]]
- **会议**：[[USENIX FAST 2025]]
- **第一作者**：秦若愚（清华大学博士生，导师章明星）

## 我的标注

- 这是 LLM 推理系统领域"以存换算"思路的代表性工作，与传统 RAG/向量检索的"以算换存"形成有趣对比。
- PD 分离正在成为业界主流（vLLM、SGLang 等均已支持），Mooncake 是较早系统化论证并落地的工作之一。
- 开源组件（Transfer Engine + Mooncake Store）已被 SGLang 等框架集成。

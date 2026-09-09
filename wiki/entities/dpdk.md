---
type: entity
title: DPDK
aliases: [DPDK, Data Plane Development Kit]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [网络, 用户态, 高性能, 开源, 数据包处理]
---

# DPDK

## 基本信息

- **全称**：Data Plane Development Kit（数据面开发套件）
- **类型**：开源的用户态网络数据包处理库和驱动集合
- **发起方**：Intel（后发展为 Linux 基金会下的社区项目）
- **定位**：通过将网络接口卡（NIC）直接映射到用户态，绕过内核网络协议栈，实现线速数据包处理

## 核心技术

### 用户态轮询模式驱动（PMD）

DPDK 通过 UIO/VFIO 将网卡的寄存器和 DMA 队列直接映射到用户态，用轮询（polling）替代中断来收包。这避免了中断上下文切换和内核协议栈的开销，使单个 CPU 核可以处理每秒数千万个数据包。

### 关键优化

- **大页内存（HugePage）**：减少 TLB miss 提高内存访问效率
- **无锁环形缓冲区（rte_ring）**：多生产者多消费者的无锁队列
- **CPU 亲和性**：将收包线程绑定到专用核，避免调度抖动
- **零拷贝**：数据包在用户态缓冲区中直接处理，无需内核-用户态拷贝

## 与 SPDK 的关系

DPDK 是网络领域的用户态数据面，[[spdk|SPDK]] 是存储领域的用户态数据面。两者共享相同的设计哲学：

| 维度 | DPDK | SPDK |
|---|---|---|
| 目标设备 | 网络接口卡（NIC） | NVMe SSD |
| 绕过对象 | 内核网络协议栈 | 内核块层/存储栈 |
| 通信机制 | UIO/VFIO 映射 | UIO/VFIO 映射 |
| 收包/收 IO 方式 | 轮询 | 轮询 |
| 典型应用 | 路由器、负载均衡、vSwitch | 分布式存储、数据库存储引擎 |

文章将 SPDK 称为"存储领域的 DPDK"，两者都代表了"数据面用户态化"的趋势。

## 在知识库中的关联

- 同类技术：[[spdk|SPDK]]（存储领域的用户态数据面）
- 相关资料：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）

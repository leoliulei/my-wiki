---
type: entity
title: SPDK
aliases: [SPDK, Storage Performance Development Kit]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [存储, 用户态, 高性能, NVMe, 开源]
---

# SPDK

## 基本信息

- **全称**：Storage Performance Development Kit（存储性能开发套件）
- **类型**：开源的用户态存储栈工具集
- **发起方**：Intel（后发展为社区项目）
- **定位**：通过将存储设备直接映射到用户态，绕过内核存储协议栈，实现极致 IO 性能

## 核心技术

### 用户态驱动

SPDK 通过 UIO（Userspace I/O）或 VFIO（Virtual Function I/O）将 [[nvme|NVMe]] 设备直接映射到用户态地址空间。用户态驱动程序直接操作硬件寄存器（提交队列、完成队列、门铃寄存器），完全不经过内核的块层、IO 调度器和文件系统。

这意味着：
- 零 syscall 开销（连 [[io-uring|io_uring]] 的共享内存通知都不需要）
- 零内核协议栈开销
- 零上下文切换

### 与 DPDK 的关系

SPDK 与网络领域的 [[dpdk|DPDK]]（Data Plane Development Kit）异曲同工：两者都遵循"把数据面从内核移到用户态"的设计哲学，用轮询（polling）替代中断，用无锁队列替代锁，用大页内存减少 TLB miss。

## 代价

绕过内核意味着应用必须自己处理原本由内核代劳的一切：

- **安全隔离**：用户态直接访问硬件，一个错误的指针可能破坏整个系统
- **资源共享**：多个应用共享一块 NVMe 设备需要自己协调
- **错误恢复**：硬件错误、超时、热插拔都需要自己处理
- **文件系统**：SPDK 通常直接操作裸设备，需要自己实现或集成文件系统

因此 SPDK 主要用于对延迟和吞吐有极致要求的场景（如分布式存储系统的数据节点、数据库存储引擎），并非通用应用的默认选择。

## 在 Linux IO 演化中的位置

如果 Linux IO 的演化逻辑是"不断将控制权从内核移交给应用"，那么 SPDK 是这条线的逻辑终点：

```
read/write（内核全管）→ pread（偏移量交权）→ O_DIRECT（缓存交权）→ io_uring（执行模型交权）→ SPDK（内核退出数据路径）
```

## 在知识库中的关联

- 同类技术：[[dpdk|DPDK]]（网络领域的用户态数据面）
- 目标硬件：[[nvme|NVMe]]
- 前一步：[[io-uring|io_uring]]（仍在内核内，只是降低了 syscall 开销）
- 相关资料：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）

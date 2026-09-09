---
type: entity
title: NVMe
aliases: [NVMe, NVM Express, Non-Volatile Memory Express]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [存储, SSD, 硬件接口, 高性能, IO]
---

# NVMe

## 基本信息

- **全称**：NVM Express（Non-Volatile Memory Express）
- **类型**：面向非易失性存储（主要是 SSD）的高速主机控制器接口和存储协议
- **定位**：替代 AHCI（SATA 时代的主机控制器接口），为 PCIe 直连的 SSD 设计，充分发挥闪存的并行性和低延迟特性

## 关键性能特征

- **随机读延迟**：约 10-20 微秒（机械硬盘为毫秒级，差约 100-1000 倍）
- **IOPS**：每秒 IO 次数可达数十万甚至上百万
- **接口**：通过 PCIe 总线直连 CPU，无需经过 SATA/SAS 控制器的协议转换开销

## 对 Linux IO 栈的影响

NVMe 的出现改变了 IO 性能瓶颈的位置：

- **机械硬盘时代**：瓶颈在磁盘本身（寻道时间数毫秒），syscall 开销（~1μs）可以忽略
- **NVMe 时代**：磁盘延迟降至 10-20μs，一次 syscall 的开销（用户态-内核态切换、参数校验、调度，约 1μs）占比显著上升。当单线程追求每秒百万次 IO 时，仅 syscall 开销就占满 1 秒

这一变化直接催生了 [[io-uring|io_uring]] 的设计动机——用共享内存替代 syscall 作为通信通道，将批量 IO 的 syscall 次数从 N 次降为 0-1 次。

NVMe 也是 [[spdk|SPDK]]（用户态存储栈）能够成立的硬件前提：通过 UIO/VFIO 将 NVMe 设备直接映射到用户态，用户态驱动可以直接操作硬件寄存器，完全消除内核协议栈开销。

## 在知识库中的关联

- 驱动 [[io-uring|io_uring]] 诞生的硬件背景
- [[spdk|SPDK]] 用户态存储栈的目标设备
- 相关资料：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）

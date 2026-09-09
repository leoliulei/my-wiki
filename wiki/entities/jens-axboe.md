---
type: entity
title: Jens Axboe
aliases: [Jens Axboe, axboe]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [人物, Linux, 内核, IO, 开发者]
---

# Jens Axboe

## 基本信息

- **身份**：Linux 内核核心开发者
- **知名贡献**：[[io-uring|io_uring]] 异步 IO 框架的作者
- **领域**：Linux 块层（block layer）、IO 调度、存储栈

## 主要贡献

### io_uring（2019，Linux 5.1）

Jens Axboe 设计并实现了 io_uring，这是 Linux IO 子系统近十年来最重大的架构变革。其核心创新是用共享内存的双环形缓冲区（SQ/CQ）替代系统调用作为用户态-内核态通信通道，在 SQPOLL 模式下可实现零 syscall 提交 IO，从根本上解决了 NVMe 时代 syscall 开销成为吞吐瓶颈的问题。

在 io_uring 之前，Jens Axboe 也是 Linux 块层和 IO 调度器的主要维护者之一，对 Linux 存储栈有长期深入的贡献。

## 在知识库中的关联

- 作品：[[io-uring|io_uring]]
- 相关资料：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）

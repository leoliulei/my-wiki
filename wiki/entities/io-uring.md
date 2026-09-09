---
type: entity
title: io_uring
aliases: [io_uring, linux io_uring]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [Linux, IO, 异步IO, 内核, 系统调用, 高性能]
---

# io_uring

## 基本信息

- **类型**：Linux 内核异步 IO 框架（接口 + 内核实现）
- **首次引入**：Linux 5.1，2019 年 5 月
- **作者**：[[jens-axboe|Jens Axboe]]
- **定位**：用共享内存环形缓冲区替代系统调用作为用户态与内核态的通信通道，从根本上重新设计 IO 的执行模型

## 核心设计

io_uring 在用户态和内核态之间建立两个环形缓冲区（ring buffer）：

- **SQ（Submission Queue，提交队列）**：用户态写入，内核态读取
- **CQ（Completion Queue，完成队列）**：内核态写入，用户态读取

提交 IO 请求的流程：在 SQ 中写入请求描述符 →（可选）通过一次 syscall 通知内核 → 内核处理后将结果写入 CQ → 用户态从 CQ 收割结果。

### SQPOLL 模式

内核启动一个专门的轮询线程持续检查 SQ，用户态完全不需要任何 syscall 就能完成 IO 提交。批量提交 100 个 IO 请求可能只需要 0-1 次 syscall，而传统模式需要 100 次。

### 减少开销的机制

- **Fixed Buffers（注册缓冲区）**：预先注册一组用户缓冲区，后续 IO 直接引用注册编号，避免每次 syscall 重复进行页表映射。
- **Fixed Files（注册文件描述符）**：预先注册一组 fd，后续 IO 直接用编号引用，避免每次 IO 的 fd 查找开销。

## 相比前代方案的优势

| 维度 | 同步 IO | Linux AIO (libaio) | epoll + 线程池 | io_uring |
|---|---|---|---|---|
| 异步性 | 阻塞 | 部分异步（仍可能阻塞） | 伪异步（阻塞藏在 worker 线程） | 真正异步 |
| Buffered IO 支持 | 是 | 否（退化为同步） | 是 | 是 |
| 支持 fsync 等操作 | 是（但同步） | 否 | 是（但同步） | 是 |
| syscall 开销 | 每次 IO 1 次 | 每次提交 1 次 | 每次 IO 1 次 | 批量 0-1 次 |
| 标准性 | POSIX | 非标准 | Linux 特有 | Linux 主线内核 |

## 安全争议

io_uring 显著扩大了内核攻击面：共享内存环形缓冲区、内核轮询线程、固定缓冲区映射等机制引入了大量复杂的状态管理代码，带来潜在安全漏洞。Google 的 ChromeOS 和 Android 一度禁用 io_uring。安全性与性能之间的张力是每次控制权转移都要面对的问题。

## 在知识库中的关联

- 首次出现：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）
- 作者：[[jens-axboe|Jens Axboe]]
- 驱动背景：[[nvme|NVMe]] 时代 syscall 成为瓶颈
- 逻辑延伸：[[spdk|SPDK]] 走得更远——连内核都绕过
- 前代方案：[[linux-aio|Linux AIO (libaio)]] 的不成功尝试

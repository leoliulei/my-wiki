---
type: entity
title: Linux AIO (libaio)
aliases: [Linux AIO, libaio, io_submit, io_getevents]
sources:
  - raw/2026-09-10-linux-file-io-evolution.md
created: 2026-09-10
updated: 2026-09-10
tags: [Linux, IO, 异步IO, 内核, 系统调用]
---

# Linux AIO (libaio)

## 基本信息

- **类型**：Linux 原生异步 IO 接口（通过 libaio 库暴露）
- **核心系统调用**：`io_submit`（提交 IO 请求）、`io_getevents`（收割完成事件）
- **设计思路**：将 IO 的提交和完成分离，应用提交请求后不阻塞，稍后再来收割结果
- **定位**：Linux 在 [[io-uring|io_uring]] 之前对异步文件 IO 的一次尝试

## 设计思路

Linux AIO 的设计方向是正确的：提交与完成分离，应用可以在等待 IO 的同时做其他工作。这与后来 io_uring 的核心思路一致。

## 严重局限性

尽管方向正确，Linux AIO 的实现存在多个致命缺陷，导致它从未被广泛采用：

1. **只支持 O_DIRECT**：如果使用 Buffered IO，`io_submit` 会退化为同步行为，失去异步的意义。这意味着只有已经使用 Direct IO 的数据库引擎才能受益。
2. **io_submit 仍可能阻塞**：在某些情况下（如元数据操作需要获取锁时），io_submit 可能阻塞在内核中，破坏了"异步"的承诺。
3. **只支持读写操作**：fsync、fstat、openat 等操作都不支持异步。对于需要在 IO 流水线中穿插 fsync 的数据库来说，异步路径中仍然存在同步的"路障"。
4. **非标准接口**：这套接口不属于 POSIX，也不属于 glibc。而 POSIX 标准定义的 aio_read/aio_write（glibc 实现）更是用用户态线程池模拟异步，性能甚至不如直接用同步 IO + 自己的线程池。

## 结果

Linux AIO 沦为一个小众接口，只有少数数据库（如 MySQL InnoDB 的特定配置）在使用。大部分需要高性能 IO 的应用选择了 epoll + 线程池的妥协方案，直到 [[io-uring|io_uring]] 的出现才真正解决了异步文件 IO 的问题。

## 与 io_uring 的对比

| 维度 | Linux AIO | io_uring |
|---|---|---|
| 通信方式 | io_submit/io_getevents 系统调用 | 共享内存 SQ/CQ 环形缓冲区 |
| Buffered IO | 不支持（退化为同步） | 支持 |
| 提交是否阻塞 | 可能阻塞 | 不阻塞 |
| 支持的操作 | 仅 read/write | 几乎所有文件操作（含 fsync、openat、statx） |
| 标准性 | 非 POSIX、非 glibc | Linux 主线内核 |
| 批量效率 | 每次提交一次 syscall | 批量 0-1 次 syscall |

## 在知识库中的关联

- 被替代者：[[io-uring|io_uring]] 从根本上解决了 Linux AIO 的所有局限
- 相关资料：[[linux-file-io-evolution|Linux 文件 IO 演进史摘要]]（`raw/2026-09-10-linux-file-io-evolution.md`）
- 工业界妥协方案：epoll + 线程池（Nginx、Node.js/libuv 采用）

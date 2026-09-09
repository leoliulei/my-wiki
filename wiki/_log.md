---
type: log
title: 操作日志
created: 2026-08-26
---

# 操作日志

> 按时间倒序记录知识库的所有变更操作。

## 2026-09-10

### 收录：Linux 文件 IO 演进史 — 从 read/write 到 io_uring 的四次范式跃迁（第六篇原始资料）

- **原始资料**：`raw/2026-09-10-linux-file-io-evolution.md`
- **来源类型**：微信公众号技术长文；作者 z.ai.dev，发布于 2026-07-26
- **来源链接**：https://mp.weixin.qq.com/s/F4DSsGd6VGgW6xybDbrFog
- **范围**：Linux 文件 IO 三十年演进，四次范式跃迁（pread/pwrite、向量化 IO、O_DIRECT、io_uring），及 SPDK/DPDK 用户态栈延伸

**新建页面（8 个）**：
1. `raw/2026-09-10-linux-file-io-evolution.md` — 原始全文整理，含四次跃迁的技术细节与权衡
2. `wiki/summaries/linux-file-io-evolution.md` — 摘要页：核心观点、四次跃迁对比表、关键数据、关联实体
3. `wiki/entities/io-uring.md` — io_uring 实体页：设计、SQPOLL、Fixed Buffers/Files、安全争议
4. `wiki/entities/jens-axboe.md` — Jens Axboe 实体页：io_uring 作者、Linux 块层维护者
5. `wiki/entities/nvme.md` — NVMe 实体页：性能特征及对 IO 栈的影响
6. `wiki/entities/spdk.md` — SPDK 实体页：用户态存储栈、UIO/VFIO、与 DPDK 关系
7. `wiki/entities/dpdk.md` — DPDK 实体页：用户态网络数据面、与 SPDK 对比
8. `wiki/entities/linux-aio.md` — Linux AIO (libaio) 实体页：设计思路、四大局限、与 io_uring 对比
9. `wiki/assets/linux-io-evolution-timeline.svg` — 四次范式跃迁时间线与统一脉络图

**更新页面（3 个）**：
- `wiki/_index.md` — 更新统计（原始资料 6、摘要 5、实体 23）、最近更新、分类入口与标签云
- `wiki/_log.md` — 记录本次收录
- `inbox/_inbox.md` — 将该 HTML 文件状态从 `inbox` 标记为 `archived`

**核心判断**：
- Linux IO 三十年演进的统一逻辑是"控制权转移"：内核将偏移量管理、数据布局与调度、缓存管理、执行模型四项决策权逐步移交给应用层。
- 每次交权遵循相同模式：某类应用（数据库、网络服务器、分布式存储）规模增长后，内核通用默认行为成为性能陷阱，内核因此开放新控制接口。
- io_uring 用共享内存 SQ/CQ 环形缓冲区替代 syscall，SQPOLL 模式下批量提交 100 个 IO 仅需 0-1 次 syscall，从根本上解决了 NVMe 时代 syscall 开销瓶颈。
- SPDK 是演化逻辑的终点——通过 UIO/VFIO 绕过内核直接操作 NVMe 硬件，但代价是应用需自行处理安全隔离、资源共享和错误恢复。
- io_uring 的安全争议（扩大内核攻击面，ChromeOS/Android 一度禁用）表明安全与性能的张力是每次交权的永恒问题。

**知识图谱关联**：
- [[io_uring]] ↔ [[Jens Axboe]] ↔ [[NVMe]]
- [[io_uring]] ↔ [[Linux AIO]]（前代不成功尝试）
- [[SPDK]] ↔ [[DPDK]]（存储/网络领域的用户态数据面双子）
- [[Linux 文件 IO 演进史]] ↔ 四次跃迁统一脉络

---

## 2026-09-09

### 收录：广场协议及其对日本经济的影响（第五篇原始资料）

- **原始资料**：`raw/2026-09-09-plaza-accord-research.md`
- **来源类型**：公开资料研究综合；主要来源为纽约联储、波士顿联储、日本银行金融研究所、日本财务省、IMF 与相关研究机构
- **范围**：1980—1985 年强美元背景、1985 年五国协调、日元升值、日本国内货币政策、资产泡沫及长期调整

**新建页面（5 个）**：
1. `raw/2026-09-09-plaza-accord-research.md` — 公开资料事实记录、来源清单与证据边界
2. `wiki/concepts/plaza-accord.md` — 广场协议概念页：背景、协议内容、汇率结果、对日本影响和常见误解
3. `wiki/entities/bank-of-japan.md` — 日本银行及广场协议后货币政策角色
4. `wiki/entities/g5.md` — 五国集团及国际政策协调角色
5. `wiki/synthesis/plaza-accord-lessons-for-rmb.md` — 观点归档：从广场协议看人民币升值的真正风险
6. `wiki/assets/plaza-accord-japan-causal-chain.svg` — 广场协议至日本长期调整的完整因果链

**更新页面（4 个）**：
- `wiki/concepts/rmb-gradual-appreciation.md` — 增加日本历史参照和风险边界
- `wiki/overviews/china-macro.md` — 增加历史比较资料与中日差异说明
- `wiki/_index.md` — 更新统计、分类入口与标签
- `wiki/_log.md` — 记录本次收录

**核心判断**：
- 广场协议是 1985 年美国、日本、西德、法国、英国共同协调压低美元的国际安排，不是日本单独签署的固定汇率“投降协议”。
- 日元由约 240 升至约 120 日元/美元，实际升值幅度远超最初讨论的 10%—12%。
- 协议是日本政策转向的重要外部冲击，但长期低迷还需要国内长期宽松、金融自由化、土地抵押信贷、监管不足、泡沫破裂和坏账处置迟缓共同解释。
- 对人民币讨论的关键启示不是“货币不能升值”，而是避免升值速度失控，以及避免用长期低利率和房地产信贷替代出口增长。

**知识图谱关联**：
- [[广场协议]] ↔ [[日本银行]] ↔ [[五国集团]]
- [[广场协议]] ↔ [[人民币渐进升值框架]] ↔ [[从广场协议看人民币升值的真正风险]] ↔ [[中国宏观]]

---

## 2026-09-08

### 收录：Asia in Focus — Why Beijing may favor gradual RMB appreciation（第四篇资料）

- **原始资料**：`raw/2026-09-08-asia-in-focus-rmb-appreciation.md`
- **原始附件**：`raw/assets/2026-09-08-asia-in-focus-rmb-appreciation.pdf`
- **来源**：Goldman Sachs Global Investment Research，Andrew Tilton & Hui Shan（中国宏观团队），2026-09-02 15:55 HKT
- **完整性**：PDF 共 10 页；摘要页 1 页、正文 5 页（含 8 张图表）、团队页 1 页、披露与版权 3 页；已保存 SHA-256 校验值

**新建页面（10 个）**：
1. `raw/2026-09-08-asia-in-focus-rmb-appreciation.md` — 原始资料元信息、事实记录与附件引用
2. `wiki/summaries/asia-in-focus-rmb-appreciation.md` — 报告分析摘要
3. `wiki/entities/andrew-tilton.md` — 第一作者
4. `wiki/entities/pboc.md` — 中国人民银行（汇率管理主体）
5. `wiki/entities/scott-bessent.md` — 美国财政部长（外部压力方）
6. `wiki/concepts/rmb-gradual-appreciation.md` — 概念页：人民币渐进升值框架（首次建立概念页）
7. `wiki/overviews/china-macro.md` — 综述页：中国宏观（首次建立综述页）
8. `wiki/assets/asia-in-focus-rmb-catchup-matrix.svg` — Exhibit 4 追赶敏感度矩阵热力图
9. `wiki/assets/rmb-gradual-appreciation-goals.svg` — 三目标权衡机制图
10. `wiki/assets/china-macro-topic-map.svg` — 中国宏观主题地图

**更新页面（4 个）**：`wiki/entities/goldman-sachs.md`、`wiki/entities/hui-shan.md`、`wiki/_index.md`、`wiki/_log.md`

**核心判断**：
- 中国货物贸易顺差约达 GDP 的 6%、全球 GDP 的 1%+，美国关税、欧盟选择性措施构成外部压力；IMF 主张结构调整优先，高盛认为汇率调整"必要但不充分"。
- 北京三大目标（制造业份额与自主可控、人民币国际化、名义 GDP 追赶美国）可通过人民币对美元每年渐进升值 3%—5% 同时服务；快速升值会侵蚀目标①。
- 使能条件：美元 broad TWI 预计年贬值约 1%，中国通胀至少低于贸易伙伴 1pp——人民币对美元升值 2—3%/年可维持 real TWI 不变；低估约 20% 提供缓冲。
- 预测：USDCNY 2028 年底约 6.0、2031 年底约 5.50；近期中间价逆周期因子显示北京倾向放慢升值节奏。

**主题里程碑**：中国宏观主题达到 2 篇资料，首次建立概念页（[[人民币渐进升值框架]]）与综述页（[[中国宏观]]）；本报告是《Three things in China》引用的人民币升值判断的完整论证。

**未建立**：对比页（暂无跨资料 A vs B 关系）。

**版权边界**：原 PDF 仅归档于本地 `raw/assets/`，摘要页采用转述分析，不复制或对外发布报告全文。

---

### 规则更新：派生页面优先使用 SVG 可视化

- 更新 `CLAUDE.md`（`AGENTS.md` 为其软链接，同步生效）。
- 摘要、对比、概念、综述和归档等页面在存在时间、流程、架构、趋势或多维对比时，应尽量增加 SVG 时序图、流程图、架构图、折线图或对比图。
- SVG 统一存放于 `wiki/assets/`，通过标准 Markdown 图片语法引用，不依赖 HTML renderer、JavaScript 或外部 CDN。
- 新增事实口径、移动端可读性、XML/路径/渲染检查与“有增益才画图”的约束。

### 修复并重构：China: Three things in China 报告分析

- 修复 `wiki/summaries/china-three-things-in-china.md` 顶部元信息：恢复标准 `---` YAML frontmatter、`sources` 列表、标签数组与未转义 wiki-link。
- 按“核心判断—数据对比—分析路径—深层分析—证据边界—验证指标”重构正文，与其他摘要页保持一致。
- 新增 `wiki/assets/china-three-things-pmi-comparison.svg`，对比制造业、服务业和建筑业 PMI 的前值、8 月值及 50 荣枯线。
- 保留并复核 `wiki/assets/china-three-things-macro-path.svg`，继续用于区分已公布 PMI、机构预测与长期政策推演。

### 重构：Fireworks AI 深度调研摘要

- 重写 `wiki/summaries/fireworks-ai-research.md`，按“核心判断—增长证据—平台机制—竞争风险—验证指标”组织内容。
- 新增 `wiki/assets/fireworks-ai-growth.svg`：展示 2025-12 至 2026-07 的 ARR 与日处理 Token 离散快照，并保留“约”“+”等原始口径。
- 新增 `wiki/assets/fireworks-ai-platform-value-chain.svg`：展示企业需求、模型适配、推理优化、资源形态、生产交付及四类结构性风险。
- 明确区分平台披露、第三方估算和分析推断，避免将调研汇编数字表述为审计事实。

### 收录：China: Three things in China（第三篇资料）

- **原始资料**：`raw/2026-09-06-china-three-things-in-china.md`
- **原始附件**：`raw/assets/2026-09-06-china-three-things-in-china.pdf`
- **来源**：Goldman Sachs Global Investment Research，Hui Shan，2026-09-06
- **完整性**：PDF 共 5 页；正文 1 页、近期研究目录 1 页、披露与版权说明 3 页；已保存 SHA-256 校验值

**新建页面（5 个）**：
1. `raw/2026-09-06-china-three-things-in-china.md` — 原始资料元信息、事实记录与附件引用
2. `wiki/summaries/china-three-things-in-china.md` — 报告分析、证据分级、可视化与后续验证清单
3. `wiki/entities/goldman-sachs.md` — 研究发布机构
4. `wiki/entities/hui-shan.md` — 报告作者
5. `wiki/entities/national-bureau-of-statistics.md` — PMI 数据来源机构
6. 更新 `wiki/_index.md` 索引与统计

**核心判断**：
- 8 月制造业 PMI 从 49.2 回升至 49.8，但仍低于荣枯线；更准确的表述是“收缩放缓”，不是“已进入扩张”。
- 服务业维持 49.3、建筑业降至 46.9，显示复苏缺乏跨行业广度，整体呈现“生产端企稳、内需端偏弱”。
- 贸易、CPI、PPI 数字均为报告发布时的高盛预测，知识库已与已公布 PMI 分开标注，待官方数据发布后复核。
- 人民币每年升值 3%—5% 属于长期多目标政策推演，不是短期汇率预测或政策承诺。

**未建立**：概念页、对比页、综述页；“中国宏观”主题目前仅 1 篇资料，未达到 2+ 篇门槛。

**版权边界**：原 PDF 仅归档于本地 `raw/assets/`，摘要页采用转述分析，不复制或对外发布报告全文。

**后续修订**：将摘要页中无法被 Markdown 阅读器渲染的 HTML renderer 替换为独立 SVG 文件 `wiki/assets/china-three-things-macro-path.svg`，并通过标准 Markdown 图片语法引用。

---

## 2026-09-01

### 收录：Fireworks AI 深度调研（第二篇资料）

- **原始资料**：`raw/2026-09-01-fireworks-ai-research.md`
- **来源**：综合公开信息调研（官方公告 + Sacra/Contrary 等第三方研究 + 媒体报道），完整 HTML 报告存至 `raw/assets/2026-09-01-fireworks-ai-research.html`
- **对象**：https://fireworks.ai/ —— 开源模型推理平台

**新建页面（6 个）**：
1. `wiki/summaries/fireworks-ai-research.md` — Fireworks AI 深度调研摘要
2. `wiki/entities/fireworks-ai.md` — Fireworks AI 主实体页（业务、融资、财务、竞争、前景、风险）
3. `wiki/entities/lin-qiao.md` — Lin Qiao（乔琳，创始人/CEO）
4. `wiki/entities/together-ai.md` — Together AI（直接竞争对手）
5. `wiki/entities/baseten.md` — Baseten（竞争对手）
6. `wiki/entities/cursor.md` — Cursor（头号客户，曾占 Fireworks 约一半收入）
7. 更新 `wiki/_index.md` 索引

**未建立**：概念页（TAM·SAM·SOM 被讨论但仅 1 篇资料，按规则需 2+ 篇后升格）、对比页、综述页。

**值得注意**：
- 与 Mooncake/KVCache 同属"推理基础设施"主题但视角不同：Mooncake 讲推理系统架构（以存换算），Fireworks 讲推理商业模式（推理层价值卡位），可互为背景。
- 核心风险点：客户集中（Cursor，且 SpaceX 拟 600 亿美元收购）、GPU 依赖英伟达（其收购 Lepton 做竞品云）、推理商品化 + 云厂商捆绑。后续若出现新资料，可考虑建立"推理经济 / 开源模型中立"概念页与"Fireworks vs Together AI"对比页。

---

## 2026-08-29

### 归档：为什么专用场景方案比通用场景方案性能好

- **类型**：synthesis（个人观点归档）
- **页面**：`wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md`
- **来源**：用户提问，无外部资料
- **内容**：主旨句（通用方案为「未知」交税）+ 存储（列存/压缩）+ 计算 CPU（SIMD/ASIC）+ 计算 GPU（Tensor Core/脉动阵列）+ 网络（RDMA/DPU）+ 代价边界（通用打底 + 专用加速）。

**值得注意**：
- 该观点与 Mooncake 的「以存换算」思路同源（都是针对特定推理负载做架构特化），后续若资料增多可考虑升格为 concepts 概念页。

---

## 2026-08-26

### 补充：下载 Mooncake 论文 PDF

- 下载论文 PDF 到 `raw/assets/2407.00079-mooncake.pdf`（666KB）
- 更新 `raw/2026-08-26-mooncake-paper.md` 的 frontmatter（添加 attachments 字段）和相关资源部分（添加本地 PDF 链接）

### 收录：Mooncake 论文（第一篇资料）

- **原始资料**：`raw/2026-08-26-mooncake-paper.md`
- **来源**：arXiv:2407.00079，"Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving"
- **作者**：Ruoyu Qin, Zheming Li, Weiran He, Mingxing Zhang, Yongwei Wu, Weimin Zheng, Xinran Xu（Moonshot AI + 清华大学）
- **发表**：USENIX FAST 2025，最佳论文奖

**新建页面（6 个）**：
1. `wiki/summaries/mooncake-kvcache-centric-architecture.md` — 论文摘要
2. `wiki/entities/moonshot-ai.md` — Moonshot AI 实体页
3. `wiki/entities/kimi.md` — Kimi 实体页
4. `wiki/entities/tsinghua-madsys-lab.md` — 清华大学 MADSys 实验室实体页
5. `wiki/entities/usenix-fast-2025.md` — USENIX FAST 2025 会议实体页
6. 更新 `wiki/_index.md` 索引

**未建立**：概念页（按规则需 2 篇以上资料提及同一概念才建立）、对比页、综述页。

**值得注意**：
- Mooncake 的"以存换算"思路与传统 RAG 的"以算换存"形成有趣对比，后续可关注是否建立对比页。
- PD 分离（Prefill-Decoding Disaggregation）正成为业界主流，后续资料可能触发概念页建立。

---

### 初始化知识库

- 创建目录结构、CLAUDE.md 规则文件、初始索引和日志。基于 Karpathy LLM Wiki 方法论。

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

- 2026-09-05 Web 查看端：编辑 wiki/synthesis/zhuan-yong-vs-tong-yong-fang-an.md

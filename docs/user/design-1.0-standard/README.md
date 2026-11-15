# Affiliate用户端Mock 1.0重设计标准

版本：v0.2  
日期：2026-11-14  
状态：`draft_for_mock_redesign`  
适用范围：`affiliate-mock` 用户端静态 Mock

> **English Summary**
>
> This folder defines the Affiliate-specific execution standard for redesigning the current user-side Mock with the external 1.0 visual language. It adopts only transferable layout, tokens, components, states, and interaction patterns. It preserves Affiliate routes, business vocabulary, data boundaries, and Mock behavior.
>
> **中文摘要**
>
> 本文件夹定义 Affiliate 用户端 Mock 采用外部 1.0 视觉语言的重设计执行标准。只采纳可迁移的布局、Token、组件、状态和交互模式，保留 Affiliate 的路由、业务词汇、数据边界和 Mock 行为。

## 目录结构

| 文件 | 职责 |
| --- | --- |
| [00-unified-scope.md](00-unified-scope.md) | 统一口径、采纳边界和禁止迁移项。 |
| [01-layout-tokens-components.md](01-layout-tokens-components.md) | Affiliate Mock 的 Shell、Token 和组件执行规则。 |
| [02-page-waves-verification.md](02-page-waves-verification.md) | 当前路由分批、页面模板和验收门禁。 |
| [03-token-migration-map.md](03-token-migration-map.md) | 旧新 Token 映射、迁移阶段和测试耦合规则。 |
| [04-shell-and-component-migration.md](04-shell-and-component-migration.md) | Shell、组件、响应式和无障碍施工规格。 |
| [05-wave0-baseline-and-page-contracts.md](05-wave0-baseline-and-page-contracts.md) | Wave 0 基线、核心页面契约和验证矩阵。 |
| [../design-1.0-reference/](../design-1.0-reference/README.md) | 外部参考档案，只读，不直接作为执行标准。 |

## 统一口径

```text
外部1.0系统
  → 只提炼组件、样式、交互、状态和无障碍模式
  → design-1.0-reference/
  → 映射到 Affiliate 当前路由和页面模板
  → design-1.0-standard/
  → 分批实施 affiliate-mock 用户端
```

## 执行原则

1. 当前系统仍是 Affiliate CPA 用户端，页面、导航和数据语义不替换。
2. 外部 1.0 是设计语言参考，不是产品需求、页面清单或业务契约。
3. 先统一 Shell、Token 和基础组件，再处理页面级布局。
4. 每波改动必须有范围、截图和自动化验证，避免“看起来都改了但每页都不稳”。
5. 视觉重设计不得改变业务规则、资金语义、权限、接口或 Mock 状态机。

## 冻结决策

| 决策 | 结果 | 原因 |
| --- | --- | --- |
| 是否引入外部系统路由 | 否 | 功能域不同。 |
| 是否复用外部页面清单 | 否 | 只作为 Figma 证据索引。 |
| 是否采纳外部数据/事件契约 | 否 | 属于另一系统业务语义。 |
| 是否参考组件与状态模式 | 是 | 符合用户指定口径。 |
| 是否直接搬 Figma 1920 尺寸 | 否 | 必须按 Affiliate 响应式断点转换。 |
| 是否使用外部业务文案 | 否 | 文案必须回到 Affiliate 当前页面语义。 |

## 变更流程

1. 从参考档案确认模式和证据。
2. 在标准目录确认 Affiliate 页面模板和验收规则。
3. 建立或更新全局 Token 与组件。
4. 按页面波次实施。
5. 运行专项检查、全局回归和截图验收。
6. 记录完成页面、残留问题和冻结原因。

## 权威边界

本目录是用户端 Mock 的设计与实现工作标准，不是产品业务 PRD。涉及业务语义、数据口径、事件契约或生产行为时，仍以 `docs/PRD_EN/` 的权威流程为准；本目录不得扩大业务范围。

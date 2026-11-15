# 旧管理页面归档

> **English Summary**
>
> This directory README is a local index. Read the root README first. This file does not override the authoritative English PRD slices or hard rules.
>
> **中文摘要**
>
> 本 README 是目录级索引。请先阅读根 README；本文件不覆盖权威英文 PRD 切片或硬规则。


归档日期：2026-11-11

这里保留曾经作为独立入口的管理端页面，供版本对照和历史追溯。它们不属于当前发布入口，也不应继续被业务链接引用。

## 当前替代入口

- 用户端：`/index.html`
- 统一管理端：`/admin/index.html`（开发别名：`/admin-dev.html`）
- 统一管理端经营分析：`/admin-dev.html#/admin-performance/roi`
- 统一管理端客户 360 任务上下文：`/admin-dev.html#/customer-360/<customer_id>?task_id=<task_id>`（示例：`DEMO-C01` / `DEMO-T01`）

## 目录

- `rebuild/`：旧管理端重建版。客服入口仍保留兼容跳转，最终进入统一管理端。
- `customer-360/`：旧客户 360 独立页面。客户 360 现在以统一管理端的任务上下文页面呈现。

归档页面依赖根目录的共享样式和表格脚本；页面仅用于回看历史实现，不作为线上产品入口。

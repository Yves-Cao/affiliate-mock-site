# Token迁移映射

版本：v0.1  
日期：2026-11-14  
状态：`wave1_migration_plan`

> **English Summary**
>
> This file defines the staged migration from the current Mock token baseline to the Affiliate 1.0 visual tokens. It keeps compatibility aliases while new semantic tokens are introduced, and requires design-token tests to change in the same implementation slice.
>
> **中文摘要**
>
> 本文定义当前 Mock Token 到 Affiliate 1.0 视觉 Token 的分阶段迁移。新增语义 Token 时保留兼容别名，并要求设计 Token 检查与同一实施切片同步更新。

## 1. 迁移原则

1. 先新增语义 Token，再逐步替换页面引用。
2. 旧 Token 在 Wave 1 只作为兼容别名，不得继续作为新样式的设计依据。
3. `design-tokens.css`、页面 CSS 和 `scripts/design-token-check.cjs` 必须同一波更新。
4. 品牌色、渐变和标题字重先在核心页试算，截图通过后冻结。
5. 不用查找替换一次性改全站；每次替换必须能说明 affected components 和验证方式。

## 2. 背景与边框

| 当前 Token | 当前值 | 1.0 目标 Token | 目标值 | 迁移策略 |
| --- | --- | --- | --- | --- |
| `--canvas` | `#F8F9FA` | `--canvas` | `#F4F6FA` | Wave 1 直接替换，并截图对比仪表盘。 |
| `--surface` | `#FFFFFF` | `--surface` | `#FFFFFF` | 保持。 |
| `--surface-soft` | `#ECF0F4` | `--surface-soft` | `#F9FAFB` | Wave 1 替换。 |
| `--surface-accent` | `#F8FBFF` | `--surface-muted` | `#F3F4F6` | 新增目标 Token；旧 Token 映射到表头专用值。 |
| 无 | 无 | `--surface-page` | `#F4F6FA` | 可选别名，仅当页面画布与卡片背景需要区分时新增。 |
| `--border` | `#E8EEF7` | `--border-subtle` | `#E3E8EF` | 新增后替换卡片、表格和分隔线。 |
| `--control-border` | `#C8D1DA` | `--border-strong` | `#CDD5DF` | 新增后替换输入、选择器和强边界。 |
| 无 | 无 | `--border-intensive` | `#9AA4B2` | 预留，不进入 Wave 1。 |

## 3. 文字

| 当前 Token | 当前值 | 1.0 目标 Token | 目标值 | 迁移策略 |
| --- | --- | --- | --- | --- |
| `--text` | `#171717` | `--text-strong` | `#0A0D12` | 新增并逐步用于主数值和强标题。 |
| `--body-text` | `#344054` | `--text-body` | `#414651` | 新增并逐步替换正文。 |
| `--muted` | `#667085` | `--text-muted` | `#717680` | 新增并逐步替换辅助说明。 |
| 无 | 无 | `--text-disabled` | `#A4A7AE` | 新增，用于 disabled 和 placeholder。 |
| `--nav-text` | `#6B7897` | `--text-nav` | `#6B7897` | 值不变，改为新语义名。 |
| `--side-icon` | `#828A9A` | `--text-side-icon` | `#828A9A` | 值不变，改为新语义名。 |
| `--side-text` | `#2C3751` | `--text-side` | `#2C3751` | 值不变，改为新语义名。 |
| `--blue-black` | `#0F1B3D` | `--text-blue-black` | `#0F1B3D` | 保留为用户端强标题兼容别名。 |

## 4. 品牌与状态

| 当前 Token | 当前值 | 1.0 目标 Token | 目标值 | 迁移策略 |
| --- | --- | --- | --- | --- |
| `--brand` | `#005BFF` | `--brand-1-0` | `#1A5BFF` | Wave 1 新增；核心页截图确认后再把 `--brand` 指向新值。 |
| `--brand-deep` | `#00187E` | `--brand-primary-dark` | `#061335` | 候选值，只用于渐变端点或深色品牌块试算。 |
| 无 | 无 | `--brand-soft` | `#1A5BFF1A` | 新增，用于信息底色和选中底色。 |
| `--brand-gradient` | `#0C2176 → #005BFF` | `--gradient-primary` | 待试算 | 候选 `135deg, #061335 0%, #1A5BFF 100%`；未冻结前不得全站替换。 |
| `--gold` | `#B48755` | `--gold` | `#B68756` | Wave 1 替换信用和权益弱强调。 |
| `--gold-gradient` | 旧金色渐变 | `--gradient-gold` | 待试算 | 只用于高等级或权益，不用作装饰。 |
| `--ok` | `#07865D` | `--ok` | `#17B26A` | Wave 1 替换。 |
| `--ok-bg` | `#E6F6EE` | `--ok-bg` | `#17B26A1A` | Wave 1 替换。 |
| `--warning` | `#C76A08` | `--warning` | `#F79009` | Wave 1 替换，并检查中文长标签对比度。 |
| `--warning-bg` | `#FDF3E4` | `--warning-bg` | `#F790091A` | Wave 1 替换。 |
| `--danger` | `#D75851` | `--danger` | `#F04438` | Wave 1 替换。 |
| `--danger-bg` | `#FDEEEE` | `--danger-bg` | `#F044381A` | Wave 1 替换。 |
| `--info` | `#2563EB` | `--info` | `--brand-1-0` | 信息态跟随品牌色，但不得与主按钮混淆。 |
| `--row-hover` | `#EEF7FF` | `--row-hover` | `#F0F5FF` | Wave 1 试算；若对比不足则保留旧值并记录原因。 |

### 品牌色决策门

`#1A5BFF` 来自外部 1.0 的变量集合，`#005BFF` 是当前 Mock 和旧测试锁定的历史值。冻结前必须完成：

1. 在 `dash / summary / clients / wd / assets` 生成旧新品牌色对比截图。
2. 检查主按钮、链接、选中导航、focus、表格行 hover 和状态标签是否层级清晰。
3. 确认文字对比度不低于可读要求。
4. 更新 `design-token-check.cjs` 的期望值。
5. 在本文登记决策结果和日期。

## 5. 字体

| 当前 Token | 当前规格 | 1.0 目标规格 | 迁移策略 |
| --- | --- | --- | --- |
| `--font-text-14-r` | 400 14/20 | 400 14/20 | 保持。 |
| `--font-text-14-m` | 500 14/20 | 500 14/20 | 保持。 |
| `--font-text-16-r` | 400 16/24 | 400 16/24 | 保持。 |
| `--font-text-16-m` | 500 16/24 | 500 16/24 | 保持。 |
| `--font-text-18-b` | 700 18/26 | 600 18/26 | 新增 `--font-text-18-semibold` 试算。 |
| `--font-text-20-b` | 700 20/28 | 600 20/28 | 新增 `--font-text-20-semibold` 试算。 |
| `--font-text-24-b` | 700 24/32 | 600 24/32 | 新增 `--font-text-24-semibold` 试算。 |
| 无 | 无 | 400 12/18 | 新增 caption token。 |

冻结前旧 700 字重 token 保留；页面切换到 600 时必须同页截图确认中文标题重量足够。`letter-spacing` 保持 0，禁止负字距。

## 6. 圆角、间距与阴影

| 类别 | 当前常用值 | 1.0 目标 | 迁移策略 |
| --- | --- | --- | --- |
| 按钮 | 4px | 6px | Wave 1 统一。 |
| 输入 | 4px | 6px | Wave 1 统一。 |
| 卡片 | 8px | 8px | 保持。 |
| 弹窗 | 8px | 12px | Wave 1 统一。 |
| 标签 | 4px | 4px | 保持。 |
| 胶囊 | 999px | 999px | 保持。 |
| 间距 | 页面局部值 | 4/8/12/16/20/24/32 | 只约束新增和重写样式，不做无意义机械替换。 |
| 阴影 | 旧蓝黑低阴影 | 品牌低强度阴影 | 先定义 `--shadow-card` 与 `--shadow-pop`，逐组件替换。 |

## 7. 实施切片

### Slice T1：兼容层

1. 新增 1.0 语义 Token。
2. 旧 Token 保留并指向旧值。
3. `design-token-check.cjs` 同时检查新旧 Token。
4. 不改页面视觉。

### Slice T2：全局组件

1. 按钮、输入、选择器、标签、卡片、表格改用新语义 Token。
2. 标题字体先用新增 600 token。
3. 更新核心页截图。

### Slice T3：品牌冻结

1. 根据截图冻结 `#1A5BFF` 或保留 `#005BFF`。
2. 更新 `--brand` 最终指向。
3. 更新测试和本文决策记录。

### Slice T4：清理

1. 删除未引用兼容 Token。
2. 清理页面内硬编码颜色、边框和阴影。
3. 跑全站设计、表格、UI 和 v1 检查。

## 8. 测试耦合

同一 PR 必须包含：

1. `affiliate-mock/design-tokens.css`
2. 使用新 Token 的页面 CSS
3. `affiliate-mock/scripts/design-token-check.cjs`
4. 核心页面截图或明确的本地验证阻塞记录

禁止只改 CSS 不更新检查，也禁止只改检查不提供视觉证据。

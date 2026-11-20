# 客户服务管理端 Mock 交付记录

版本：v0.1；日期：2026-11-08。状态：管理端本地 Mock 已实现并完成专项复核；生产与跨端联调未完成。  
授权：用户明确要求“执行 并生成mock管理端页面，覆盖之前的版本”。  
产品依据：产品仓库的客户服务产品方案v0.1、页面44、开发契约v0.1、DESIGN-ADMIN及00B；本记录不修改批准的目标范围。

## 1. 页面与运行

- 当前入口：`http://127.0.0.1:4181/admin-dev.html#/tickets`。
- 启动：在本仓库执行 `PORT=4181 npm run serve`；此端口已启动。刷新页面重建本地内存数据。
- 菜单：风控 › 客户服务；四视图、查询、11个默认列及3个可选列、分页和同页720px处理抽屉。
- 抽屉：沟通、关联与协作、处理记录；按能力显示认领、分派、回复、内部备注、补充资料、协作、解决、关闭、重开、申诉指引和关联对象操作。
- 旧 `#/admin-modules/support-ticket` 及其详情别名进入当前页面；归档的重建版 `archive/legacy-management/rebuild/admin-rebuild.html#/tickets` 仍保留历史兼容跳转，最终进入统一 `admin-dev.html`。旧客服展示由新页面取代，不建立第二套客服页面。
- 页面批次：`admin-support-v1`（HTML资源查询标识）。未提交的共享工作区，无独立commit或构建号；全局壳版本不代表本专项版本。
- 数据：`customer-service-v0.1`，FIX-CS01至20对应T-CS001至020；初始 `server_now=2026-11-08T12:00:00.000Z`，显示时区Asia/Shanghai。
- 8小时首响、3天解决、7天重开及5/10MiB、25MiB文件限额均为夹具策略，不是生产默认值。可信测试钩子可以推进模拟时钟。

## 2. 实现文件与数据边界

| 文件 | 责任 |
|---|---|
| `admin-dev.html` | 统一入口及资源批次 |
| `admin-dev.js` | tickets路由、查询、抽屉、动作、草稿、轮询、焦点、异常和权限状态 |
| `admin-dev.css` | 限定于客服页面的布局、表格、抽屉、弹窗和七档宽度适配 |
| `admin-prototype-data.js` | `AFF_SUPPORT_SERVICE`本地异步数据服务、20组夹具、状态/权限/受众/并发/幂等校验 |
| `admin-rebuild.js` | 上一代tickets入口兼容跳转 |
| `scripts/admin-support-service-check.cjs` | 服务层98项断言 |
| `scripts/admin-support-check.cjs` | 浏览器23项用例及18张截图 |

页面读取与写入统一调用 `AFF_SUPPORT_SERVICE.request(operation,params,context)`；返回success/data/trace_id/server_now，失败携带code/details/trace。该接口运行于浏览器内存，不是HTTP请求；version及idempotency_key模拟If-Match和幂等语义，不证明生产网关、事务或存储已实现。正文草稿仅存当前内存，列布局偏好可本地保存。

客服默认身份为 `operations/U-SUPPORT01`。主管可重派/导出，审计只读；财务与技术身份须携带所分配collaboration_id，只读写自身协作上下文。无客服权限的system_admin不能读取客服数据。测试可用 `AFF_SUPPORT_UI.setContext`，页面没有新增角色切换器。

2026-11-08菜单修正：按用户要求，当前Mock的“风控 › 客户服务”入口固定登记在左侧菜单，不再按当前演示角色过滤，因此从默认管理员的其他页面也能找到。仅增加导航可见性，不授予support业务能力；无权身份点击后仍显示Forbidden且无工单数据。专业身份仍不能从此入口枚举客服队列。JS资源标识更新为`admin-support-menu-v2`。

同批修复窄屏展开侧栏仍继承图标模式、隐藏子菜单文字的问题；移动导航展开后恢复图标、菜单名称及44px点击高度。桌面236px与中屏84px规则保持原基线。

本次导航复验：从默认系统管理员仪表盘展开风控可见客户服务，点击进入`tickets`且仍安全拒绝数据访问；切换运营后从同一菜单可正常进入列表。当前窄屏实页中菜单文字为可见block、按钮高44px，客户服务处于选中态。`node --check admin-dev.js`通过；文档检查ACTIVE_MD=291、BROKEN_LINKS=0、ERRORS=0。本次为菜单与响应式修正，未重跑上一批23项全套用例。

## 3. 21项契约操作映射

下表仅表示本地模拟操作已存在，目标HTTP路径仍待正式实现及技术评审。目标字段、状态和错误以产品仓库开发契约为准。

| 契约 | 本地operation | 目标HTTP |
|---|---|---|
| CS-API01 | capabilities | GET /admin/support/capabilities |
| CS-API02 | list | GET /admin/support/tickets |
| CS-API03 | detail | GET /admin/support/tickets/{id} |
| CS-API04 | messages | GET /admin/support/tickets/{id}/messages |
| CS-API05 | assign | POST /admin/support/tickets/{id}/assign |
| CS-API06 | reply | POST /admin/support/tickets/{id}/reply |
| CS-API07 | note | POST /admin/support/tickets/{id}/notes |
| CS-API08 | action | POST /admin/support/tickets/{id}/actions |
| CS-API09 | collaborate | POST /admin/support/tickets/{id}/collaborations |
| CS-API10 | assignees | GET /admin/support/tickets/{id}/assignees |
| CS-API11 | upload | POST /admin/support/attachments |
| CS-API12 | attachment | GET /admin/support/attachments/{id} |
| CS-API13 | download | GET /admin/support/attachments/{id}/content |
| CS-API14 | deleteAttachment | DELETE /admin/support/attachments/{id} |
| CS-API15 | readPosition | POST /admin/support/tickets/{id}/read-position |
| CS-API16 | export | POST /admin/exports |
| CS-API17 | eligibility | GET /settlement-cases/{id}/appeal-eligibility |
| CS-API18 | operation | GET /admin/support/operations/{key} |
| CS-API19 | objectCandidates | GET /admin/support/tickets/{id}/object-candidates |
| CS-API20 | history | GET /admin/support/tickets/{id}/history |
| CS-API21 | assigneeFilters | GET /admin/support/assignee-filters |

服务层持有六状态、双SLA时钟、动作矩阵、负责人、协作、授权关联对象、公开/内部/任务消息、附件元数据、阅读位置和导出任务。公开回复不更改佣金、结算、提现或风险事实；申诉指引只生成受控CTA，正式申诉回写由可信测试事件模拟。

## 4. 专项验证

| 检查 | 结果与证据 |
|---|---|
| `npm run check` | 退出0，现有脚本语法检查通过 |
| `node scripts/admin-support-service-check.cjs` | 98项断言通过 |
| `node scripts/admin-support-check.cjs` | 23/23通过；18张截图；page_errors为空 |
| 视口 | 1440/1280/1279/900/767/480/390px；无document横溢；抽屉尺寸及焦点循环通过 |
| 独立复审 | 已修复缺陷复核后，本轮范围未发现遗留P1/P2；结论限当前管理端Mock |
| 旧全局 `npm run test:admin-prototype` | 未通过：脚本第78行期望7路由，当前共享工作区11路由。该断言未覆盖新任务/风险/客服结构；保留失败，不改弱旧断言，不声称全局回归通过 |

浏览器机器报告：[report.json](../../.artifacts/admin-support/report.json)。截图同在 `.artifacts/admin-support/`，含list-desktop、communication-desktop、collaboration-desktop、history-desktop，以及七档list/drawer截图。本轮已人工查看桌面列表及390px抽屉。报告时间为2026-11-08T15:02:37.003Z。

## 5. 33条AC证据覆盖与缺口

B表示浏览器已测相关分支，S表示本地数据服务已测相关断言；都不代表该AC所有子条件通过。所有行仍需在正式接口及跨端环境按原文逐条验收，不能把23项浏览器用例换算成33条完整AC通过。

| AC-CS | 当前证据 | 尚缺或验证边界 |
|---|---|---|
| 01 | B+S，认领后负责人/状态与首响 | 生产审计持久化 |
| 02 | B+S，公开回复及首次响应 | 真实合作方页面与通知outbox联调 |
| 03 | S，partner身份响应过滤内部消息/文件 | 实际合作方页DOM/下载适配 |
| 04 | S，重复partnerReply只恢复一次 | 测试钩子模拟，未从合作方页触发 |
| 05 | B+S，活动阻断任务拒绝解决 | 真实任务系统完成回写 |
| 06 | B+S，明确解决后再关闭，评价可空 | 与真实业务账务的集成对照 |
| 07 | B+S，未驳回信号不可引导申诉 | 真实资格服务 |
| 08 | B+S，指引不扣次数；钩子重复回写只扣一次 | 正式合作方申诉提交链路 |
| 09 | S，closed合法重开、resolved缺策略恢复 | 窗外及spam等全部负向分支专项证据 |
| 10 | S，同version两次认领仅一次成功 | 两个真实浏览器/HTTP并发 |
| 11 | S，同key重放、查原结果、不同负载拒绝 | 真实网络丢响应与持久化幂等 |
| 12 | B+S，待扫描/拒绝/clean、受众校验与下载拒绝 | 真实二进制、签名检测及扫描服务 |
| 13 | B+S，客服/审计/专业/无权管理员 | 全队列/主体/合作方交叉权限矩阵 |
| 14 | B+S，暂存查询、排序、导出scope及ID | 后台导出文件及最终下载鉴权 |
| 15 | B+S，缺策略提示、文字可回、上传拒绝 | 正式策略配置服务 |
| 16 | B+S，关闭/历史只读和已有评价 | 真实评价产生及所有历史原因 |
| 17 | B，回复已存且详情内显示通知部分失败及trace | 真实邮件失败/重试记录 |
| 18 | B，七档布局、焦点循环、0运行错误 | 完整人工可达性及全部长文本组合 |
| 19 | B，独立草稿、离开保护、补件与内部附件隔离 | 多窗口/异常中断的完整组合 |
| 20 | B+S，分类限制、停用人员筛选、URL排序 | 跨日、多次暂停及null排序所有组合 |
| 21 | S，关联返回完整当前三元组 | 其他案件Y/同批次不受影响的集成断言 |
| 22 | 实现有异常关闭门禁 | 尚无独立用例证明全部重复引用/循环/任务组合 |
| 23 | B，筛选重置、URL页码/页容量/排序恢复 | 写后退出筛选及高页码回退全组合 |
| 24 | 实现有未接入提示与复制；B测旧入口兼容 | 关联对象实际定位失败分支尚无专项证据；旧入口用例不替代本条 |
| 25 | S，停用负责人resolved重派后正常关闭 | 六状态重派及closed重开全部组合 |
| 26 | B+S，专业上下文、A/B消息/附件隔离 | 各受众history与下载完整负向矩阵 |
| 27 | S，精确授权候选及关联、其他合作方返回空 | 完整关联后引导和已引用不可删流程 |
| 28 | S，历史停用人可筛选、不能被新分派 | API10/21正式服务权限矩阵 |
| 29 | B+S，旧未受理只读、未分配排除 | 未知历史原因全枚举Schema验证 |
| 30 | B+S，结构化CTA与不提前扣次数 | 实际合作方点击后资格失效重校验 |
| 31 | S，策略收紧拒绝绑定、版本不变、去文件后成功 | 浏览器完整错误/正文保留及真实文件策略 |
| 32 | S，重复正式申诉回写只恢复一轮并清旧结果 | 测试钩子模拟，实际申诉事件及旧提醒服务 |
| 33 | B+S，只提交授权变化、终态拒绝分类/关联 | 全状态/角色/动作矩阵逐项执行 |

## 6. 开发交接与未完成项

1. 前端可以直接基于当前统一页面继续开发；将本地operation适配为正式HTTP请求，使用真实身份和数据范围，保留现有状态与错误反馈。生产Schema/OpenAPI逐字段评审仍待完成。
2. 合作方 `support-page.js` 仍读独立 `AFF.state.supportTickets`，没有接入本服务。公开消息、六状态、CTA、评价及正式申诉尚未形成实际跨端闭环。目标契约未因此删减。
3. 专业协作记录由本服务模拟，并未证明与其他会话正在实现的统一任务队列、风险页、导出中心及通知中心共享同一实例。未支持定位的对象显示未接入提示及复制编号，不把空跳转当成功。
4. 附件只模拟元数据、安全状态和受控下载，不持久保存真实上传内容；真实扫描/签名、存储、流式下载、清理和治理服务待接。扫描成功状态不是安全认证证明。
5. 导出返回本服务中的queued任务与实际export_id，尚无后台worker、可下载产物或正式导出中心同步；通知状态也是模拟，未实际发送邮件。
6. 生产SLA/日历/重开/附件策略须由责任岗位签核，跨岗位正式评审记录仍待回收。演示策略不能直接发布生产。

当前可用于管理端交互、布局、权限与开发实现讨论；CS-G03仅取得部分本地证据。跨端闭环、完整AC及生产门禁继续开放。共享工作区存在其他会话并行修改，本报告不代表整套管理端或所有路由验收完成。

## 7. 复审修复记录

本轮修复并复验：切身份清理旧缓存；专业上下文能力读取；同页URL/页容量优先级；草稿离开保护；分类只提交授权变化；取消后恢复原弹窗；焦点循环及回到触发项；上传冻结工单/受众；补件附件隔离；通知失败在抽屉内可见；导出使用生效查询与返回任务ID。未对其他专题测试失败作通过处理。

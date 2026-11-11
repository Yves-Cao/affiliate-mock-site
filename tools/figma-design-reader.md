# Figma Design Reader 油猴脚本

这是一个本地只读采集脚本，用于在当前用户有权限查看的 Figma 页面中尽可能提取设计信息。它不会上传数据，不会请求额外权限，也不会绕过 Figma 的访问控制。

## 安装

1. 打开 Tampermonkey 或同类用户脚本管理器。
2. 新建脚本。
3. 粘贴 `figma-design-reader.user.js` 全部内容并保存。脚本需要 `document-start` 权限，用于从页面加载早期开始捕获实时消息。
4. 打开目标 Figma 文件，右下角会出现 `Figma Reader` 面板。
5. 右侧切换到 `Properties` 页签；停在 `Comments` 时样式面板采集会跳过。

## 使用

- 点击 `采集`：读取当前页面可见信息。
- 点击 `复制 JSON`：复制完整本地采集结果。
- 点击 `下载 JSON`：导出 JSON 文件。
- 点击 `显示状态`：查看哪些采集项成功、跳过及原因。

快捷数据也可在控制台读取：

```js
window.__FIGMA_DESIGN_READER_STATE__
window.__FIGMA_DESIGN_READER__
```

## 采集范围

脚本会尽力读取以下内容：

1. 文件 key、node id、URL、页面标题、视口。
2. 编辑权限提示，仅基于当前 UI 文案判断。
3. 左侧页面与图层面板的可见文本、层级提示、展开状态。
4. 右侧属性面板和页面可见文本。
5. DOM 字体、字号、字重、行高、字距和颜色。
6. CSS variables。
7. Figma `canvas` 的尺寸、缩略图和像素主色。
8. Figma 前端已加载的 JSON 响应。
9. 右侧 `Properties` 面板中的 Text styles、Color styles、Layout guide styles 列表和纯色 SVG 值。
10. WebSocket、Worker、BroadcastChannel 的文本或可打印消息；二进制只记录方向和大小。
11. IndexedDB 数据库、object store 和可读记录摘要。
12. `localStorage` / `sessionStorage` 中非敏感键值与存储用量。
13. JSON 中可识别的页面、节点、文本、填充、描边、样式、变量和组件信息。

## 权限与降级

- 只读取当前账号已经能看到的数据。
- 画布因跨域或安全策略无法读取时跳过。
- 网络响应不是 JSON 或尚未加载时跳过。
- WebSocket / Worker / BroadcastChannel 二进制协议不强行解码，只记录元数据。
- IndexedDB 打开、事务或读取失败时跳过该库或 store。
- 画布读取结果若全透明则判定不可读，不保留空白缩略图。
- DOM 结构变化导致面板无法识别时保留可见文本。
- 插件沙箱、Dev Mode 或账号无权访问的数据不会尝试绕过。

## 输出字段说明

| 字段 | 含义 |
|---|---|
| `permissions` | 从 UI 文案推断的只读/编辑提示 |
| `dom.panelRows` | 页面、图层和属性面板可见行 |
| `typography` | DOM 可见文字样式 |
| `colors.canvas` | 画布像素采样得到的近似主色 |
| `payload.nodes` | 从已捕获 JSON 识别的 Figma 节点 |
| `payload.styles` | 样式对象 |
| `payload.variables` | 变量对象 |
| `payload.components` | 组件对象 |
| `figmaStylePanel` | 当前 Properties 面板可见样式列表和纯色值 |
| `capturedJson` | 已捕获并脱敏的接口 JSON |
| `tasks` | 每个采集任务的成功/跳过状态 |

像素主色是采样和量化后的近似值，不能当作 Figma Color Style 的权威值。若 JSON 中已有 styles/variables，应优先使用 `payload.styles` 和 `payload.variables`。

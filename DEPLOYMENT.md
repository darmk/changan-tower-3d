# 静态部署

发布 `dist/` 内的全部内容即可。网站没有后端服务，不需要在服务器安装 Blender，也不需要上传 `node_modules`、`blender` 或 `docs`。

默认 Vite base 为 `./`，适合域名根目录和带结尾斜杠的子目录，例如 `/xianDayanPagoda/`。服务器应把不带结尾斜杠的目录请求重定向至带斜杠地址，以保证相对路径解析正确。

```powershell
npm ci
npm run check
npm run build
```

若平台要求固定资源前缀，在构建前设置：

```powershell
$env:VITE_BASE_PATH='/xianDayanPagoda/'
npm run build
Remove-Item Env:VITE_BASE_PATH
```

将 `dist` 的内容复制到服务器对应目录。`index.html` 保持短缓存或协商缓存；哈希命名的 `assets/` 可长缓存。模型文件名没有内容哈希，更新模型时应刷新 CDN 缓存或使用短缓存，避免新旧版本混用。

## 公众号关注引导（纯前端）

首次访问时，页面会先展示固定的公众号二维码；用户点击“我已关注，进入体验”后，才会初始化三维查看器。这个状态保存在浏览器的 Local Storage，使用键名 `darmk:follow-gate:main:v1`；同一协议、域名和端口下的其他项目可复用它。

页面不与微信服务器通信，不能验证用户是否真正关注；该功能仅用于引导，不应作为安全访问控制。若要重新查看二维码引导，在浏览器开发者工具的 Application/应用面板中删除该 Local Storage 项即可。二维码路径和文案可在 `src/follow-gate-config.ts` 中调整。

模型 MIME 类型建议 `model/gltf-binary`，JSON 为 `application/json`，JavaScript 为 `text/javascript`。单个 GLB 约 8–9 MB，服务器应允许完整传输；三个画质文件不会在首屏同时下载。

不要直接双击 `dist/index.html` 使用 file:// 打开。模型和视角配置通过 HTTP 请求加载，请使用 `start.cmd`、Vite preview 或静态服务器。

本地开发默认配置保留 5178 端口及 `0.0.0.0` 监听能力；便捷启动脚本明确使用 `127.0.0.1`。如需局域网测试，可在项目目录运行 `npm run dev -- --host 0.0.0.0`，再通过本机局域网 IP 的 5178 端口访问。

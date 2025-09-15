# AI Town・校园小镇（本地运行指南）

基于 a16z `ai-town` 改造：以 "高考倒计时 30 天" 的校园为背景，8 位学生 Agent 在地图中结伴学习与对话。我们支持注入事件（如模拟考试、老师鼓励、恋爱等），并计划在 Dashboard 里查看情绪与成绩的变化。

## ✅ 当前改动（已完成）
- 本地链路跑通：前端 + Convex 本地 dev（`127.0.0.1:3210`）
- 大模型：Ollama（局域网机器或远端）
  - 默认：`qwen3:8b`（对话） + `nomic-embed-text`（向量）
  - 可切换：`qwen2.5:14b-instruct`（参考下文 "切换模型"）
- 远端 / 异地 Ollama 访问：接入 Tunnelmole（免费开源），一条命令暴露 `11434`
- 地图与 UI：中文教室地图、左下角事件面板（目前为开发者工具），右下角 Dashboard 入口（占位，后续补图表）
- 运行稳定性：不再依赖云端 Convex；默认采用 Convex 本地部署（BETA）

> 说明：我们没有合入任何 "抛异常→吞掉" 的临时热修，代码基本保持上游逻辑；必要的环境 / 流程都写在本文档里。

## 🧭 拓扑（建议）
```plaintext
前端+Convex（本机 Mac）
↑  http://127.0.0.1:3210
└─→ OLLAMA_HOST（两种任选）
1) 局域网直连      http://<LAN_IP>:11434
2) 远端经隧道      https://<your>.tunnelmole.net  （由 tmole 生成）
```

## 🔧 先决条件
- Node.js ≥ 18，pnpm/npm 任意其一
- 已安装并启动 Ollama 的机器（局域网或远端）
- 可选：安装 Tunnelmole（用于把远端 `11434` 暴露为公网 URL）

### 安装 Tunnelmole（可选，用于远端机器）
```bash
npm install -g tunnelmole
# 在 "装有 Ollama 的机器" 上运行：
tmole 11434
# 复制输出的 https://xxxx.tunnelmole.net
```

## 📦 克隆与安装
```bash
git clone https://github.com/njnklab/ai-town.git ai-town
cd ai-town
npm install
```

## ⚙️ 环境变量（`.env.local`）
重要：关闭代理，避免 `127.0.0.1` 被劫持：
```bash
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY
export NO_PROXY=localhost,127.0.0.1
```

在项目根创建 / 修改 `.env.local`（如下为模板；按你的实际情况换 `OLLAMA_HOST`）：
```env
# Convex 本地 dev 的地址（配置命令会自动写入为 127.0.0.1:3210）
VITE_CONVEX_URL=http://127.0.0.1:3210

# —— 大模型（任选其一）——
# A. 局域网直连
# OLLAMA_HOST=http://192.168.3.101:11434

# B. 远端隧道（Tunnelmole 输出的 https 链接；推荐 https）
# OLLAMA_HOST=https://<your>.tunnelmole.net

# 默认模型
OLLAMA_MODEL=qwen3:8b
OLLAMA_CHAT_MODEL=qwen3:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# 并发限制（本地稳妥值）
MAX_CONCURRENT_CONVERSATIONS=1
```

> 注意：如果 Convex CLI 不小心把 `VITE_CONVEX_URL` 改回 `*.convex.cloud`，重新执行 "本地部署配置"（见下一节）。

## 🚀 启动 Convex（本地部署 BETA）
第一次（或切换到本地）需要配置一次：
```bash
npx convex --version     # 建议 1.27.0+
npx convex dev --configure --dev-deployment local
# 成功日志会包含：
# "Started running a deployment locally at http://127.0.0.1:3210
#  and saved its URL as VITE_CONVEX_URL to .env.local"
```

随后启动并跟日志：
```bash
npx convex dev --tail-logs
```

## 🌱 初始化世界（8 个学生）
另开终端（确保在项目根目录）：
```bash
npx convex run testing:stop || true
npx convex run testing:wipeAllTables || true
npx convex run init -- '{"numAgents": 8}'
npx convex run testing:kick
```

## 🖥️ 启动前端
```bash
npm run dev:frontend
# 打开 http://localhost:5173/ai-town
# 走近 NPC → Interact 可看到中文对话
```

- 事件面板（开发用）：左下角可选择「角色 / 事件 / 强度」并触发（比如 `mock_exam`）。
- Dashboard：右下角入口 `/ai-town/dashboard`（当前为占位，后续补图表与聚合）。

## 🔁 切换模型（示例：`qwen2.5-14b`）
在运行 Ollama 的机器预拉模型：
```bash
ollama pull qwen2.5:14b-instruct
```

修改 `.env.local`：
```env
OLLAMA_MODEL=qwen2.5:14b-instruct
OLLAMA_CHAT_MODEL=qwen2.5:14b-instruct
# 向量模型保持 nomic-embed-text
```

重启 Convex（`CTRL+C` 终止旧进程，再执行 `npx convex dev --tail-logs`），前端刷新即可。

## 🧪 自检清单（常见坑）

| 问题现象         | 排查方向                                                                 |
|------------------|--------------------------------------------------------------------------|
| Interact 没反应  | 1. 浏览器 Network 确认请求是否打到 `http://127.0.0.1:3210` <br> 2. 终端查看是否有 `Agent a:xx starting operation agentGenerateMessage` 日志 |
| Ollama 不通 / 403 | 1. 局域网：执行 `curl http://<LAN_IP>:11434/api/tags` 确认返回正常 <br> 2. 隧道：确认 Tunnelmole 生成的 https 地址可外网访问 |
| 被代理劫持       | 1. 重新执行 `unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY ALL_PROXY` <br> 2. 确认 `NO_PROXY=localhost,127.0.0.1` 已配置 |
| Convex 又连回云端 | 重新执行 `npx convex dev --configure --dev-deployment local` 重置本地配置 |
| 地图 / 构建出现 `esbuild import` 警告 | 属正常兼容问题（适配不同字段名），不影响运行 |

## 🗺️ 路线图（规划中）
- 事件影响 → 情绪 / 动力的规则化引擎（含时间衰减）
- Dashboard：全班情绪趋势、事件计数、Top-N 风险、模考曲线
- 家长 / 老师 NPC 与更多校园事件
- 导出报表与重放（replay）

## 📚 技术栈

- **游戏引擎、数据库和向量搜索**: [Convex](https://convex.dev/)
- **认证** (可选): [Clerk](https://clerk.com/)
- **默认聊天模型**: `qwen3:8b`
- **向量嵌入**: `nomic-embed-text`
- **本地推理**: [Ollama](https://github.com/jmorganca/ollama)
- **可配置云端LLM**: [Together.ai](https://together.ai/) 或任何支持 OpenAI API 的服务
- **背景音乐生成**: [Replicate](https://replicate.com/) 使用 MusicGen
- **前端渲染**: [PixiJS](https://pixijs.com/)

## 🎨 资源来源

- **像素艺术生成**: [Replicate](https://replicate.com/), [Fal.ai](https://serverless.fal.ai/lora)
- **游戏交互和渲染**: [PixiJS](https://pixijs.com/)
- **图块资源**:
  - https://opengameart.org/content/16x16-game-assets by George Bailey
  - https://opengameart.org/content/16x16-rpg-tileset by hilau
- **原版资源**: [ansimuz](https://opengameart.org/content/tiny-rpg-forest)
- **UI资源**: [Mounir Tohami](https://mounirtohami.itch.io/pixel-art-gui-elements)

---

**项目灵感**: [_Generative Agents: Interactive Simulacra of Human Behavior_](https://arxiv.org/pdf/2304.03442.pdf)


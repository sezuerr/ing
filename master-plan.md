# Master Plan — ING (兴趣匹配社交小程序)

> **Brief:** College Student Interest-Based Social Matching | **Status:** Draft

---

## 1. Product

**Problem:** 大学生想交有共同兴趣的朋友，但社交边界强、学业重、缺乏自然交流渠道。

**User:** 想在校内认识同好的大学生，对直接搭讪感到不适，偏好低压力的兴趣导向互动。

**Core Demo Flow:**
1. 打开小程序 → Discover 动态流，浏览匿名帖子
2. 发帖（文字 ≤500 字 + 1–3 个兴趣标签）
3. 给别人帖子点赞 → 系统检测双向点赞 → 创建 Match
4. Match 双方进入 1-on-1 聊天

**Must-Haves:** 匿名发帖 | 动态流 | 点赞 + 双向匹配检测 | Match 通知 | 聊天

**Non-Goals:** 无账户/头像/实名 | 无图片上传 | 无好友列表 | 无推送通知 | 无内容审核 | 无群聊 | 无算法推荐

---

## 2. UX

**Principles:** 匿名优先 | 低压 opt-in | 兴趣锚定 | 校园感（非 dating 风格）

**Screens:** Discover Feed → Create Post → My Posts → Match Notification → Chat → Conversation List

---

## 3. Architecture — ADR

**Pattern:** Thin client + 微信云开发全栈

**Selected Pathway:** 微信小程序 + 微信云开发（环境 `cloud1-d3g3i3b996dd7dad5`）

**Data Model:** Post | User | Like | Match | Conversation | Message（详见 ADR 4.4）

**AI Boundary:** 无 AI — 匹配是确定性规则

**Mocked Components:** 内容审核 | 推送通知 | 标签分类管理 | 校园认证

---

## 4. Milestones

| Slice | Goal | Scope |
|-------|------|-------|
| 1 | Anonymous Post Feed | Discover 流 + 发帖 + `posts.list`/`posts.create` 云函数 |
| 2 | Like + Match Detection | 点赞按钮 + 双向检测 + Match 通知 + 会话自动创建 |
| 3 | Chat | 聊天屏 + `messages.send`/`messages.list` + 30s 轮询 |
| 4 | Interest Discovery + My Posts | 标签筛选 + 我的帖子 + 分页 |
| 5 | Safety Essentials | 内容校验 + 频率限制 + 敏感词 + 取消匹配 |
| 6 | Polish + Demo Ready | 加载骨架屏 + 下拉刷新 + 触感反馈 + 错误处理 + 种子数据 |

---

## 5. Handoff

**Fixed Decisions:** 技术路径不变 | 匿名优先设计 | Walking Skeleton 范围不变

**Deferred:** 实名认证 | 内容审核 | 推送通知 | 图片上传 | 算法排序 | 多校区

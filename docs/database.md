# ing 云数据库集合设计

## users

用户资料和统计。

```js
{
  openid,
  avatarUrl,
  nickName,
  gender,
  bio,
  universityId,
  universityName,
  cityCode,
  geoHash,
  privacy,
  stats: { likeCount, commentCount },
  createdAt,
  updatedAt
}
```

建议索引：`openid` 唯一、`universityId`、`cityCode`。

## universities

预设高校列表。

```js
{
  id,
  name,
  cityCode,
  campus,
  geoHash
}
```

## daily_topics

每日随机话题。

```js
{
  date,
  title,
  icon,
  status
}
```

建议索引：`status + date`。

## posts

UGC 帖子。

```js
{
  authorId,
  title,
  body,
  icon,
  imageUrls,
  visibility,
  cityCode,
  universityId,
  universityName,
  geoHash,
  distanceText,
  status,
  reviewStatus,
  likeCount,
  commentCount,
  dailyTopicId,
  createdAt,
  updatedAt
}
```

建议索引：`status + createdAt`、`cityCode + status`、`universityId + status`、`authorId + createdAt`。

## likes

点亮记录，不可撤销。

```js
{
  postId,
  fromUserId,
  toUserId,
  createdAt
}
```

建议索引：`postId + fromUserId` 唯一、`fromUserId + toUserId`、`toUserId`。

## matches

互亮配对。

```js
{
  pairKey,
  members,
  userA,
  userB,
  status,
  createdAt,
  updatedAt,
  unmatchedAt
}
```

建议索引：`pairKey` 唯一、`members + status`。

## conversations / messages

私信会话和消息。

```js
{
  members,
  matchId,
  lastMessage,
  unreadMap,
  status,
  createdAt,
  updatedAt
}
```

```js
{
  conversationId,
  senderId,
  content,
  readBy,
  createdAt
}
```

建议索引：`members + status`、`conversationId + createdAt`。

## comments

私密回复。

```js
{
  postId,
  fromUserId,
  toUserId,
  content,
  createdAt
}
```

## notifications

通知流。

```js
{
  recipientId,
  type,
  actorId,
  postId,
  title,
  description,
  read,
  createdAt
}
```

建议索引：`recipientId + createdAt`。

## reports / post_actions

举报、不感兴趣、划过等发现流排除信号。

```js
{
  postId,
  reporterId,
  reason,
  status,
  createdAt
}
```

```js
{
  userId,
  postId,
  action,
  createdAt
}
```

建议索引：`userId + action`、`postId + reason`。

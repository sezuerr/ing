const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// ======================== 种子数据 ========================

const UNIVERSITIES = [
  // 北京高校（来自 constants.js）
  { id: "ruc",      name: "中国人民大学",       cityCode: "beijing",  campus: "中关村校区", geoHash: "wx4g0b" },
  { id: "tsinghua", name: "清华大学",           cityCode: "beijing",  campus: "清华园",     geoHash: "wx4g1c" },
  { id: "pku",      name: "北京大学",           cityCode: "beijing",  campus: "燕园校区",   geoHash: "wx4g0s" },
  { id: "buaa",     name: "北京航空航天大学",   cityCode: "beijing",  campus: "学院路校区", geoHash: "wx4g1n" },
  // 上海高校（来自种子文件）
  { id: "fudan",    name: "复旦大学",           cityCode: "shanghai", campus: "邯郸校区",   geoHash: "wtw3sj" },
  { id: "sjtu",     name: "上海交通大学",       cityCode: "shanghai", campus: "闵行校区",   geoHash: "wtw37q" },
  { id: "tongji",   name: "同济大学",           cityCode: "shanghai", campus: "四平路校区", geoHash: "wtw3un" },
  { id: "ecnu",     name: "华东师范大学",       cityCode: "shanghai", campus: "普陀校区",   geoHash: "wtw3s7" },
  { id: "shufe",    name: "上海财经大学",       cityCode: "shanghai", campus: "国定路校区", geoHash: "wtw3uy" }
];

const DAILY_TOPICS = [
  { date: "2026-07-15", title: "今天你想和附近的人聊什么？", icon: "💡", status: "active" },
  { date: "2026-07-16", title: "图书馆哪个角落最适合赶 ddl？",  icon: "📚", status: "draft" }
];

// ======================== 索引 ========================

const INDEXES = {
  users: [
    { keys: [{ name: "openid", direction: "1" }], unique: true }
  ],
  posts: [
    { keys: [{ name: "status", direction: "1" }, { name: "createdAt", direction: "-1" }] },
    { keys: [{ name: "cityCode", direction: "1" }, { name: "status", direction: "1" }] },
    { keys: [{ name: "authorId", direction: "1" }, { name: "createdAt", direction: "-1" }] }
  ],
  likes: [
    { keys: [{ name: "postId", direction: "1" }, { name: "fromUserId", direction: "1" }], unique: true }
  ],
  matches: [
    { keys: [{ name: "pairKey", direction: "1" }], unique: true },
    { keys: [{ name: "members", direction: "1" }, { name: "status", direction: "1" }] }
  ],
  conversations: [
    { keys: [{ name: "members", direction: "1" }, { name: "status", direction: "1" }] }
  ],
  messages: [
    { keys: [{ name: "conversationId", direction: "1" }, { name: "createdAt", direction: "-1" }] }
  ],
  notifications: [
    { keys: [{ name: "recipientId", direction: "1" }, { name: "createdAt", direction: "-1" }] }
  ],
  post_actions: [
    { keys: [{ name: "userId", direction: "1" }, { name: "action", direction: "1" }] }
  ],
  daily_topics: [
    { keys: [{ name: "status", direction: "1" }, { name: "date", direction: "-1" }] }
  ]
};

// ======================== 工具函数 ========================

function now() {
  return db.serverDate();
}

async function seedCollection(collectionName, data, idField) {
  const col = db.collection(collectionName);
  let inserted = 0;
  let skipped = 0;

  for (const item of data) {
    // 检查是否已存在，避免重复导入
    const filter = {};
    filter[idField] = item[idField];
    const existing = await col.where(filter).limit(1).get();
    if (existing.data.length > 0) {
      skipped++;
      continue;
    }

    await col.add({
      data: {
        ...item,
        createdAt: now(),
        updatedAt: now()
      }
    });
    inserted++;
  }

  return { inserted, skipped };
}

async function createIndexes(collectionName, indexes) {
  const col = db.collection(collectionName);
  const results = [];

  for (const idx of indexes) {
    try {
      await col.createIndex({
        keys: idx.keys,
        unique: idx.unique || false
      });
      const keyStr = idx.keys.map(k => `${k.name}:${k.direction}`).join(", ");
      results.push({
        collection: collectionName,
        index: keyStr,
        unique: idx.unique || false,
        status: "created"
      });
    } catch (err) {
      // 索引已存在时会报错，跳过即可
      if (err.errCode === -1 || err.message?.includes("already exists") || err.message?.includes("已存在")) {
        results.push({ collection: collectionName, status: "exists" });
      } else {
        results.push({ collection: collectionName, status: "error", message: err.message });
      }
    }
  }

  return results;
}

// ======================== 主函数 ========================

exports.main = async (event) => {
  const { step } = event || {};
  const report = {
    step: step || "all",
    universities: null,
    dailyTopics: null,
    indexes: null
  };

  try {
    // Step 1: 导入高校
    if (!step || step === "all" || step === "universities") {
      console.log("===== 导入高校数据 =====");
      console.log(`共 ${UNIVERSITIES.length} 条`);
      report.universities = await seedCollection("universities", UNIVERSITIES, "id");
      console.log(`新增: ${report.universities.inserted}, 跳过: ${report.universities.skipped}`);
    }

    // Step 2: 导入每日话题
    if (!step || step === "all" || step === "dailyTopics") {
      console.log("===== 导入每日话题 =====");
      console.log(`共 ${DAILY_TOPICS.length} 条`);
      report.dailyTopics = await seedCollection("daily_topics", DAILY_TOPICS, "date");
      console.log(`新增: ${report.dailyTopics.inserted}, 跳过: ${report.dailyTopics.skipped}`);
    }

    // Step 3: 创建索引
    if (!step || step === "all" || step === "indexes") {
      console.log("===== 创建索引 =====");
      report.indexes = [];
      for (const [colName, indexes] of Object.entries(INDEXES)) {
        const result = await createIndexes(colName, indexes);
        report.indexes.push(...result);
        console.log(`${colName}: ${result.map(r => r.status).join(", ")}`);
      }
    }

    return {
      ok: true,
      message: "数据库初始化完成",
      report
    };

  } catch (error) {
    console.error("initDB failed:", error);
    return {
      ok: false,
      message: error.message || "初始化失败",
      report
    };
  }
};

const UNIVERSITIES = [
  { id: "fudan", name: "复旦大学", cityCode: "shanghai", campus: "邯郸校区", geoHash: "wtw3sj" },
  { id: "sjtu", name: "上海交通大学", cityCode: "shanghai", campus: "闵行校区", geoHash: "wtw37q" },
  { id: "tongji", name: "同济大学", cityCode: "shanghai", campus: "四平路校区", geoHash: "wtw3un" },
  { id: "ecnu", name: "华东师范大学", cityCode: "shanghai", campus: "普陀校区", geoHash: "wtw3s7" },
  { id: "shufe", name: "上海财经大学", cityCode: "shanghai", campus: "国定路校区", geoHash: "wtw3uy" }
];

const TOPIC_ICONS = ["💡", "☕", "🎧", "📚", "🌙", "⚡"];

const VISIBILITY_OPTIONS = [
  { value: "self", label: "仅自己可见" },
  { value: "friends", label: "仅好友可见" },
  { value: "university", label: "仅该学校可见" },
  { value: "public", label: "全平台可见" }
];

const FEED_SCOPES = [
  { value: "city", label: "全城" },
  { value: "university", label: "我的大学" },
  { value: "friends", label: "仅好友" }
];

const REPORT_REASONS = [
  { value: "porn", label: "色情低俗" },
  { value: "violence", label: "暴力危险" },
  { value: "provocation", label: "引战攻击" },
  { value: "commercial", label: "商业广告" },
  { value: "not_interested", label: "不感兴趣" }
];

module.exports = {
  UNIVERSITIES,
  TOPIC_ICONS,
  VISIBILITY_OPTIONS,
  FEED_SCOPES,
  REPORT_REASONS
};

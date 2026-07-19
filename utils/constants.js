const UNIVERSITIES = [
  { id: "ruc", name: "中国人民大学", cityCode: "beijing", campus: "中关村校区", geoHash: "wx4g0b" },
  { id: "tsinghua", name: "清华大学", cityCode: "beijing", campus: "清华园", geoHash: "wx4g1c" },
  { id: "pku", name: "北京大学", cityCode: "beijing", campus: "燕园校区", geoHash: "wx4g0s" },
  { id: "buaa", name: "北京航空航天大学", cityCode: "beijing", campus: "学院路校区", geoHash: "wx4g1n" }
];

const TOPIC_ICONS = ["💡", "☕", "🎧", "📚", "🌙", "⚡", "🍔", "🐟", "😶", "🧊", "🏄", "😴", "🚶"];

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
  { value: "harassment", label: "骚扰辱骂" },
  { value: "provocation", label: "引战攻击" },
  { value: "commercial", label: "商业广告" },
  { value: "fake_info", label: "虚假信息" },
  { value: "privacy_leak", label: "泄露隐私" },
  { value: "spam", label: "垃圾刷屏" },
  { value: "not_interested", label: "不感兴趣" }
];

module.exports = {
  UNIVERSITIES,
  TOPIC_ICONS,
  VISIBILITY_OPTIONS,
  FEED_SCOPES,
  REPORT_REASONS
};

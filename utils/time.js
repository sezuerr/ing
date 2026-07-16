function fromNow(value) {
  const timestamp = typeof value === "number" ? value : new Date(value || Date.now()).getTime();
  const diffSeconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return "刚刚";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatChatTime(value) {
  if (!value) return "";
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  const now = new Date();
  const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (dayDiff === 0) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (dayDiff === 1) return "昨天";
  if (dayDiff > 1 && dayDiff < 7) return WEEKDAYS[date.getDay()];
  if (date.getFullYear() === now.getFullYear()) return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatFullDate(value) {
  const date = new Date(value);
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatClockLabel(value) {
  const date = new Date(value);
  const hours = date.getHours();
  const period = hours < 12 ? "上午" : "下午";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${period}${hour12}:${pad(date.getMinutes())}`;
}

module.exports = { fromNow, formatChatTime, formatFullDate, formatClockLabel };

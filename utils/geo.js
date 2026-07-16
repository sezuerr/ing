function toRad(value) {
  return (value * Math.PI) / 180;
}

function distanceKm(a, b) {
  if (!a || !b) return null;
  const radius = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceBucket(km) {
  if (km === null || km === undefined) return "距离未知";
  if (km < 1) return "距你1公里内";
  if (km < 3) return "距你3公里内";
  if (km < 10) return "距你10公里内";
  return "距你10公里以上";
}

function coarseGeoHash(location) {
  if (!location) return "";
  const lat = Math.round(location.latitude * 20) / 20;
  const lng = Math.round(location.longitude * 20) / 20;
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

module.exports = {
  distanceKm,
  distanceBucket,
  coarseGeoHash
};

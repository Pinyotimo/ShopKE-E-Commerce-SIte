const rad = x => (x * Math.PI) / 180;
export function km(a, b, c, d) {
  const dLa = rad(c - a), dLo = rad(d - b);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
export function quote(lat, lng, subtotal = 0) {
  const d = km(+process.env.STORE_LAT, +process.env.STORE_LNG, lat, lng);
  const max = +process.env.MAX_DELIVERY_KM || 25;
  const distanceKm = +d.toFixed(1);
  if (d > max) return { ok: false, distanceKm, error: `Outside delivery area (max ${max} km)` };
  const free = subtotal >= (+process.env.FREE_DELIVERY_OVER || Infinity);
  return { ok: true, distanceKm, fee: free ? 0 : 150 + Math.ceil(d) * 30 };
}
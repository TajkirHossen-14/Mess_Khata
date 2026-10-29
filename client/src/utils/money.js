// Whole-Taka formatting for the client. Mirrors the server's utils/formatTaka.js so the
// UI and API show money identically: ৳5,300, ৳0, -৳200. Plain 3-digit grouping, no Intl.
export const formatTaka = (amount) => {
  const n = Math.trunc(Number(amount) || 0);
  const grouped = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${n < 0 ? '-' : ''}৳${grouped}`;
};

export default { formatTaka };

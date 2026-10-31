import axios from 'axios';
import crypto from 'crypto';
const B = 'https://api.paystack.co';
const H = () => ({ Authorization: 'Bearer ' + process.env.PAYSTACK_SECRET });

export async function initialize(email, amount, reference, orderId, method) {
  const body = { email, amount: amount * 100, currency: 'KES', reference,
    callback_url: `${process.env.CLIENT_URL}/order/${orderId}`, metadata: { orderId } };
  if (method === 'card') body.channels = ['card'];
  return (await axios.post(B + '/transaction/initialize', body, { headers: H() })).data.data;
}
export const verify = async ref => (await axios.get(`${B}/transaction/verify/${encodeURIComponent(ref)}`, { headers: H() })).data.data;
export const refund = (reference, amount) =>
  axios.post(B + '/refund', { transaction: reference, amount: amount * 100 }, { headers: H() });

export function validSig(raw, sig) {
  if (!sig) return false;
  const h = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET).update(raw).digest('hex');
  const a = Buffer.from(h), b = Buffer.from(String(sig));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
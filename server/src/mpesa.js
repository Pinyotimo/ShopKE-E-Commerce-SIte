import axios from 'axios';
const base = () => process.env.MPESA_ENV === 'live' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
const cb = p => `${process.env.PUBLIC_URL}/api${p}/${process.env.CALLBACK_SECRET}`;
let tok = { v: null, exp: 0 };

async function token() {
  if (tok.v && Date.now() < tok.exp) return tok.v;
  const { data } = await axios.get(base() + '/oauth/v1/generate?grant_type=client_credentials',
    { auth: { username: process.env.MPESA_KEY, password: process.env.MPESA_SECRET } });
  tok = { v: data.access_token, exp: Date.now() + (data.expires_in - 60) * 1000 };
  return tok.v;
}
const headers = async () => ({ Authorization: 'Bearer ' + (await token()) });

export const normPhone = p => {
  const s = String(p || '').replace(/\D/g, '');
  if (/^0[17]\d{8}$/.test(s)) return '254' + s.slice(1);
  if (/^254[17]\d{8}$/.test(s)) return s;
  if (/^[17]\d{8}$/.test(s)) return '254' + s;
  return null;
};

export async function stkPush(phone, amount, orderId) {
  const ts = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const sc = process.env.MPESA_SHORTCODE;
  const { data } = await axios.post(base() + '/mpesa/stkpush/v1/processrequest', {
    BusinessShortCode: sc, Password: Buffer.from(sc + process.env.MPESA_PASSKEY + ts).toString('base64'),
    Timestamp: ts, TransactionType: 'CustomerPayBillOnline', Amount: amount,
    PartyA: phone, PartyB: sc, PhoneNumber: phone, CallBackURL: cb('/payments/mpesa/callback'),
    AccountReference: `ORD${orderId}`, TransactionDesc: `Order ${orderId}`,
  }, { headers: await headers() });
  return data;
}

// Full reversal of a customer payment (Daraja Transaction Reversal API)
export async function reverse(receipt, amount, orderId) {
  const { data } = await axios.post(base() + '/mpesa/reversal/v1/request', {
    Initiator: process.env.MPESA_INITIATOR, SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
    CommandID: 'TransactionReversal', TransactionID: receipt, Amount: amount,
    ReceiverParty: process.env.MPESA_SHORTCODE, RecieverIdentifierType: '11', // (sic) Daraja's spelling
    ResultURL: cb('/refunds/mpesa/result'), QueueTimeOutURL: cb('/refunds/mpesa/timeout'),
    Remarks: `Refund order ${orderId}`, Occasion: `ORD${orderId}`,
  }, { headers: await headers() });
  return data;
}
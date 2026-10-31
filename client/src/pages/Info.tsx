import { Card } from '@/components/ui/card';
import { Page, Title } from '../ui';

type Sec = [string, string];
const PAGES: Record<string, { title: string; intro: string; secs: Sec[] }> = {
  about: { title: 'About ShopKE', intro: 'A Nairobi online store built around how Kenyans actually pay and receive orders.', secs: [
    ['Who we are', 'ShopKE sells electronics, home goods and groceries, with delivery from our Nairobi store.'],
    ['How you pay', 'M-Pesa (Paybill or Till), debit or credit card, and Paystack. Pay on your phone and get confirmation right away.'],
    ['Our promise', 'Prices in Kenya shillings, honest stock levels, and 7-day refunds on paid orders.'],
  ] },
  delivery: { title: 'Delivery', intro: 'We deliver within 25 km of our store.', secs: [
    ['Fees', 'KES 150 plus KES 30 per kilometre (rounded up), worked out from the pin you drop at checkout.'],
    ['Free delivery', 'Orders of KES 5,000 or more (after discounts) are delivered free.'],
    ['Tracking', 'Follow every step from your order page, or use Track an order with your order number and phone.'],
    ['Outside the area', 'If your pin is beyond 25 km, checkout will tell you before you pay.'],
  ] },
  returns: { title: 'Returns & refunds', intro: 'Changed your mind or something went wrong? Ask within 7 days.', secs: [
    ['How to ask', 'Open My orders, choose Request refund and tell us what happened.'],
    ['Review', 'The owner reviews each request. Approved refunds go back to the method you paid with: M-Pesa reversal or card refund.'],
    ['Timing', 'M-Pesa reversals are usually quick. Card refunds can take several working days depending on your bank.'],
    ['Unpaid orders', 'Orders not paid within 30 minutes are released automatically. Nothing is charged.'],
  ] },
  faq: { title: 'FAQ', intro: 'Quick answers.', secs: [
    ['I paid but my order says pending', 'Give it a minute. If it stays that way, open the order page; we match payments automatically and the owner reviews any that do not match.'],
    ['Which payment methods work?', 'M-Pesa, M-Pesa Till, card, and Paystack.'],
    ['Can I use a coupon?', 'Yes. Enter the code at checkout. The server checks the minimum spend, expiry and usage limit.'],
    ['What are flash sales?', 'Timed discounts. The countdown shows when the price returns to normal.'],
    ['Do I need an account?', 'To order, yes. To track an order you only need the order number and phone.'],
  ] },
  contact: { title: 'Contact us', intro: 'We reply within one working day.', secs: [
    ['Email', 'support@yourdomain.com'], ['Phone / WhatsApp', '+254 700 000 000'], ['Hours', 'Mon-Sat, 8:00-18:00 (EAT)'],
  ] },
};

export default function Info({ page }: { page: string }) {
  const c = PAGES[page];
  return (
    <Page>
      <div className="mx-auto max-w-3xl">
        <Title>{c.title}</Title>
        <p className="-mt-2 mb-6 text-muted-foreground">{c.intro}</p>
        <div className="space-y-3">{c.secs.map(([h, t]) => <Card key={h} className="gap-1 p-5"><h2 className="font-bold">{h}</h2><p className="text-sm text-muted-foreground">{t}</p></Card>)}</div>
      </div>
    </Page>
  );
}
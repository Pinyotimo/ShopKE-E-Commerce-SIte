import { Link } from 'react-router-dom';
import { Logo } from '../ui';

const cols: [string, [string, string][]][] = [
  ['Shop', [['/shop', 'All products'], ['/categories', 'Categories'], ['/deals', 'Deals & flash sales']]],
  ['Help', [['/track', 'Track an order'], ['/delivery', 'Delivery'], ['/returns', 'Returns & refunds'], ['/faq', 'FAQ']]],
  ['ShopKE', [['/about', 'About us'], ['/contact', 'Contact']]],
];
export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div><Logo /><p className="mt-3 text-sm text-muted-foreground">Shop local. Pay with M-Pesa or card. Delivered across Nairobi.</p></div>
        {cols.map(([h, ls]) => (
          <div key={h}><p className="mb-3 text-sm font-bold">{h}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">{ls.map(([to, l]) => <li key={to}><Link to={to} className="hover:text-foreground hover:underline">{l}</Link></li>)}</ul></div>
        ))}
      </div>
      <p className="border-t py-4 text-center text-xs text-muted-foreground">© ShopKE · M-Pesa, Till & Paystack accepted</p>
    </footer>
  );
}
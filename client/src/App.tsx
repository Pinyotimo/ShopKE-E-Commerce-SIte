import { Route, Routes } from 'react-router-dom';
import { BarChart3, ClipboardList, CreditCard, Package, Boxes, RotateCcw, Ticket, Users } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Guard } from './auth';
import Site from './components/Site';
import Dash from './components/Dash';
import Landing from './pages/Landing';
import Shop from './pages/Shop';
import Categories from './pages/Categories';
import Deals from './pages/Deals';
import Product from './pages/Product';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import TrackOrder from './pages/TrackOrder';
import Info from './pages/Info';
import NotFound from './pages/NotFound';
import Auth from './pages/Auth';
import DashOrders from './pages/dash/DashOrders';
import DashProducts from './pages/dash/DashProducts';
import DashStock from './pages/dash/DashStock';
import DashRefunds from './pages/dash/DashRefunds';
import DashCoupons from './pages/dash/DashCoupons';
import DashPayments from './pages/dash/DashPayments';
import Analytics from './pages/dash/Analytics';
import Team from './pages/dash/Team';

const staffNav = [
  { to: '/staff', label: 'Orders', icon: ClipboardList, end: true },
  { to: '/staff/products', label: 'Products', icon: Package },
  { to: '/staff/stock', label: 'Stock', icon: Boxes },
];
const adminNav = [
  { to: '/admin', label: 'Analytics', icon: BarChart3, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/stock', label: 'Stock', icon: Boxes },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
  { to: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
  { to: '/admin/team', label: 'Team', icon: Users },
];

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<Auth />} />
        <Route element={<Site />}>
          <Route path="/" element={<Landing />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/deals" element={<Deals />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Guard><Checkout /></Guard>} />
          <Route path="/orders" element={<Guard><Orders /></Guard>} />
          <Route path="/order/:id" element={<Guard><OrderDetail /></Guard>} />
          <Route path="/track" element={<TrackOrder />} />
          {(['about', 'faq', 'delivery', 'returns', 'contact'] as const).map(k => <Route key={k} path={'/' + k} element={<Info page={k} />} />)}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="/staff" element={<Guard roles={['staff', 'admin']}><Dash title="Staff" nav={staffNav} /></Guard>}>
          <Route index element={<DashOrders />} />
          <Route path="products" element={<DashProducts />} />
          <Route path="stock" element={<DashStock />} />
        </Route>
        <Route path="/admin" element={<Guard roles={['admin']}><Dash title="Owner" nav={adminNav} /></Guard>}>
          <Route index element={<Analytics />} />
          <Route path="orders" element={<DashOrders />} />
          <Route path="products" element={<DashProducts />} />
          <Route path="stock" element={<DashStock />} />
          <Route path="coupons" element={<DashCoupons />} />
          <Route path="payments" element={<DashPayments />} />
          <Route path="refunds" element={<DashRefunds />} />
          <Route path="team" element={<Team />} />
        </Route>
      </Routes>
    </>
  );
}
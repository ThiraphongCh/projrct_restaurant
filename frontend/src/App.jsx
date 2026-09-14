import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Cart from './components/Cart';
import CustomerMenu from './pages/CustomerMenu';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import TableStatus from './pages/TableStatus';
import Payment from './pages/Payment';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenuManager from './pages/AdminMenuManager';
import SalesReports from './pages/SalesReports';
import { useLanguage } from './context/LanguageContext';
import { RESTAURANT } from './constants';

export default function App() {
  const { lang } = useLanguage();

  useEffect(() => {
    document.title = lang === 'th' ? RESTAURANT.nameTh : RESTAURANT.nameEn;
  }, [lang]);

  return (
    <div className="app-container">
      <Navbar />
      <main className="container py-4">
        <Routes>
          {/* Customer routes */}
          <Route path="/" element={<CustomerMenu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<OrderConfirmation />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/tables" element={<TableStatus />} />
          <Route path="/admin/menu" element={<AdminMenuManager />} />
          <Route path="/admin/payment/:orderId" element={<Payment />} />
          <Route path="/admin/reports" element={<SalesReports />} />
        </Routes>
      </main>
    </div>
  );
}

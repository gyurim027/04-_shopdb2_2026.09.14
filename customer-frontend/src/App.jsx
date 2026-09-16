import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MyPage from './pages/MyPage'
import AddressesPage from './pages/AddressesPage'
import OrdersPage from './pages/OrdersPage'
import OrderDetailPage from './pages/OrderDetailPage'
import RefundsPage from './pages/RefundsPage'
import SupportPage from './pages/SupportPage'
import InquiryDetailPage from './pages/InquiryDetailPage'
import AiChatPage from './pages/AiChatPage'
import PoliciesPage from './pages/PoliciesPage'
import NotFoundPage from './pages/NotFoundPage'

const P = ({ children }) => <ProtectedRoute>{children}</ProtectedRoute>

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="mypage" element={<P><MyPage /></P>} />
        <Route path="addresses" element={<P><AddressesPage /></P>} />
        <Route path="orders" element={<P><OrdersPage /></P>} />
        <Route path="orders/:orderId" element={<P><OrderDetailPage /></P>} />
        <Route path="refunds" element={<P><RefundsPage /></P>} />
        <Route path="support" element={<P><SupportPage /></P>} />
        <Route path="support/:inquiryId" element={<P><InquiryDetailPage /></P>} />
        <Route path="ai" element={<P><AiChatPage /></P>} />
        <Route path="policies" element={<PoliciesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import RequireSellerAuth from './components/RequireSellerAuth'
import SellerLayout from './layouts/SellerLayout'
import CartInsightsPage from './pages/CartInsightsPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import LoginPage from './pages/LoginPage'
import OrdersPage from './pages/OrdersPage'
import ProductsPage from './pages/ProductsPage'
import RefundsPage from './pages/RefundsPage'
import ReturnsPage from './pages/ReturnsPage'
import SalesPage from './pages/SalesPage'
import SellerInfoPage from './pages/SellerInfoPage'

function App() {
  return (
    <Routes>
      {/* 로그인 화면은 인증 없이 접근할 수 있습니다. */}
      <Route path="/login" element={<LoginPage />} />

      {/* 아래 경로는 SELLER 역할을 가진 로그인 사용자만 접근합니다. */}
      <Route element={<RequireSellerAuth />}>
        <Route element={<SellerLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/cart-insights" element={<CartInsightsPage />}/>
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/orders" element={<OrdersPage />} />

          {/* 고객이 신청한 상품 반품을 회수하고 검수하는 화면입니다. */}
          <Route path="/returns" element={<ReturnsPage />} />

          {/* 승인된 환불 요청과 환불 금액을 확인하는 화면입니다. */}
          <Route path="/refunds" element={<RefundsPage />} />

          <Route path="/sales" element={<SalesPage />} />
          <Route path="/info" element={<SellerInfoPage />} />
        </Route>
      </Route>

      {/* 정의되지 않은 주소는 로그인 화면으로 이동합니다. */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
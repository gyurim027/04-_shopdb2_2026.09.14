import { Navigate, Route, Routes } from 'react-router-dom'

import './App.css'
import SellerLayout from './layouts/SellerLayout'
import DashboardPage from './pages/DashboardPage'
import ProductsPage from './pages/ProductsPage'
import InventoryPage from './pages/InventoryPage'
import OrdersPage from './pages/OrdersPage'
import RefundsPage from './pages/RefundsPage'
import SalesPage from './pages/SalesPage'
import SellerInfoPage from './pages/SellerInfoPage'

function App() {
  return (
    <Routes>
      {/* 아래 페이지들은 동일한 셀러 레이아웃을 공유합니다. */}
      <Route element={<SellerLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/refunds" element={<RefundsPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/info" element={<SellerInfoPage />} />

        {/* 존재하지 않는 주소는 대시보드로 이동시킵니다. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default App
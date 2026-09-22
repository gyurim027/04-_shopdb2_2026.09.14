import { NavLink, Outlet, useNavigate } from 'react-router-dom'

import { removeAccessToken } from '../services/authStorage'
import './SellerLayout.css'

// 각 메뉴에 실제 브라우저 주소를 연결합니다.
const menuItems = [
  { label: '대시보드', path: '/dashboard' },
  { label: '상품 관리', path: '/products' },
  { label: '재고 관리', path: '/inventory' },
  { label: '주문 관리', path: '/orders' },

  // 반품은 상품 회수와 검수를 처리하는 별도 업무입니다.
  { label: '반품 관리', path: '/returns' },

  // 환불은 금액 반환 요청을 확인하는 업무입니다.
  { label: '환불 관리', path: '/refunds' },

  { label: '매출', path: '/sales' },
  { label: '장바구니 분석', path: '/cart-insights' },
  { label: '내 정보', path: '/info' },
]

function SellerLayout() {
  // 코드에서 다른 페이지로 이동할 때 사용하는 함수입니다.
  const navigate = useNavigate()

  // 저장된 로그인 토큰을 삭제하고 로그인 화면으로 이동합니다.
  function handleLogout() {
    removeAccessToken()
    navigate('/login', { replace: true })
  }

  return (
    <div className="seller-layout">
      <aside className="seller-sidebar">
        <div className="seller-logo">
          <span className="seller-logo-mark">S</span>

          <div>
            <strong>Seller Console</strong>
            <span>shopdb2</span>
          </div>
        </div>

        <nav
          className="seller-navigation"
          aria-label="셀러 콘솔 메뉴"
        >
          {menuItems.map((menu) => (
            <NavLink
              className={({ isActive }) =>
                `seller-menu-item ${isActive ? 'is-active' : ''}`
              }
              to={menu.path}
              key={menu.path}
            >
              {menu.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="seller-main">
        <header className="seller-header">
          <div>
            <strong>셀러 관리 시스템</strong>
            <span>판매자 전용</span>
          </div>

          {/* 로그인 정보를 지우고 로그인 화면으로 이동합니다. */}
          <button
            className="seller-account-button"
            type="button"
            onClick={handleLogout}
          >
            로그아웃
          </button>
        </header>

        {/* 현재 URL과 일치하는 페이지가 이 위치에 표시됩니다. */}
        <main className="seller-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default SellerLayout
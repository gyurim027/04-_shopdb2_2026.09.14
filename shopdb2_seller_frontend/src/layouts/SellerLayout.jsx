import './SellerLayout.css'

// 셀러 MVP 메뉴 구조의 1차 메뉴명을 그대로 사용합니다.
const menuItems = [
  '대시보드',
  '상품 관리',
  '재고 관리',
  '주문 관리',
  '환불 관리',
  '매출',
  '내 정보',
]

function SellerLayout({ children }) {
  return (
    <div className="seller-layout">
      {/* 모든 셀러 화면에서 공통으로 사용하는 왼쪽 메뉴입니다. */}
      <aside className="seller-sidebar">
        <div className="seller-logo">
          <span className="seller-logo-mark">S</span>

          <div>
            <strong>Seller Console</strong>
            <span>shopdb2</span>
          </div>
        </div>

        <nav className="seller-navigation" aria-label="셀러 콘솔 메뉴">
          {menuItems.map((menu, index) => (
            <button
              className={`seller-menu-item ${index === 0 ? 'is-active' : ''}`}
              type="button"
              key={menu}
            >
              {menu}
            </button>
          ))}
        </nav>
      </aside>

      <div className="seller-main">
        {/* 화면이 바뀌어도 유지되는 공통 상단 영역입니다. */}
        <header className="seller-header">
          <div>
            <strong>셀러 관리 시스템</strong>
            <span>판매자 전용</span>
          </div>

          <button className="seller-account-button" type="button">
            판매자 계정
          </button>
        </header>

        {/* children 자리에 현재 선택된 페이지가 들어갑니다. */}
        <main className="seller-content">{children}</main>
      </div>
    </div>
  )
}

export default SellerLayout
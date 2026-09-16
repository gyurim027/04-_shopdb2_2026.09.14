import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bot, ChevronRight, Headphones, Search, ShoppingBag, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const onSearch = (e) => {
    e.preventDefault()
    navigate(`/products${keyword.trim() ? `?keyword=${encodeURIComponent(keyword.trim())}` : ''}`)
  }

  return (
    <div className="app-shell">
      <div className="utility-bar">
        <div className="container utility-inner">
          <span>ShopDB 고객몰</span>
          <div>
            {isLoggedIn ? <><span>{user?.user_name}님</span><button className="link-button" onClick={logout}>로그아웃</button></> : <><Link to="/login">로그인</Link><Link to="/register">회원가입</Link></>}
            <Link to="/support">고객센터</Link>
          </div>
        </div>
      </div>
      <header className="main-header">
        <div className="container header-inner">
          <Link to="/" className="brand"><span>SHOP</span><b>DB</b></Link>
          <form className="search-box" onSubmit={onSearch}>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="찾고 싶은 상품을 검색해보세요" />
            <button aria-label="검색"><Search size={22} /></button>
          </form>
          <div className="header-actions">
            <Link to="/ai"><Bot size={23} /><span>AI 도우미</span></Link>
            <Link to="/mypage"><UserRound size={23} /><span>마이페이지</span></Link>
          </div>
        </div>
        <nav className="category-nav">
          <div className="container nav-inner">
            <NavLink to="/products" className="all-products"><ShoppingBag size={18} />전체상품</NavLink>
            <NavLink to="/products">추천상품</NavLink>
            <NavLink to="/orders">주문조회</NavLink>
            <NavLink to="/refunds">취소/환불</NavLink>
            <NavLink to="/support"><Headphones size={17} />고객센터</NavLink>
          </div>
        </nav>
      </header>
      <main><Outlet /></main>
      <footer className="footer">
        <div className="container footer-grid">
          <div><div className="brand footer-brand"><span>SHOP</span><b>DB</b></div><p>팀 프로젝트 고객용 쇼핑 프론트엔드</p></div>
          <div><strong>쇼핑</strong><Link to="/products">전체상품</Link><Link to="/orders">주문내역</Link><Link to="/refunds">환불내역</Link></div>
          <div><strong>고객지원</strong><Link to="/support">1:1 문의</Link><Link to="/policies">이용 정책</Link><Link to="/ai">AI 챗봇</Link></div>
        </div>
        <div className="container footer-bottom">© 2026 ShopDB Team Project.</div>
      </footer>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Apple,
  Baby,
  BookOpen,
  Bot,
  Car,
  ChevronRight,
  CookingPot,
  Dumbbell,
  HeartPulse,
  Lamp,
  Laptop,
  Menu,
  MonitorSmartphone,
  PackageSearch,
  PawPrint,
  Puzzle,
  Search,
  ShoppingCart,
  Shirt,
  Sparkles,
  SprayCan,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { customerApi } from '../api/customer'
import { CATEGORY_GROUPS, getCategoryGroup } from '../utils/categoryGroups'

const GROUP_ICONS = {
  shirt: Shirt,
  sparkles: Sparkles,
  baby: Baby,
  apple: Apple,
  cookingPot: CookingPot,
  sprayCan: SprayCan,
  lamp: Lamp,
  monitorSmartphone: MonitorSmartphone,
  laptop: Laptop,
  dumbbell: Dumbbell,
  car: Car,
  bookOpen: BookOpen,
  puzzle: Puzzle,
  pawPrint: PawPrint,
  heartPulse: HeartPulse,
}

export default function Layout() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [searchGroupId, setSearchGroupId] = useState('all')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [activeGroupId, setActiveGroupId] = useState(CATEGORY_GROUPS[0].id)
  const closeTimer = useRef(null)

  const activeGroup = getCategoryGroup(activeGroupId) || CATEGORY_GROUPS[0]

  useEffect(() => {
    if (location.pathname !== '/products') {
      setKeyword('')
      setSearchGroupId('all')
      return
    }

    const params = new URLSearchParams(location.search)
    setKeyword(params.get('keyword') || '')
    const groupId = params.get('group') || ''
    setSearchGroupId(getCategoryGroup(groupId) ? groupId : 'all')
  }, [location.pathname, location.search])

  useEffect(() => {
    setCategoryOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    let active = true

    const loadCartCount = async () => {
      if (!isLoggedIn) {
        if (active) setCartCount(0)
        return
      }

      try {
        const cart = await customerApi.getCart()
        if (active) setCartCount(Number(cart?.total_item_count || 0))
      } catch {
        if (active) setCartCount(0)
      }
    }

    loadCartCount()
    window.addEventListener('shopdb2:cart-updated', loadCartCount)

    return () => {
      active = false
      window.removeEventListener('shopdb2:cart-updated', loadCartCount)
    }
  }, [isLoggedIn, location.pathname])

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  const onSearch = (e) => {
    e.preventDefault()
    const value = keyword.trim()
    const params = new URLSearchParams()

    if (searchGroupId !== 'all') params.set('group', searchGroupId)
    if (value) params.set('keyword', value)

    const query = params.toString()
    navigate(`/products${query ? `?${query}` : ''}`)
  }

  const openCategories = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setCategoryOpen(true)
  }

  const scheduleCloseCategories = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setCategoryOpen(false), 120)
  }

  const closeCategories = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    setCategoryOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="utility-bar">
        <div className="container utility-inner">
          <div className="utility-left">
            <Link to="/policies">이용안내</Link>
            <Link to="/support">고객센터</Link>
          </div>
          <div>
            {isLoggedIn ? (
              <>
                <span>{user?.user_name || '고객'}님</span>
                <button className="link-button" onClick={logout}>로그아웃</button>
              </>
            ) : (
              <>
                <Link to="/register">회원가입</Link>
                <Link to="/login">로그인</Link>
              </>
            )}
            <Link to="/cart">장바구니</Link>
            <Link to="/orders">주문목록</Link>
          </div>
        </div>
      </div>

      <header className="main-header">
        <div className="container commerce-header-row">
          <button
            type="button"
            className={`category-launch ${categoryOpen ? 'is-open' : ''}`}
            aria-label="전체 카테고리"
            aria-expanded={categoryOpen}
            onMouseEnter={openCategories}
            onMouseLeave={scheduleCloseCategories}
            onFocus={openCategories}
            onClick={() => setCategoryOpen((open) => !open)}
          >
            <Menu size={28} />
            <span>카테고리</span>
          </button>

          <Link to="/" className="brand commerce-brand" aria-label="ShopDB 홈">
            <span>SHOP</span><b>DB</b>
          </Link>

          <form className="search-box commerce-search" onSubmit={onSearch}>
            <select
              aria-label="검색 카테고리"
              value={searchGroupId}
              onChange={(e) => setSearchGroupId(e.target.value)}
            >
              <option value="all">전체</option>
              {CATEGORY_GROUPS.map((group) => (
                <option key={group.id} value={group.id}>{group.label}</option>
              ))}
            </select>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="찾고 싶은 상품을 검색해보세요!"
              aria-label="상품 검색어"
            />
            <button aria-label="검색"><Search size={23} /></button>
          </form>

          <div className="header-actions commerce-actions">
            <Link to="/mypage"><UserRound size={27} /><span>마이페이지</span></Link>
            <Link to="/cart" className="header-cart-link">
              <span className="header-cart-icon"><ShoppingCart size={27} />{cartCount > 0 && <b>{cartCount > 99 ? '99+' : cartCount}</b>}</span>
              <span>장바구니</span>
            </Link>
            <Link to="/orders"><PackageSearch size={27} /><span>주문목록</span></Link>
          </div>
        </div>

        <nav className="category-nav commerce-quick-nav">
          <div className="container nav-inner commerce-nav-offset">
            <NavLink to="/products">전체상품</NavLink>
            <NavLink to="/products?discount=1&sort=discount">할인상품</NavLink>
            <NavLink to="/cart">장바구니</NavLink>
            <NavLink to="/orders">주문조회</NavLink>
            <NavLink to="/refunds">취소/환불</NavLink>
            <NavLink to="/returns">반품</NavLink>
            <NavLink to="/support">고객센터</NavLink>
            <NavLink to="/policies">이용정책</NavLink>
            <NavLink to="/ai" className="quiet-ai-link"><Bot size={15} /> 쇼핑도우미</NavLink>
          </div>
        </nav>

        {categoryOpen && (
          <div
            className="category-mega-layer"
            onMouseEnter={openCategories}
            onMouseLeave={scheduleCloseCategories}
          >
            <div className="container category-mega-container">
              <div className="category-mega-menu" role="navigation" aria-label="상품 카테고리">
                <div className="category-mega-primary">
                  <Link className="category-mega-all" to="/products" onClick={closeCategories}>
                    전체상품 <ChevronRight size={14} />
                  </Link>
                  {CATEGORY_GROUPS.map((group) => {
                    const Icon = GROUP_ICONS[group.icon] || Shirt
                    return (
                      <Link
                        key={group.id}
                        to={`/products?group=${encodeURIComponent(group.id)}`}
                        className={activeGroup.id === group.id ? 'active' : ''}
                        onMouseEnter={() => setActiveGroupId(group.id)}
                        onFocus={() => setActiveGroupId(group.id)}
                        onClick={closeCategories}
                      >
                        <span className="category-mega-label"><Icon size={18} />{group.label}</span>
                        <ChevronRight size={14} />
                      </Link>
                    )
                  })}
                </div>

                <div className="category-mega-secondary">
                  <div className="category-mega-secondary-head">
                    <strong>{activeGroup.label}</strong>
                    <Link to={`/products?group=${encodeURIComponent(activeGroup.id)}`} onClick={closeCategories}>전체보기</Link>
                  </div>
                  <div className="category-mega-subgrid">
                    {activeGroup.subs.map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/products?group=${encodeURIComponent(activeGroup.id)}&sub=${encodeURIComponent(sub.id)}`}
                        onClick={closeCategories}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                  <div className="category-mega-hint">
                    <span>{activeGroup.label}</span>
                    <strong>원하는 상품을 빠르게 찾아보세요</strong>
                    <p>비슷한 상품군은 하나로 묶고, 세부 카테고리는 오른쪽에서 선택할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main><Outlet /></main>

      <footer className="footer commerce-footer">
        <div className="container footer-link-row">
          <Link to="/policies">이용약관</Link>
          <Link to="/policies">개인정보 처리방침</Link>
          <Link to="/support">고객센터</Link>
          <Link to="/cart">장바구니</Link>
          <Link to="/orders">주문조회</Link>
          <Link to="/refunds">취소/환불</Link>
          <Link to="/returns">반품</Link>
        </div>
        <div className="container footer-company-row">
          <div className="brand footer-brand"><span>SHOP</span><b>DB</b></div>
          <div>
            <strong>ShopDB Customer Store</strong>
            <p>상품 조회부터 주문, 결제, 환불, 고객문의까지 한 곳에서 이용할 수 있습니다.</p>
            <small>© 2026 ShopDB Team Project. All rights reserved.</small>
          </div>
        </div>
      </footer>
    </div>
  )
}

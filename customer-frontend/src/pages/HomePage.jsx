import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bot,
  ChevronLeft,
  ChevronRight,
  Headphones,
  PackageCheck,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import ProductCard from '../components/ProductCard'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

function discountRate(product) {
  const regular = Number(product?.regular_price || 0)
  const sale = Number(product?.sale_price || 0)
  if (!regular || sale >= regular) return 0
  return Math.round(((regular - sale) / regular) * 100)
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeAd, setActiveAd] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [productResponse, categoryResponse] = await Promise.all([
        customerApi.getProducts({ size: 12 }),
        customerApi.getCategories(),
      ])
      setProducts(productResponse?.items || [])
      setCategories(Array.isArray(categoryResponse) ? categoryResponse : [])
    } catch (e) {
      setError(e.message || '상품 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const adProducts = useMemo(() => products.slice(0, 4), [products])
  const featured = adProducts[activeAd] || null

  useEffect(() => {
    if (adProducts.length <= 1) return undefined
    const timer = window.setInterval(() => setActiveAd((prev) => (prev + 1) % adProducts.length), 5000)
    return () => window.clearInterval(timer)
  }, [adProducts.length])

  useEffect(() => {
    if (activeAd >= adProducts.length && adProducts.length) setActiveAd(0)
  }, [activeAd, adProducts.length])

  const moveAd = (direction) => {
    if (!adProducts.length) return
    setActiveAd((prev) => (prev + direction + adProducts.length) % adProducts.length)
  }

  const adImage = resolveMediaUrl(featured?.main_image_url)
  const rate = discountRate(featured)

  return (
    <>
      <section className="product-ad-section">
        <div className="container">
          {featured ? (
            <div className="product-ad-shell">
              <div className="product-ad-copy">
                <span className="product-ad-badge"><Sparkles size={15} /> 오늘의 추천 상품</span>
                <span className="product-ad-category">{featured.category_name || 'SHOPDB PICK'}</span>
                <h1>{featured.product_name}</h1>
                <p>{featured.short_description || '지금 ShopDB에서 만나보세요.'}</p>
                <div className="product-ad-price">
                  {rate > 0 && <strong className="product-ad-discount">{rate}%</strong>}
                  <div>
                    {Number(featured.regular_price) > Number(featured.sale_price) && <span>{money(featured.regular_price)}원</span>}
                    <b>{money(featured.sale_price)}원</b>
                  </div>
                </div>
                <div className="product-ad-delivery"><Truck size={17} /> 빠르고 편리한 주문 · 결제</div>
                <div className="product-ad-actions">
                  <Link to={`/products/${featured.product_id}`} className="btn btn-primary">상품 보러가기 <ArrowRight size={18} /></Link>
                  <Link to="/products" className="btn btn-light">전체 상품</Link>
                </div>
              </div>

              <Link to={`/products/${featured.product_id}`} className="product-ad-visual" aria-label={`${featured.product_name} 상세보기`}>
                {adImage ? <img src={adImage} alt={featured.product_name} /> : <div className="product-ad-placeholder"><ShoppingBag size={74} /><span>SHOPDB</span><strong>{featured.product_name}</strong></div>}
              </Link>

              {adProducts.length > 1 && (
                <>
                  <button type="button" className="ad-arrow ad-arrow-left" onClick={() => moveAd(-1)} aria-label="이전 광고"><ChevronLeft /></button>
                  <button type="button" className="ad-arrow ad-arrow-right" onClick={() => moveAd(1)} aria-label="다음 광고"><ChevronRight /></button>
                  <div className="ad-dots">{adProducts.map((product, index) => <button type="button" key={product.product_id} className={index === activeAd ? 'active' : ''} onClick={() => setActiveAd(index)} aria-label={`${index + 1}번째 광고`} />)}</div>
                </>
              )}
            </div>
          ) : (
            <div className="product-ad-shell product-ad-loading">
              <div>
                <span className="product-ad-badge"><Sparkles size={15} /> SHOPDB 추천</span>
                <h1>{loading ? '오늘의 상품을 준비하고 있어요.' : '상품 광고를 불러오지 못했습니다.'}</h1>
                <p>{loading ? '판매 중인 상품을 불러오고 있습니다.' : '백엔드 서버 연결 상태를 확인한 뒤 다시 시도해주세요.'}</p>
                {error ? <button type="button" className="btn btn-primary" onClick={load}><RotateCcw size={17} /> 다시 불러오기</button> : <Link to="/products" className="btn btn-primary">상품 전체보기 <ArrowRight size={18} /></Link>}
              </div>
              <div className="product-ad-placeholder"><ShoppingBag size={74} /><span>SHOPDB</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="container shopping-shortcuts">
        <Link to="/products"><ShoppingBag /><div><strong>상품 둘러보기</strong><span>카테고리·검색으로 빠르게 찾기</span></div></Link>
        <Link to="/orders"><PackageCheck /><div><strong>주문 조회</strong><span>주문과 결제 상태 한눈에 확인</span></div></Link>
        <Link to="/support"><Headphones /><div><strong>1:1 고객센터</strong><span>문의 작성과 답변 확인</span></div></Link>
        <Link to="/ai"><Bot /><div><strong>AI 쇼핑 도우미</strong><span>상품·정책 질문을 빠르게 해결</span></div></Link>
      </section>

      <section className="container section">
        <div className="section-head">
          <div><span className="section-kicker">CATEGORY</span><h2>카테고리로 둘러보기</h2></div>
          <Link to="/products" className="text-link">전체상품 <ArrowRight size={16} /></Link>
        </div>
        <div className="category-chips">
          <Link to="/products" className="category-chip active">전체</Link>
          {categories.slice(0, 10).map((c) => <Link key={c.category_id} to={`/products?category=${c.category_id}`} className="category-chip">{c.category_name}</Link>)}
        </div>
      </section>

      <section className="container section">
        <div className="section-head">
          <div><span className="section-kicker">BEST PICKS</span><h2>지금 둘러볼 상품</h2><p>현재 판매 중인 상품을 빠르게 확인하세요.</p></div>
          <Link to="/products" className="text-link">더보기 <ArrowRight size={16} /></Link>
        </div>
        {error ? <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div> : loading ? <div className="loading-box">상품을 불러오는 중...</div> : products.length ? <div className="product-grid">{products.slice(0, 8).map((p) => <ProductCard key={p.product_id} product={p} />)}</div> : <div className="empty-box">현재 판매 중인 상품이 없습니다.</div>}
      </section>

      <section className="container service-banner">
        <div><span>고객센터</span><h2>궁금한 점이 있으신가요?</h2><p>1:1 문의와 AI 챗봇으로 빠르게 해결해보세요.</p></div>
        <div className="service-actions"><Link to="/support" className="btn btn-dark">1:1 문의</Link><Link to="/ai" className="btn btn-outline">AI 챗봇</Link></div>
      </section>
    </>
  )
}

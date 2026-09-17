import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  Headphones,
  PackageSearch,
  RotateCcw,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

function discountRate(product) {
  const regular = Number(product?.regular_price || 0)
  const sale = Number(product?.sale_price || 0)
  if (!regular || sale >= regular) return 0
  return Math.round(((regular - sale) / regular) * 100)
}

function ProductSection({ title, subtitle, products, link = '/products' }) {
  if (!products.length) return null
  return (
    <section className="container commerce-product-section">
      <div className="commerce-section-title">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <Link to={link}>전체보기 <ArrowRight size={15} /></Link>
      </div>
      <div className="product-grid commerce-product-grid">
        {products.slice(0, 10).map((product) => <ProductCard key={product.product_id} product={product} />)}
      </div>
    </section>
  )
}

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [activeAd, setActiveAd] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [imageFailed, setImageFailed] = useState(false)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const productResponse = await customerApi.getProducts({ size: 50 })
      setProducts(productResponse?.items || [])
    } catch (e) {
      setError(e.message || '상품 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const adProducts = useMemo(() => products.slice(0, 5), [products])
  const featured = adProducts[activeAd] || null
  const discoveryProducts = useMemo(() => products.slice(0, 10), [products])
  const suggestionProducts = useMemo(() => products.slice(10, 20).length ? products.slice(10, 20) : products.slice(0, 10), [products])
  const discountProducts = useMemo(
    () => [...products]
      .filter((product) => discountRate(product) > 0)
      .sort((a, b) => discountRate(b) - discountRate(a))
      .slice(0, 10),
    [products],
  )

  useEffect(() => {
    if (adProducts.length <= 1) return undefined
    const timer = window.setInterval(() => setActiveAd((prev) => (prev + 1) % adProducts.length), 5000)
    return () => window.clearInterval(timer)
  }, [adProducts.length])

  useEffect(() => {
    if (activeAd >= adProducts.length && adProducts.length) setActiveAd(0)
    setImageFailed(false)
  }, [activeAd, adProducts.length])

  const moveAd = (direction) => {
    if (!adProducts.length) return
    setActiveAd((prev) => (prev + direction + adProducts.length) % adProducts.length)
  }

  const adImage = resolveMediaUrl(featured?.main_image_url)
  const rate = discountRate(featured)

  return (
    <>
      <section className="commerce-home-top">
        <div className="container commerce-home-grid banner-only">
          <div className="commerce-banner-wrap">
            {featured ? (
              <div className="commerce-banner">
                <div className="commerce-banner-copy">
                  <span className="commerce-banner-label">오늘의 추천</span>
                  <h1>{featured.product_name}</h1>
                  <p>{featured.category_name || '추천 상품'}</p>
                  <div className="commerce-banner-price">
                    {rate > 0 && <b>{rate}%</b>}
                    <strong>{money(featured.sale_price)}원</strong>
                    {Number(featured.regular_price) > Number(featured.sale_price) && <del>{money(featured.regular_price)}원</del>}
                  </div>
                  <Link to={`/products/${featured.product_id}`} className="commerce-banner-button">상품 보기</Link>
                </div>
                <Link to={`/products/${featured.product_id}`} className="commerce-banner-image" aria-label={`${featured.product_name} 상세보기`}>
                  {adImage && !imageFailed ? (
                    <img src={adImage} alt={featured.product_name} onError={() => setImageFailed(true)} />
                  ) : (
                    <div className="commerce-banner-placeholder"><ShoppingBag size={62} /><span>SHOPDB</span></div>
                  )}
                </Link>

                {adProducts.length > 1 && (
                  <>
                    <button type="button" className="commerce-banner-arrow left" onClick={() => moveAd(-1)} aria-label="이전 배너"><ChevronLeft /></button>
                    <button type="button" className="commerce-banner-arrow right" onClick={() => moveAd(1)} aria-label="다음 배너"><ChevronRight /></button>
                    <div className="commerce-banner-dots">
                      {adProducts.map((product, index) => (
                        <button
                          type="button"
                          key={product.product_id}
                          className={index === activeAd ? 'active' : ''}
                          onClick={() => setActiveAd(index)}
                          aria-label={`${index + 1}번째 배너`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="commerce-banner empty-banner">
                <div className="commerce-banner-copy">
                  <span className="commerce-banner-label">SHOPDB</span>
                  <h1>{loading ? '상품을 불러오고 있습니다.' : '상품 정보를 확인할 수 없습니다.'}</h1>
                  <p>{loading ? '잠시만 기다려주세요.' : '백엔드 서버 상태를 확인해주세요.'}</p>
                  {error && <button type="button" className="commerce-banner-button" onClick={load}><RotateCcw size={15} /> 다시 불러오기</button>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container commerce-shortcut-row">
        <Link to="/products"><ShoppingBag /><span>전체상품</span></Link>
        <Link to="/products?discount=1&sort=discount"><Tag /><span>할인상품</span></Link>
        <Link to="/orders"><PackageSearch /><span>주문조회</span></Link>
        <Link to="/refunds"><CircleHelp /><span>취소/환불</span></Link>
        <Link to="/support"><Headphones /><span>고객센터</span></Link>
        <Link to="/policies"><FileText /><span>이용정책</span></Link>
      </section>

      {error && (
        <section className="container home-error-wrap">
          <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>
        </section>
      )}

      {loading ? (
        <section className="container commerce-product-section">
          <div className="commerce-section-title"><div><h2>오늘의 발견</h2><p>상품을 불러오고 있습니다.</p></div></div>
          <div className="product-grid commerce-product-grid">
            {Array.from({ length: 10 }, (_, index) => <ProductCardSkeleton key={index} />)}
          </div>
        </section>
      ) : (
        <>
          <ProductSection title="오늘의 발견" subtitle="오늘 ShopDB에서 둘러보기 좋은 상품을 모았습니다." products={discoveryProducts} />
          <ProductSection title="오늘의 쇼핑 제안" subtitle="다양한 카테고리의 상품을 계속 둘러보세요." products={suggestionProducts} />
          <ProductSection title="할인 상품" subtitle="현재 할인 중인 상품을 한눈에 확인하세요." products={discountProducts} link="/products?discount=1&sort=discount" />
        </>
      )}

      <section className="container commerce-help-strip">
        <div>
          <strong>고객센터</strong>
          <span>주문, 결제, 환불 관련 문의가 있다면 고객센터를 이용해주세요.</span>
        </div>
        <Link to="/support">1:1 문의하기 <ArrowRight size={15} /></Link>
      </section>
    </>
  )
}

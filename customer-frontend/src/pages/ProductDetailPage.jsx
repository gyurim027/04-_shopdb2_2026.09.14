import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronLeft, Minus, Plus, ShieldCheck, Truck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')

export default function ProductDetailPage() {
  const { productId } = useParams(); const navigate = useNavigate(); const { isLoggedIn } = useAuth()
  const [product, setProduct] = useState(null); const [variantId, setVariantId] = useState(''); const [qty, setQty] = useState(1); const [addresses, setAddresses] = useState([]); const [addressId, setAddressId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { customerApi.getProduct(productId).then((p) => { setProduct(p); const v = p.variants?.find((x) => x.available_quantity > 0) || p.variants?.[0]; if (v) setVariantId(String(v.variant_id)) }).catch((e) => setError(e.message)) }, [productId])
  useEffect(() => { if (isLoggedIn) customerApi.getAddresses().then((a) => { setAddresses(a); const d = a.find((x) => x.default_yn === 'Y') || a[0]; if (d) setAddressId(String(d.address_id)) }).catch(() => {}) }, [isLoggedIn])
  const variant = useMemo(() => product?.variants?.find((v) => String(v.variant_id) === String(variantId)), [product, variantId])
  const total = product ? (Number(product.sale_price) + Number(variant?.additional_price || 0)) * qty : 0
  const buy = async () => {
    if (!isLoggedIn) { navigate('/login', { state: { from: `/products/${productId}` } }); return }
    if (!addressId) { setError('배송지를 먼저 등록하거나 선택해주세요.'); return }
    if (!variantId) { setError('상품 옵션을 선택해주세요.'); return }
    setBusy(true); setError('')
    try {
      const order = await customerApi.createOrder({ address_id: Number(addressId), items: [{ product_id: Number(productId), variant_id: Number(variantId), quantity: qty }] })
      navigate(`/orders/${order.order_id}?pay=1`)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  if (error && !product) return <div className="container page-section"><div className="notice error">{error}</div></div>
  if (!product) return <div className="container page-section"><div className="loading-box">상품 정보를 불러오는 중...</div></div>
  const image = resolveMediaUrl(product.images?.[0]?.public_url)
  return <div className="container page-section">
    <Link className="back-link" to="/products"><ChevronLeft size={18} /> 상품 목록</Link>
    <div className="detail-grid">
      <div className="detail-image">{image ? <img src={image} alt={product.product_name} /> : <div className="image-placeholder large">상품 이미지</div>}</div>
      <div className="detail-info"><span className="product-category">{product.category_name}</span><h1>{product.product_name}</h1><p className="detail-description">{product.short_description}</p><div className="detail-price"><span>{money(product.regular_price)}원</span><strong>{money(product.sale_price)}원</strong></div>
        <div className="benefit-lines"><div><Truck /> 빠른 배송 지원</div><div><ShieldCheck /> 안전한 주문/결제</div></div>
        <div className="option-block"><label>옵션 선택</label><select value={variantId} onChange={(e) => setVariantId(e.target.value)}>{product.variants?.map((v) => <option key={v.variant_id} value={v.variant_id} disabled={v.available_quantity <= 0}>{[v.option_value1, v.option_value2].filter(Boolean).join(' / ') || v.sku_code} (+{money(v.additional_price)}원) · 재고 {v.available_quantity}</option>)}</select></div>
        {isLoggedIn && <div className="option-block"><label>배송지</label>{addresses.length ? <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>{addresses.map((a) => <option key={a.address_id} value={a.address_id}>{a.address_name || '배송지'} - {a.address1} {a.address2 || ''}</option>)}</select> : <Link to="/addresses" className="inline-cta">배송지를 먼저 등록해주세요</Link>}</div>}
        <div className="qty-row"><span>수량</span><div className="qty-control"><button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button><b>{qty}</b><button onClick={() => setQty(Math.min(variant?.available_quantity || 100, qty + 1))}><Plus size={16} /></button></div></div>
        <div className="order-total"><span>총 상품금액</span><strong>{money(total)}원</strong></div>{error && <div className="notice error compact">{error}</div>}
        <button className="btn btn-primary buy-button" onClick={buy} disabled={busy || variant?.available_quantity <= 0}><CheckCircle2 size={20} />{busy ? '주문 생성 중...' : '바로 구매하기'}</button>
        <p className="cart-note">※ 현재 백엔드 정책상 장바구니 없이 바로 주문하는 방식입니다.</p>
      </div>
    </div>
    <div className="description-card"><h2>상품 상세정보</h2><p>{product.description || '등록된 상세 설명이 없습니다.'}</p></div>
  </div>
}

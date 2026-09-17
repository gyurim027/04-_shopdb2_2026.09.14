import { useState } from 'react'
import { ImageOff, PackageX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { resolveMediaUrl } from '../api/client'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

function getKnownStock(product) {
  const raw = product?.available_quantity ?? product?.stock_quantity ?? product?.total_stock
  if (raw === undefined || raw === null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false)
  const image = resolveMediaUrl(product.main_image_url)
  const regular = Number(product.regular_price || 0)
  const sale = Number(product.sale_price || 0)
  const discounted = regular > sale && sale > 0
  const rate = discounted ? Math.round((1 - sale / regular) * 100) : 0
  const knownStock = getKnownStock(product)
  const soldOut = product.product_status === 'SOLD_OUT' || (knownStock !== null && knownStock <= 0)

  return (
    <Link to={`/products/${product.product_id}`} className={`product-card commerce-product-card ${soldOut ? 'sold-out' : ''}`}>
      <div className="product-image-wrap commerce-product-image-wrap">
        {image && !imageFailed ? (
          <img
            src={image}
            alt={product.product_name}
            className="product-image"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="image-placeholder"><ImageOff size={32} /><span>이미지 없음</span></div>
        )}
        {soldOut && <span className="soldout-overlay"><PackageX size={17} /> 품절</span>}
      </div>

      <div className="product-card-body commerce-product-body">
        <h3>{product.product_name}</h3>
        {discounted ? (
          <>
            <div className="commerce-list-price">
              <em>할인</em>
              <span>{money(regular)}원</span>
            </div>
            <div className="commerce-sale-price discounted-price">
              <b>{rate}%</b>
              <strong>{money(sale)}원</strong>
            </div>
          </>
        ) : (
          <div className="commerce-sale-price normal-price">
            <strong>{money(sale)}원</strong>
          </div>
        )}
        {soldOut && <div className="commerce-soldout-text">SOLD OUT</div>}
        {knownStock !== null && knownStock > 0 && knownStock <= 10 && <div className="commerce-stock-low">재고 {knownStock}개 남음</div>}
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card commerce-product-card skeleton-card" aria-hidden="true">
      <div className="skeleton skeleton-image" />
      <div className="product-card-body commerce-product-body">
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line short" />
        <div className="skeleton skeleton-price" />
      </div>
    </div>
  )
}

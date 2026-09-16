import { Link } from 'react-router-dom'
import { ImageOff } from 'lucide-react'
import { resolveMediaUrl } from '../api/client'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

export default function ProductCard({ product }) {
  const image = resolveMediaUrl(product.main_image_url)
  const discounted = Number(product.regular_price) > Number(product.sale_price)
  const rate = discounted ? Math.round((1 - Number(product.sale_price) / Number(product.regular_price)) * 100) : 0

  return (
    <Link to={`/products/${product.product_id}`} className="product-card">
      <div className="product-image-wrap">
        {image ? <img src={image} alt={product.product_name} className="product-image" /> : <div className="image-placeholder"><ImageOff size={36} /><span>상품 이미지</span></div>}
        {rate > 0 && <span className="discount-badge">{rate}%</span>}
      </div>
      <div className="product-card-body">
        <p className="product-category">{product.category_name || '상품'}</p>
        <h3>{product.product_name}</h3>
        {product.short_description && <p className="product-desc">{product.short_description}</p>}
        <div className="price-row">
          {discounted && <span className="regular-price">{money(product.regular_price)}원</span>}
          <strong>{money(product.sale_price)}원</strong>
        </div>
        <div className="delivery-line">무료배송 · 빠른배송</div>
      </div>
    </Link>
  )
}

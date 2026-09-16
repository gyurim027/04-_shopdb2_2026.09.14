import { useEffect, useState } from 'react'
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import ProductCard from '../components/ProductCard'

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const keyword = params.get('keyword') || ''
  const category = params.get('category') || ''
  const page = Number(params.get('page') || 1)
  const [input, setInput] = useState(keyword)

  useEffect(() => { customerApi.getCategories().then(setCategories).catch(() => setCategories([])) }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customerApi.getProducts({ page, size: 20, categoryId: category || undefined, keyword: keyword || undefined })
      setProducts(data.items || [])
      setTotal(data.total || 0)
    } catch (e) {
      setProducts([])
      setTotal(0)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, category, keyword])
  useEffect(() => { setInput(keyword) }, [keyword])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  return (
    <div className="container page-section">
      <div className="page-title"><span>SHOP</span><h1>전체 상품</h1><p>검색과 카테고리 필터로 원하는 상품을 찾아보세요.</p></div>
      <div className="catalog-layout">
        <aside className="filter-panel"><h3><SlidersHorizontal size={18} /> 카테고리</h3><button className={!category ? 'selected' : ''} onClick={() => update('category', '')}>전체 상품</button>{categories.map((c) => <button key={c.category_id} className={String(c.category_id) === category ? 'selected' : ''} onClick={() => update('category', String(c.category_id))}>{c.category_name}</button>)}</aside>
        <div className="catalog-main">
          <form className="catalog-search" onSubmit={(e) => { e.preventDefault(); update('keyword', input.trim()) }}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="상품명, 상품코드, 설명 검색" /><button><Search size={19} />검색</button></form>
          <div className="catalog-summary"><strong>{total.toLocaleString()}개</strong>의 상품{keyword && <span> · “{keyword}” 검색결과</span>}</div>
          {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}
          {loading ? <div className="loading-box">상품을 불러오는 중...</div> : products.length ? <div className="product-grid">{products.map((p) => <ProductCard key={p.product_id} product={p} />)}</div> : <div className="empty-box">검색 결과가 없습니다.</div>}
          <div className="pagination"><button disabled={page <= 1} onClick={() => update('page', String(page - 1))}>이전</button><span>{page}</span><button disabled={products.length < 20} onClick={() => update('page', String(page + 1))}>다음</button></div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { customerApi } from '../api/customer'
import ProductCard, { ProductCardSkeleton } from '../components/ProductCard'
import {
  CATEGORY_GROUPS,
  getCategoryGroup,
  getCategorySub,
  matchesGroup,
  matchesSubcategory,
} from '../utils/categoryGroups'

const PAGE_SIZE = 20

function rate(product) {
  const regular = Number(product?.regular_price || 0)
  const sale = Number(product?.sale_price || 0)
  if (!regular || sale >= regular) return 0
  return Math.round(((regular - sale) / regular) * 100)
}

function sortProducts(items, sort) {
  const copied = [...items]
  switch (sort) {
    case 'price-asc': return copied.sort((a, b) => Number(a.sale_price || 0) - Number(b.sale_price || 0))
    case 'price-desc': return copied.sort((a, b) => Number(b.sale_price || 0) - Number(a.sale_price || 0))
    case 'discount': return copied.sort((a, b) => rate(b) - rate(a))
    case 'name': return copied.sort((a, b) => String(a.product_name || '').localeCompare(String(b.product_name || ''), 'ko'))
    default: return copied
  }
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const keyword = params.get('keyword') || ''
  const category = params.get('category') || ''
  const groupId = params.get('group') || ''
  const subId = params.get('sub') || ''
  const sort = params.get('sort') || 'recommended'
  const discountOnly = params.get('discount') === '1'
  const page = Math.max(1, Number(params.get('page') || 1))
  const [input, setInput] = useState(keyword)

  const selectedGroup = getCategoryGroup(groupId)
  const selectedSub = getCategorySub(groupId, subId)

  useEffect(() => {
    customerApi.getCategories()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
  }, [])

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await customerApi.getProducts({
        page: 1,
        size: 100,
        categoryId: !groupId && category ? category : undefined,
        keyword: keyword || undefined,
      })
      setProducts(data.items || [])
    } catch (e) {
      setProducts([])
      setError(e.message || '상품을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [category, groupId, keyword])
  useEffect(() => { setInput(keyword) }, [keyword])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.set('page', '1')
    setParams(next)
  }

  const selectGroup = (id) => {
    const next = new URLSearchParams(params)
    if (id) next.set('group', id)
    else next.delete('group')
    next.delete('sub')
    next.delete('category')
    next.set('page', '1')
    setParams(next)
  }

  const grouped = useMemo(() => {
    let result = [...products]
    if (selectedGroup) result = result.filter((product) => matchesGroup(product.category_name, selectedGroup))
    if (selectedSub) result = result.filter((product) => matchesSubcategory(product, selectedSub))
    if (discountOnly) result = result.filter((product) => rate(product) > 0)
    return result
  }, [products, selectedGroup, selectedSub, discountOnly])

  const sorted = useMemo(() => sortProducts(grouped, sort), [grouped, sort])
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const shown = useMemo(() => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE), [sorted, safePage])
  const selectedCategory = categories.find((c) => String(c.category_id) === category)
  const hasFilter = Boolean(keyword || category || groupId || subId || discountOnly || (sort && sort !== 'recommended'))

  useEffect(() => {
    if (page > pageCount && !loading) update('page', String(pageCount))
  }, [page, pageCount, loading])

  const clearAll = () => {
    setInput('')
    setParams(new URLSearchParams())
  }

  const pages = useMemo(() => {
    const start = Math.max(1, safePage - 2)
    const end = Math.min(pageCount, start + 4)
    const adjustedStart = Math.max(1, end - 4)
    return Array.from({ length: end - adjustedStart + 1 }, (_, i) => adjustedStart + i)
  }, [safePage, pageCount])

  return (
    <div className="container page-section catalog-page">
      <div className="page-title commerce-page-title">
        <h1>{discountOnly ? '할인 상품' : (selectedSub?.label || selectedGroup?.label || '전체 상품')}</h1>
        <p>상품을 검색하거나 카테고리를 선택해보세요.</p>
      </div>

      <div className="catalog-layout">
        <aside className="filter-panel grouped-filter-panel">
          <h3><SlidersHorizontal size={18} /> 카테고리</h3>
          <button className={!groupId && !category ? 'selected' : ''} onClick={() => selectGroup('')}>전체 상품</button>
          {CATEGORY_GROUPS.map((group) => (
            <button
              key={group.id}
              className={groupId === group.id ? 'selected' : ''}
              onClick={() => selectGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </aside>

        <div className="catalog-main">
          {selectedGroup && (
            <div className="catalog-subcategory-row">
              <button className={!subId ? 'active' : ''} onClick={() => update('sub', '')}>전체</button>
              {selectedGroup.subs.map((sub) => (
                <button key={sub.id} className={subId === sub.id ? 'active' : ''} onClick={() => update('sub', sub.id)}>{sub.label}</button>
              ))}
            </div>
          )}

          <form className="catalog-search" onSubmit={(e) => { e.preventDefault(); update('keyword', input.trim()) }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="상품명, 상품코드, 설명 검색" />
            {input && <button type="button" className="catalog-clear-input" onClick={() => setInput('')} aria-label="검색어 지우기"><X size={16} /></button>}
            <button type="submit"><Search size={19} />검색</button>
          </form>

          <div className="catalog-toolbar">
            <div className="catalog-summary">
              <strong>{sorted.length.toLocaleString()}개</strong>의 상품
              {keyword && <span> · “{keyword}” 검색결과</span>}
              {selectedCategory && <span> · {selectedCategory.category_name}</span>}
              {selectedGroup && <span> · {selectedGroup.label}</span>}
              {selectedSub && <span> · {selectedSub.label}</span>}
            </div>
            <select className="sort-select" value={sort} onChange={(e) => update('sort', e.target.value)} aria-label="상품 정렬">
              <option value="recommended">추천순</option>
              <option value="price-asc">낮은 가격순</option>
              <option value="price-desc">높은 가격순</option>
              <option value="discount">할인율순</option>
              <option value="name">상품명순</option>
            </select>
          </div>

          {hasFilter && (
            <div className="active-filters">
              {keyword && <button type="button" onClick={() => update('keyword', '')}>검색: {keyword} <X size={13} /></button>}
              {selectedCategory && <button type="button" onClick={() => update('category', '')}>{selectedCategory.category_name} <X size={13} /></button>}
              {selectedGroup && <button type="button" onClick={() => selectGroup('')}>{selectedGroup.label} <X size={13} /></button>}
              {selectedSub && <button type="button" onClick={() => update('sub', '')}>{selectedSub.label} <X size={13} /></button>}
              {discountOnly && <button type="button" onClick={() => update('discount', '')}>할인 상품만 <X size={13} /></button>}
              {sort !== 'recommended' && <button type="button" onClick={() => update('sort', 'recommended')}>정렬 적용 중 <X size={13} /></button>}
              <button type="button" className="reset-filter" onClick={clearAll}>전체 초기화</button>
            </div>
          )}

          {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}

          {loading ? (
            <div className="product-grid">{Array.from({ length: 12 }, (_, i) => <ProductCardSkeleton key={i} />)}</div>
          ) : shown.length ? (
            <div className="product-grid">{shown.map((p) => <ProductCard key={p.product_id} product={p} />)}</div>
          ) : (
            <div className="empty-box catalog-empty">
              <strong>검색 결과가 없습니다.</strong>
              <span>검색어를 줄이거나 다른 카테고리를 선택해보세요.</span>
              <button type="button" className="btn btn-light" onClick={clearAll}>전체 상품 보기</button>
            </div>
          )}

          {!loading && shown.length > 0 && (
            <div className="pagination pagination-numbered">
              <button disabled={safePage <= 1} onClick={() => update('page', String(safePage - 1))}>이전</button>
              {pages.map((number) => <button key={number} className={number === safePage ? 'active' : ''} onClick={() => update('page', String(number))}>{number}</button>)}
              <button disabled={safePage >= pageCount} onClick={() => update('page', String(safePage + 1))}>다음</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

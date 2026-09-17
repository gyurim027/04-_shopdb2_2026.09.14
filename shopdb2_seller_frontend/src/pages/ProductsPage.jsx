import { useEffect, useMemo, useState } from 'react'

import {
  getSellerCategories,
  getSellerProducts,
} from '../services/sellerProductsService'
import './ProductsPage.css'

// 백엔드의 상품 상태 코드를 화면용 한글로 변환합니다.
const productStatusLabels = {
  READY: '준비중',
  SALE: '판매중',
  SOLD_OUT: '품절',
  STOPPED: '판매중지',
  DELETED: '삭제',
}

// 금액에 천 단위 쉼표와 원 단위를 표시합니다.
function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

// 등록일을 한국 날짜 형식으로 표시합니다.
function formatDate(value) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleDateString('ko-KR')
}

function ProductsPage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)

  // 검색창에 입력 중인 값과 실제 조회에 사용할 값을 분리합니다.
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [productStatus, setProductStatus] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // category_id로 카테고리 이름을 찾을 수 있는 객체를 만듭니다.
  const categoryNameMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((category) => [
          category.category_id,
          category.category_name,
        ]),
      ),
    [categories],
  )

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    let isActive = true

    async function loadProducts() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        // 상품 목록과 카테고리 목록을 동시에 불러옵니다.
        const [productData, categoryData] = await Promise.all([
          getSellerProducts({
            page,
            size: pageSize,
            productStatus,
            keyword: searchKeyword,
          }),
          getSellerCategories(),
        ])

        if (isActive) {
          setProducts(productData.items)
          setTotal(productData.total)
          setCategories(categoryData)
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      isActive = false
    }
  }, [page, productStatus, searchKeyword])

  function handleSearch(event) {
    event.preventDefault()

    // 새로운 검색은 첫 페이지부터 조회합니다.
    setPage(1)
    setSearchKeyword(keywordInput)
  }

  function handleStatusChange(event) {
    setPage(1)
    setProductStatus(event.target.value)
  }

  return (
    <section className="products-page">
      <div className="products-heading">
        <div>
          <h1>상품 관리</h1>
          <p>등록한 상품을 검색하고 판매 상태와 가격을 확인하세요.</p>
        </div>

        {/* 상품 등록 화면은 다음 단계에서 연결합니다. */}
        <button className="primary-button" type="button" disabled>
          상품 등록
        </button>
      </div>

      <section className="products-panel">
        <form className="products-toolbar" onSubmit={handleSearch}>
          <select
            aria-label="상품 상태"
            value={productStatus}
            onChange={handleStatusChange}
          >
            <option value="">전체 상태</option>
            <option value="READY">준비중</option>
            <option value="SALE">판매중</option>
            <option value="SOLD_OUT">품절</option>
            <option value="STOPPED">판매중지</option>
            <option value="DELETED">삭제</option>
          </select>

          <div className="products-search">
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="상품명 또는 상품코드 검색"
              aria-label="상품 검색어"
            />

            <button type="submit">검색</button>
          </div>
        </form>

        <div className="products-summary">
          <strong>전체 {total.toLocaleString('ko-KR')}개</strong>
          <span>페이지당 {pageSize}개</span>
        </div>

        {errorMessage && (
          <div className="products-message" role="alert">
            <strong>상품 목록을 불러오지 못했습니다.</strong>
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>상품코드</th>
                <th>상품명</th>
                <th>카테고리</th>
                <th>정상가</th>
                <th>판매가</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="7" className="products-table-message">
                    상품 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && !errorMessage && products.length === 0 && (
                <tr>
                  <td colSpan="7" className="products-table-message">
                    조건에 맞는 상품이 없습니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                products.map((product) => (
                  <tr key={product.product_id}>
                    <td>{product.product_code}</td>

                    <td>
                      <div className="product-name-cell">
                        <strong>{product.product_name}</strong>
                        <span>{product.short_description || '설명 없음'}</span>
                      </div>
                    </td>

                    <td>
                      {categoryNameMap[product.category_id] ||
                        `카테고리 ${product.category_id}`}
                    </td>

                    <td>{formatCurrency(product.regular_price)}</td>
                    <td>{formatCurrency(product.sale_price)}</td>

                    <td>
                      <span
                        className={`product-status-badge status-${product.product_status.toLowerCase()}`}
                      >
                        {productStatusLabels[product.product_status] ||
                          product.product_status}
                      </span>
                    </td>

                    <td>{formatDate(product.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="products-pagination">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((currentPage) => currentPage - 1)}
          >
            이전
          </button>

          <span>
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage((currentPage) => currentPage + 1)}
          >
            다음
          </button>
        </div>
      </section>
    </section>
  )
}

export default ProductsPage
import { useEffect, useMemo, useState } from 'react'

import ProductEditModal from '../components/ProductEditModal'
import ProductMediaModal from '../components/ProductMediaModal'
import ProductVariantModal from '../components/ProductVariantModal'
import {
  createSellerProduct,
  getSellerCategories,
  getSellerProducts,
} from '../services/sellerProductsService'
import './ProductsPage.css'

const productStatusLabels = {
  READY: '준비중',
  SALE: '판매중',
  SOLD_OUT: '품절',
  STOPPED: '판매중지',
  DELETED: '삭제',
}

const initialCreateForm = {
  categoryId: '',
  productCode: '',
  productName: '',
  shortDescription: '',
  description: '',
  regularPrice: '',
  salePrice: '',
  productStatus: 'READY',
}

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

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

  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [productStatus, setProductStatus] = useState('')

  const [page, setPage] = useState(1)
  const pageSize = 20

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(initialCreateForm)
  const [isCreating, setIsCreating] = useState(false)

  // 현재 수정할 상품을 저장합니다.
  const [editingProduct, setEditingProduct] = useState(null)
  // 옵션/SKU를 관리할 상품을 저장합니다.
  const [variantProduct, setVariantProduct] = useState(null)
  // 이미지와 첨부파일을 관리할 상품을 저장합니다.
  const [mediaProduct, setMediaProduct] = useState(null)
  // 미디어 단계에서 상품 정보 수정으로 돌아온 상태인지 구분합니다.
  const [returnToMediaAfterEdit, setReturnToMediaAfterEdit] =
    useState(false)

  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [createErrorMessage, setCreateErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
  }, [page, productStatus, searchKeyword, refreshKey])

  function handleSearch(event) {
    event.preventDefault()
    setPage(1)
    setSearchKeyword(keywordInput)
    setSuccessMessage('')
  }

  function handleStatusChange(event) {
    setPage(1)
    setProductStatus(event.target.value)
    setSuccessMessage('')
  }

  function openCreateForm() {
    setCreateForm(initialCreateForm)
    setCreateErrorMessage('')
    setSuccessMessage('')
    setIsCreateOpen(true)
  }

  function closeCreateForm() {
    setCreateForm(initialCreateForm)
    setCreateErrorMessage('')
    setIsCreateOpen(false)
  }

  function handleCreateChange(event) {
    const { name, value } = event.target

    setCreateForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setCreateErrorMessage('')
    setSuccessMessage('')

    const regularPrice = Number(createForm.regularPrice)
    const salePrice = Number(createForm.salePrice)

    if (
      !createForm.categoryId ||
      !createForm.productCode.trim() ||
      !createForm.productName.trim()
    ) {
      setCreateErrorMessage(
        '카테고리, 상품코드와 상품명을 모두 입력해 주세요.',
      )
      return
    }

    if (
      createForm.regularPrice === '' ||
      createForm.salePrice === '' ||
      regularPrice < 0 ||
      salePrice < 0
    ) {
      setCreateErrorMessage(
        '정상가와 판매가는 0 이상의 숫자로 입력해 주세요.',
      )
      return
    }

    if (salePrice > regularPrice) {
      setCreateErrorMessage(
        '판매가는 정상가보다 높을 수 없습니다.',
      )
      return
    }

    setIsCreating(true)

    try {
      const createdProduct = await createSellerProduct({
        category_id: Number(createForm.categoryId),
        product_code: createForm.productCode.trim(),
        product_name: createForm.productName.trim(),
        short_description:
          createForm.shortDescription.trim() || null,
        description: createForm.description.trim() || null,
        regular_price: regularPrice,
        sale_price: salePrice,
        product_status: createForm.productStatus,
      })

      setIsCreateOpen(false)
      setCreateForm(initialCreateForm)

      // 새 상품이 바로 보이도록 검색과 필터를 초기화합니다.
      setKeywordInput('')
      setSearchKeyword('')
      setProductStatus('')
      setPage(1)
      setRefreshKey((currentKey) => currentKey + 1)

      setSuccessMessage(
        `${createdProduct.product_name} 상품의 기본 정보가 등록되었습니다.`,
      )

      // 상품 ID가 만들어진 뒤 이미지와 첨부파일을 이어서 등록합니다.
      setMediaProduct(createdProduct)
    } catch (error) {
      setCreateErrorMessage(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  // 상품 수정이 완료되면 팝업을 닫고 목록을 다시 불러옵니다.
  function handleProductUpdated(updatedProduct) {
    setEditingProduct(null)
    setRefreshKey((currentKey) => currentKey + 1)

    if (returnToMediaAfterEdit) {
      setReturnToMediaAfterEdit(false)
      setMediaProduct(updatedProduct)
      setSuccessMessage('상품 기본 정보가 수정되었습니다.')
      return
    }

    setSuccessMessage(
      `${updatedProduct.product_name} 상품이 수정되었습니다.`,
    )
  }

  function handleProductEditClose() {
    if (returnToMediaAfterEdit && editingProduct) {
      setMediaProduct(editingProduct)
    }

    setReturnToMediaAfterEdit(false)
    setEditingProduct(null)
  }

  function handleMediaBack() {
    if (!mediaProduct) {
      return
    }

    setEditingProduct(mediaProduct)
    setMediaProduct(null)
    setReturnToMediaAfterEdit(true)
    setSuccessMessage('')
  }

  function handleMediaClose() {
    setMediaProduct(null)
    setReturnToMediaAfterEdit(false)
  }

  return (
    <section className="products-page">
      <div className="products-heading">
        <div>
          <h1>상품 관리</h1>
          <p>등록한 상품을 검색하고 판매 상태와 가격을 확인하세요.</p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={openCreateForm}
        >
          상품 등록
        </button>
      </div>

      {successMessage && (
        <div className="products-message is-success" role="status">
          {successMessage}
        </div>
      )}

      {isCreateOpen && (
        <div
          className="product-create-overlay"
          role="presentation"
          onMouseDown={closeCreateForm}
        >
          <form
            className="product-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-create-title"
            onSubmit={handleCreateSubmit}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="product-create-heading">
              <div>
                <h2 id="product-create-title">새 상품 등록</h2>
                <p>
                  기본 정보를 등록한 뒤 옵션과 이미지를 추가할 수
                  있습니다.
                </p>
              </div>

              <button
                className="product-create-close"
                type="button"
                aria-label="상품 등록 팝업 닫기"
                onClick={closeCreateForm}
              >
                ×
              </button>
            </div>

            {createErrorMessage && (
              <div
                className="products-message is-error"
                role="alert"
              >
                {createErrorMessage}
              </div>
            )}

            <div className="product-create-grid">
              <label>
                <span>카테고리 *</span>

                <select
                  name="categoryId"
                  value={createForm.categoryId}
                  onChange={handleCreateChange}
                >
                  <option value="">카테고리 선택</option>

                  {categories.map((category) => (
                    <option
                      value={category.category_id}
                      key={category.category_id}
                    >
                      {'— '.repeat(
                        Math.max(0, category.category_level - 1),
                      )}
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>상품코드 *</span>

                <input
                  type="text"
                  name="productCode"
                  maxLength="50"
                  value={createForm.productCode}
                  onChange={handleCreateChange}
                  placeholder="예: PROD-SELLER02-001"
                />
              </label>

              <label>
                <span>상품명 *</span>

                <input
                  type="text"
                  name="productName"
                  maxLength="200"
                  value={createForm.productName}
                  onChange={handleCreateChange}
                />
              </label>

              <label>
                <span>상품 상태 *</span>

                <select
                  name="productStatus"
                  value={createForm.productStatus}
                  onChange={handleCreateChange}
                >
                  <option value="READY">준비중</option>
                  <option value="SALE">판매중</option>
                  <option value="SOLD_OUT">품절</option>
                  <option value="STOPPED">판매중지</option>
                </select>
              </label>

              <label>
                <span>정상가 *</span>

                <input
                  type="number"
                  name="regularPrice"
                  min="0"
                  step="1"
                  value={createForm.regularPrice}
                  onChange={handleCreateChange}
                  placeholder="0"
                />
              </label>

              <label>
                <span>판매가 *</span>

                <input
                  type="number"
                  name="salePrice"
                  min="0"
                  step="1"
                  value={createForm.salePrice}
                  onChange={handleCreateChange}
                  placeholder="0"
                />
              </label>

              <label className="product-create-wide">
                <span>짧은 설명</span>

                <input
                  type="text"
                  name="shortDescription"
                  maxLength="1000"
                  value={createForm.shortDescription}
                  onChange={handleCreateChange}
                  placeholder="목록에 표시할 간단한 상품 설명"
                />
              </label>

              <label className="product-create-wide">
                <span>상세 설명</span>

                <textarea
                  name="description"
                  rows="6"
                  value={createForm.description}
                  onChange={handleCreateChange}
                  placeholder="상품의 상세 정보를 입력하세요."
                />
              </label>
            </div>

            <div className="product-create-footer">
              <button
                className="product-create-cancel"
                type="button"
                disabled={isCreating}
                onClick={closeCreateForm}
              >
                취소
              </button>

              <button
                className="product-create-submit"
                type="submit"
                disabled={isCreating}
              >
                {isCreating ? '등록 중' : '상품 등록'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 수정 버튼을 누르면 선택한 상품의 수정 팝업을 엽니다. */}

      {editingProduct && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          onClose={handleProductEditClose}
          onUpdated={handleProductUpdated}
        />
      )}

      {variantProduct && (
        <ProductVariantModal
          product={variantProduct}
          onClose={() => setVariantProduct(null)}
        />
      )}

      {mediaProduct && (
        <ProductMediaModal
          product={mediaProduct}
          onBack={handleMediaBack}
          onClose={handleMediaClose}
        />
      )}

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
              onChange={(event) =>
                setKeywordInput(event.target.value)
              }
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
          <div className="products-message is-error" role="alert">
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
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="8" className="products-table-message">
                    상품 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                products.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="products-table-message"
                    >
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
                        <span>
                          {product.short_description || '설명 없음'}
                        </span>
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
                        {productStatusLabels[
                          product.product_status
                        ] || product.product_status}
                      </span>
                    </td>

                    <td>{formatDate(product.created_at)}</td>

                    <td>
                      <div className="product-action-buttons">
                        <button
                          className="product-edit-button"
                          type="button"
                          onClick={() => {
                            setSuccessMessage('')
                            setReturnToMediaAfterEdit(false)
                            setEditingProduct(product)
                          }}
                        >
                          수정
                        </button>

                        <button
                          className="product-edit-button"
                          type="button"
                          onClick={() => {
                            setSuccessMessage('')
                            setVariantProduct(product)
                          }}
                        >
                          옵션 관리
                        </button>

                        <button
                          className="product-edit-button"
                          type="button"
                          onClick={() => {
                            setSuccessMessage('')
                            setMediaProduct(product)
                          }}
                        >
                          이미지·파일
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="products-pagination">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() =>
              setPage((currentPage) => currentPage - 1)
            }
          >
            이전
          </button>

          <span>
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() =>
              setPage((currentPage) => currentPage + 1)
            }
          >
            다음
          </button>
        </div>
      </section>
    </section>
  )
}

export default ProductsPage

import { useState } from 'react'

import { updateSellerProduct } from '../services/sellerProductsService'

function ProductEditModal({
  product,
  categories,
  onClose,
  onUpdated,
}) {
  const [form, setForm] = useState({
    categoryId: String(product.category_id),
    productName: product.product_name,
    shortDescription: product.short_description ?? '',
    description: product.description ?? '',
    regularPrice: String(product.regular_price),
    salePrice: String(product.sale_price),
    productStatus: product.product_status,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const regularPrice = Number(form.regularPrice)
    const salePrice = Number(form.salePrice)

    if (!form.categoryId || !form.productName.trim()) {
      setErrorMessage('카테고리와 상품명을 입력해 주세요.')
      return
    }

    if (
      form.regularPrice === '' ||
      form.salePrice === '' ||
      regularPrice < 0 ||
      salePrice < 0
    ) {
      setErrorMessage(
        '정상가와 판매가는 0 이상의 숫자로 입력해 주세요.',
      )
      return
    }

    if (salePrice > regularPrice) {
      setErrorMessage(
        '판매가는 정상가보다 높을 수 없습니다.',
      )
      return
    }

    setIsSaving(true)

    try {
      const updatedProduct = await updateSellerProduct(
        product.product_id,
        {
          category_id: Number(form.categoryId),
          product_name: form.productName.trim(),
          short_description: form.shortDescription.trim(),
          description: form.description.trim(),
          regular_price: regularPrice,
          sale_price: salePrice,
          product_status: form.productStatus,
        },
      )

      onUpdated(updatedProduct)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div
      className="product-create-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <form
        className="product-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-edit-title"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="product-create-heading">
          <div>
            <h2 id="product-edit-title">상품 수정</h2>
            <p>상품 기본 정보와 판매 상태를 변경합니다.</p>
          </div>

          <button
            className="product-create-close"
            type="button"
            aria-label="상품 수정 팝업 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {errorMessage && (
          <div className="products-message is-error" role="alert">
            {errorMessage}
          </div>
        )}

        <div className="product-create-grid">
          <label>
            <span>상품코드</span>
            <input
              type="text"
              value={product.product_code}
              disabled
            />
          </label>

          <label>
            <span>카테고리 *</span>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
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
            <span>상품명 *</span>
            <input
              type="text"
              name="productName"
              maxLength="200"
              value={form.productName}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>상품 상태 *</span>
            <select
              name="productStatus"
              value={form.productStatus}
              onChange={handleChange}
            >
              <option value="READY">준비중</option>
              <option value="SALE">판매중</option>
              <option value="SOLD_OUT">품절</option>
              <option value="STOPPED">판매중지</option>
              <option value="DELETED">삭제</option>
            </select>
          </label>

          <label>
            <span>정상가 *</span>
            <input
              type="number"
              name="regularPrice"
              min="0"
              step="1"
              value={form.regularPrice}
              onChange={handleChange}
            />
          </label>

          <label>
            <span>판매가 *</span>
            <input
              type="number"
              name="salePrice"
              min="0"
              step="1"
              value={form.salePrice}
              onChange={handleChange}
            />
          </label>

          <label className="product-create-wide">
            <span>짧은 설명</span>
            <input
              type="text"
              name="shortDescription"
              maxLength="1000"
              value={form.shortDescription}
              onChange={handleChange}
            />
          </label>

          <label className="product-create-wide">
            <span>상세 설명</span>
            <textarea
              name="description"
              rows="6"
              value={form.description}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className="product-create-footer">
          <button
            className="product-create-cancel"
            type="button"
            disabled={isSaving}
            onClick={onClose}
          >
            취소
          </button>

          <button
            className="product-create-submit"
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? '저장 중' : '변경사항 저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductEditModal
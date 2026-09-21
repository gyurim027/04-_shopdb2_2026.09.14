import { useEffect, useState } from 'react'

import {
  createSellerProductVariant,
  deactivateSellerProductVariant,
  getSellerProductVariants,
  updateSellerProductVariant,
} from '../services/sellerProductsService'

const initialForm = {
  skuCode: '',
  optionName1: '',
  optionValue1: '',
  optionName2: '',
  optionValue2: '',
  additionalPrice: '0',
}

function ProductVariantModal({ product, onClose }) {
  const [variants, setVariants] = useState([])
  const [form, setForm] = useState(initialForm)

  // null: 목록만 표시
  // create: 신규 옵션 추가
  // edit: 기존 옵션 수정
  const [formMode, setFormMode] = useState(null)
  const [editingVariantId, setEditingVariantId] = useState(null)
  const [processingVariantId, setProcessingVariantId] =
    useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isEditMode = formMode === 'edit'
  const isFormOpen = formMode !== null
  const isProcessing = processingVariantId !== null

  async function loadVariants() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await getSellerProductVariants(
        product.product_id,
      )

      setVariants(data)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    getSellerProductVariants(product.product_id)
      .then((data) => {
        if (isActive) {
          setVariants(data)
        }
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error.message)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [product.product_id])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function openCreateForm() {
    setFormMode('create')
    setEditingVariantId(null)
    setForm(initialForm)
    setErrorMessage('')
    setSuccessMessage('')
  }

  function openEditForm(variant) {
    setFormMode('edit')
    setEditingVariantId(variant.variant_id)
    setErrorMessage('')
    setSuccessMessage('')

    setForm({
      skuCode: variant.sku_code,
      optionName1: variant.option_name1 ?? '',
      optionValue1: variant.option_value1 ?? '',
      optionName2: variant.option_name2 ?? '',
      optionValue2: variant.option_value2 ?? '',
      additionalPrice: String(variant.additional_price ?? 0),
    })
  }

  function closeForm() {
    setFormMode(null)
    setEditingVariantId(null)
    setForm(initialForm)
    setErrorMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!form.skuCode.trim()) {
      setErrorMessage('옵션 관리코드를 입력해 주세요.')
      return
    }

    const additionalPrice = Number(form.additionalPrice)

    if (
      form.additionalPrice === '' ||
      Number.isNaN(additionalPrice)
    ) {
      setErrorMessage('추가금액을 숫자로 입력해 주세요.')
      return
    }

    setIsSaving(true)

    try {
      if (isEditMode) {
        await updateSellerProductVariant(editingVariantId, {
          option_name1: form.optionName1.trim() || null,
          option_value1: form.optionValue1.trim() || null,
          option_name2: form.optionName2.trim() || null,
          option_value2: form.optionValue2.trim() || null,
          additional_price: additionalPrice,
        })

        setSuccessMessage('옵션이 수정되었습니다.')
      } else {
        await createSellerProductVariant(product.product_id, {
          sku_code: form.skuCode.trim(),
          option_name1: form.optionName1.trim() || null,
          option_value1: form.optionValue1.trim() || null,
          option_name2: form.optionName2.trim() || null,
          option_value2: form.optionValue2.trim() || null,
          additional_price: additionalPrice,
        })

        setSuccessMessage('새 옵션이 추가되었습니다.')
      }

      setFormMode(null)
      setEditingVariantId(null)
      setForm(initialForm)

      await loadVariants()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 사용 중인 옵션을 비활성화합니다.
  async function handleDeactivate(variant) {
    const confirmed = window.confirm(
      `${variant.sku_code} 옵션을 비활성화하시겠습니까?\n비활성화 후에는 신규 판매에 사용할 수 없습니다.`,
    )

    if (!confirmed) {
      return
    }

    setProcessingVariantId(variant.variant_id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deactivateSellerProductVariant(variant.variant_id)

      if (editingVariantId === variant.variant_id) {
        setFormMode(null)
        setEditingVariantId(null)
        setForm(initialForm)
      }

      setSuccessMessage('옵션이 비활성화되었습니다.')
      await loadVariants()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingVariantId(null)
    }
  }

  // 비활성 옵션을 다시 사용할 수 있는 상태로 변경합니다.
  async function handleReactivate(variant) {
    setProcessingVariantId(variant.variant_id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateSellerProductVariant(variant.variant_id, {
        active_yn: 'Y',
      })

      setSuccessMessage('옵션이 다시 활성화되었습니다.')
      await loadVariants()
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingVariantId(null)
    }
  }

  return (
    <div
      className="product-create-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="product-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-variant-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="product-create-heading">
          <div>
            <h2 id="product-variant-title">옵션 관리</h2>

            <p>
              {product.product_name} 상품의 옵션을 관리합니다.
            </p>
          </div>

          <button
            className="product-create-close"
            type="button"
            aria-label="옵션 관리 팝업 닫기"
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

        {successMessage && (
          <div
            className="products-message is-success"
            role="status"
          >
            {successMessage}
          </div>
        )}

        <div className="variant-section-header">
          <div>
            <h3>등록된 옵션</h3>

            <p>
              색상·사이즈 등 판매 중인 옵션을 확인하고
              수정할 수 있습니다.
            </p>
          </div>

          {!isFormOpen && (
            <button
              className="product-create-submit variant-add-button"
              type="button"
              disabled={isProcessing}
              onClick={openCreateForm}
            >
              옵션 추가
            </button>
          )}
        </div>

        {isFormOpen && (
          <form
            className="variant-form-panel"
            onSubmit={handleSubmit}
          >
            <div className="variant-form-heading">
              <div>
                <h3>
                  {isEditMode ? '옵션 수정' : '새 옵션 추가'}
                </h3>

                <p>
                  {isEditMode
                    ? '선택한 옵션의 구성과 추가금액을 수정합니다.'
                    : '새로운 옵션 조합과 관리코드를 입력합니다.'}
                </p>
              </div>
            </div>

            <div className="product-create-grid">
              <label>
                <span>옵션 관리코드 (SKU) *</span>

                <input
                  type="text"
                  name="skuCode"
                  maxLength="100"
                  value={form.skuCode}
                  onChange={handleChange}
                  placeholder="예: BLACK-L"
                  readOnly={isEditMode}
                />

                <small className="variant-field-help">
                  {isEditMode
                    ? '등록된 관리코드는 수정할 수 없습니다.'
                    : '옵션 조합을 구분하는 고유 코드를 입력하세요.'}
                </small>
              </label>

              <label>
                <span>추가금액</span>

                <input
                  type="number"
                  name="additionalPrice"
                  step="1"
                  value={form.additionalPrice}
                  onChange={handleChange}
                />

                <small className="variant-field-help">
                  기본 판매가에 추가되는 금액입니다.
                </small>
              </label>

              <label>
                <span>옵션명 1</span>

                <input
                  type="text"
                  name="optionName1"
                  maxLength="100"
                  value={form.optionName1}
                  onChange={handleChange}
                  placeholder="예: 색상"
                />
              </label>

              <label>
                <span>옵션값 1</span>

                <input
                  type="text"
                  name="optionValue1"
                  maxLength="100"
                  value={form.optionValue1}
                  onChange={handleChange}
                  placeholder="예: 블랙"
                />
              </label>

              <label>
                <span>옵션명 2</span>

                <input
                  type="text"
                  name="optionName2"
                  maxLength="100"
                  value={form.optionName2}
                  onChange={handleChange}
                  placeholder="예: 사이즈"
                />
              </label>

              <label>
                <span>옵션값 2</span>

                <input
                  type="text"
                  name="optionValue2"
                  maxLength="100"
                  value={form.optionValue2}
                  onChange={handleChange}
                  placeholder="예: L"
                />
              </label>
            </div>

            <div className="product-create-footer">
              <button
                className="product-create-cancel"
                type="button"
                disabled={isSaving}
                onClick={closeForm}
              >
                취소
              </button>

              <button
                className="product-create-submit"
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? '저장 중' : '저장'}
              </button>
            </div>
          </form>
        )}

        <div className="products-table-wrapper variant-table-wrapper">
          <table className="products-table product-variant-table">
            <thead>
              <tr>
                <th>옵션 관리코드</th>
                <th>옵션 1</th>
                <th>옵션 2</th>
                <th>추가금액</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td
                    colSpan="6"
                    className="products-table-message"
                  >
                    옵션을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && variants.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="products-table-message"
                  >
                    등록된 옵션이 없습니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                variants.map((variant) => (
                  <tr
                    className={[
                      editingVariantId === variant.variant_id
                        ? 'is-editing'
                        : '',
                      variant.active_yn !== 'Y'
                        ? 'is-inactive'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={variant.variant_id}
                  >
                    <td>{variant.sku_code}</td>

                    <td>
                      {variant.option_name1
                        ? `${variant.option_name1}: ${
                            variant.option_value1 ?? '—'
                          }`
                        : '—'}
                    </td>

                    <td>
                      {variant.option_name2
                        ? `${variant.option_name2}: ${
                            variant.option_value2 ?? '—'
                          }`
                        : '—'}
                    </td>

                    <td>
                      {Number(
                        variant.additional_price ?? 0,
                      ).toLocaleString('ko-KR')}
                      원
                    </td>

                    <td>
                      <span
                        className={
                          variant.active_yn === 'Y'
                            ? 'variant-status is-active'
                            : 'variant-status is-inactive'
                        }
                      >
                        {variant.active_yn === 'Y'
                          ? '사용 중'
                          : '비활성'}
                      </span>
                    </td>

                    <td>
                      <div className="variant-row-actions">
                        {variant.active_yn === 'Y' ? (
                          <>
                            <button
                              className="product-edit-button"
                              type="button"
                              disabled={
                                isSaving || isProcessing
                              }
                              onClick={() =>
                                openEditForm(variant)
                              }
                            >
                              수정
                            </button>

                            <button
                              className="variant-deactivate-button"
                              type="button"
                              disabled={
                                isSaving || isProcessing
                              }
                              onClick={() =>
                                handleDeactivate(variant)
                              }
                            >
                              {processingVariantId ===
                              variant.variant_id
                                ? '처리 중'
                                : '비활성화'}
                            </button>
                          </>
                        ) : (
                          <button
                            className="variant-reactivate-button"
                            type="button"
                            disabled={isSaving || isProcessing}
                            onClick={() =>
                              handleReactivate(variant)
                            }
                          >
                            {processingVariantId ===
                            variant.variant_id
                              ? '처리 중'
                              : '재활성화'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ProductVariantModal
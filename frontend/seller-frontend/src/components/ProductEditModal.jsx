import { useEffect, useState } from 'react'

import {
  getSellerProductInventories,
  updateSellerInventory,
} from '../services/sellerInventoryService'
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

  // 상품에 속한 SKU별 재고를 저장합니다.
  const [inventories, setInventories] = useState([])
  const [isInventoryLoading, setIsInventoryLoading] =
    useState(true)

  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    getSellerProductInventories(product.product_id)
      .then((data) => {
        if (!isActive) {
          return
        }

        // 수정 가능한 값은 input에 사용하기 편하도록 문자열로 보관합니다.
        setInventories(
          data.map((inventory) => ({
            ...inventory,
            stock_quantity: String(
              inventory.stock_quantity,
            ),
            safety_stock: String(
              inventory.safety_stock,
            ),
          })),
        )
      })
      .catch((error) => {
        if (isActive) {
          setErrorMessage(error.message)
        }
      })
      .finally(() => {
        if (isActive) {
          setIsInventoryLoading(false)
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

  function handleInventoryChange(
    inventoryId,
    field,
    value,
  ) {
    setInventories((currentInventories) =>
      currentInventories.map((inventory) =>
        inventory.inventory_id === inventoryId
          ? {
              ...inventory,
              [field]: value,
            }
          : inventory,
      ),
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    const regularPrice = Number(form.regularPrice)
    const salePrice = Number(form.salePrice)

    if (!form.categoryId || !form.productName.trim()) {
      setErrorMessage(
        '카테고리와 상품명을 입력해 주세요.',
      )
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

    // 모든 SKU의 재고 입력값을 검사합니다.
    for (const inventory of inventories) {
      const stockQuantity = Number(
        inventory.stock_quantity,
      )
      const safetyStock = Number(
        inventory.safety_stock,
      )

      if (
        inventory.stock_quantity === '' ||
        inventory.safety_stock === '' ||
        !Number.isInteger(stockQuantity) ||
        !Number.isInteger(safetyStock) ||
        stockQuantity < 0 ||
        safetyStock < 0
      ) {
        setErrorMessage(
          `${inventory.sku_code}의 현재 재고와 안전 재고를 0 이상의 정수로 입력해 주세요.`,
        )
        return
      }

      if (
        stockQuantity <
        inventory.reserved_quantity
      ) {
        setErrorMessage(
          `${inventory.sku_code}의 현재 재고는 예약 재고 ${inventory.reserved_quantity}개보다 작게 설정할 수 없습니다.`,
        )
        return
      }
    }

    setIsSaving(true)

    try {
      // 상품 기본 정보 수정과 SKU별 재고 수정을 함께 요청합니다.
      const results = await Promise.all([
        updateSellerProduct(
          product.product_id,
          {
            category_id: Number(form.categoryId),
            product_name: form.productName.trim(),
            short_description:
              form.shortDescription.trim(),
            description: form.description.trim(),
            regular_price: regularPrice,
            sale_price: salePrice,
            product_status: form.productStatus,
          },
        ),

        ...inventories.map((inventory) =>
          updateSellerInventory(
            inventory.inventory_id,
            {
              stock_quantity: Number(
                inventory.stock_quantity,
              ),
              safety_stock: Number(
                inventory.safety_stock,
              ),
            },
          ),
        ),
      ])

      // Promise.all의 첫 번째 결과가 수정된 상품 정보입니다.
      const updatedProduct = results[0]

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
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="product-create-heading">
          <div>
            <h2 id="product-edit-title">
              상품 수정
            </h2>

            <p>
              상품 정보와 옵션별 재고를 수정합니다.
            </p>
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
          <div
            className="products-message is-error"
            role="alert"
          >
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
              <option value="">
                카테고리 선택
              </option>

              {categories.map((category) => (
                <option
                  value={category.category_id}
                  key={category.category_id}
                >
                  {'— '.repeat(
                    Math.max(
                      0,
                      category.category_level - 1,
                    ),
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
              <option value="READY">
                준비중
              </option>
              <option value="SALE">
                판매중
              </option>
              <option value="SOLD_OUT">
                품절
              </option>
              <option value="STOPPED">
                판매중지
              </option>
              <option value="DELETED">
                삭제
              </option>
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

          <section
            className="product-create-wide product-edit-inventory-section"
            aria-labelledby="product-inventory-title"
          >
            <div className="product-edit-inventory-heading">
              <h3 id="product-inventory-title">
                옵션별 재고
              </h3>
            </div>

            <div className="product-edit-inventory-table-wrap">
              <table className="product-edit-inventory-table">
                <thead>
                  <tr>
                    <th>옵션 관리코드</th>
                    <th className="is-numeric">
                      현재 재고
                    </th>
                    <th className="is-numeric">
                      예약 재고
                    </th>
                    <th className="is-numeric">
                      판매 가능
                    </th>
                    <th className="is-numeric">
                      안전 재고
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {isInventoryLoading && (
                    <tr>
                      <td
                        colSpan="5"
                        className="product-edit-inventory-message"
                      >
                        재고 정보를 불러오는 중입니다.
                      </td>
                    </tr>
                  )}

                  {!isInventoryLoading &&
                    inventories.length === 0 && (
                      <tr>
                        <td
                          colSpan="5"
                          className="product-edit-inventory-message"
                        >
                          연결된 재고 정보가 없습니다.
                        </td>
                      </tr>
                    )}

                  {!isInventoryLoading &&
                    inventories.map((inventory) => {
                      const availableQuantity = Math.max(
                        Number(
                          inventory.stock_quantity || 0,
                        ) -
                          Number(
                            inventory.reserved_quantity || 0,
                          ),
                        0,
                      )

                      return (
                        <tr key={inventory.inventory_id}>
                          <td>
                            <strong className="product-edit-sku-code">
                              {inventory.sku_code}
                            </strong>
                          </td>

                          <td className="is-numeric">
                            <input
                              className="product-edit-stock-input"
                              type="number"
                              min="0"
                              max="9999999"
                              step="1"
                              value={inventory.stock_quantity}
                              aria-label={`${inventory.sku_code} 현재 재고`}
                              onChange={(event) =>
                                handleInventoryChange(
                                  inventory.inventory_id,
                                  'stock_quantity',
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td className="is-numeric">
                            <span className="product-edit-quantity">
                              {Number(
                                inventory.reserved_quantity,
                              ).toLocaleString('ko-KR')}
                              개
                            </span>
                          </td>

                          <td className="is-numeric">
                            <strong className="product-edit-available">
                              {availableQuantity.toLocaleString(
                                'ko-KR',
                              )}
                              개
                            </strong>
                          </td>

                          <td className="is-numeric">
                            <input
                              className="product-edit-stock-input"
                              type="number"
                              min="0"
                              max="9999999"
                              step="1"
                              value={inventory.safety_stock}
                              aria-label={`${inventory.sku_code} 안전 재고`}
                              onChange={(event) =>
                                handleInventoryChange(
                                  inventory.inventory_id,
                                  'safety_stock',
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>

            <p className="product-edit-inventory-note">
              <span aria-hidden="true">ⓘ</span>
              예약 재고는 접수된 주문에 반영된 수량으로 수정할 수 없습니다.
            </p>
          </section>

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
            disabled={
              isSaving || isInventoryLoading
            }
          >
            {isSaving
              ? '저장 중'
              : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ProductEditModal
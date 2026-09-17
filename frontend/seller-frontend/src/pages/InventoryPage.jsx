import { useEffect, useMemo, useState } from 'react'

import {
  getSellerInventories,
  updateSellerInventory,
} from '../services/sellerInventoryService'
import './InventoryPage.css'

function InventoryPage() {
  const [inventories, setInventories] = useState([])

  // 검색창 입력값과 실제 API 검색어를 분리합니다.
  const [keywordInput, setKeywordInput] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)

  // 현재 수정 중인 재고와 입력값을 저장합니다.
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({
    stockQuantity: '',
    safetyStock: '',
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadInventories() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerInventories(searchKeyword)

        if (isActive) {
          setInventories(data)
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

    loadInventories()

    return () => {
      isActive = false
    }
  }, [searchKeyword])

  // 재고 부족 필터를 적용한 화면용 목록입니다.
  const visibleInventories = useMemo(() => {
    if (showLowStockOnly) {
      return inventories.filter((inventory) => inventory.is_low_stock)
    }

    return inventories
  }, [inventories, showLowStockOnly])

  const lowStockCount = inventories.filter(
    (inventory) => inventory.is_low_stock,
  ).length

  function handleSearch(event) {
  event.preventDefault()
  setEditingId(null)
  setSearchKeyword(keywordInput)
  }

  // 검색어와 검색 결과를 모두 초기 상태로 되돌립니다.
  function handleResetSearch() {
  setKeywordInput('')
  setSearchKeyword('')
  setEditingId(null)
  }

  function startEditing(inventory) {
    setErrorMessage('')
    setSuccessMessage('')
    setEditingId(inventory.inventory_id)

    setEditValues({
      stockQuantity: String(inventory.stock_quantity),
      safetyStock: String(inventory.safety_stock),
    })
  }

  function cancelEditing() {
    setEditingId(null)
  }

  function handleEditChange(event) {
    const { name, value } = event.target

    setEditValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  async function saveInventory(inventoryId) {
    const stockQuantity = Number(editValues.stockQuantity)
    const safetyStock = Number(editValues.safetyStock)

    // 재고는 0 이상의 정수만 입력할 수 있습니다.
    if (
      !Number.isInteger(stockQuantity) ||
      !Number.isInteger(safetyStock) ||
      stockQuantity < 0 ||
      safetyStock < 0
    ) {
      setErrorMessage('현재재고와 안전재고는 0 이상의 정수로 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedInventory = await updateSellerInventory(inventoryId, {
        stock_quantity: stockQuantity,
        safety_stock: safetyStock,
      })

      // 수정된 한 건만 새 응답 데이터로 교체합니다.
      setInventories((currentInventories) =>
        currentInventories.map((inventory) =>
          inventory.inventory_id === inventoryId
            ? updatedInventory
            : inventory,
        ),
      )

      setEditingId(null)
      setSuccessMessage('재고가 수정되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="inventory-page">
      <div className="inventory-heading">
        <div>
          <h1>재고 관리</h1>
          <p>SKU별 현재재고, 예약재고와 안전재고를 관리합니다.</p>
        </div>

      {/* 재고 부족 건수에 따라 위험 색상을 다르게 표시합니다. */}
      <div className={`inventory-summary-card ${
        lowStockCount >= 20
      ? 'is-danger'
      : lowStockCount >= 10
        ? 'is-warning'
        : 'is-safe'
      }`}
      >
      <span>재고 부족</span>
      <strong>{lowStockCount.toLocaleString('ko-KR')}건</strong>
      </div>
      </div>

      <section className="inventory-panel">
        <div className="inventory-toolbar">
          <form className="inventory-search" onSubmit={handleSearch}>
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="상품명 또는 SKU 검색"
              aria-label="재고 검색어"
            />

            <button
              className="inventory-search-button"
              type="submit"
            >
              검색
            </button>

            {/* 초기화 버튼은 항상 표시하고, 초기 상태에서는 비활성화합니다. */}
            <button
              className="inventory-reset-button"
              type="button"
              disabled={!keywordInput && !searchKeyword}
              onClick={handleResetSearch}
            >
              초기화
            </button>
          </form>

          <label className="low-stock-filter">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(event) =>
                setShowLowStockOnly(event.target.checked)
              }
            />
            재고 부족만 보기
          </label>
        </div>

        <div className="inventory-list-summary">
          <strong>
            조회 결과 {visibleInventories.length.toLocaleString('ko-KR')}건
          </strong>
          <span>현재재고에서 예약재고를 제외한 수량이 판매 가능 재고입니다.</span>
        </div>

        {errorMessage && (
          <div className="inventory-message is-error" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="inventory-message is-success" role="status">
            {successMessage}
          </div>
        )}

        <div className="inventory-table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>상품명</th>
                <th>SKU</th>
                <th>현재재고</th>
                <th>예약재고</th>
                <th>판매 가능</th>
                <th>안전재고</th>
                <th>상태</th>
                <th>관리</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="8" className="inventory-table-message">
                    재고 목록을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                !errorMessage &&
                visibleInventories.length === 0 && (
                  <tr>
                    <td colSpan="8" className="inventory-table-message">
                      조건에 맞는 재고가 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                visibleInventories.map((inventory) => {
                  const isEditing =
                    editingId === inventory.inventory_id

                  return (
                    <tr key={inventory.inventory_id}>
                      <td>
                        <strong className="inventory-product-name">
                          {inventory.product_name}
                        </strong>
                      </td>

                      <td>{inventory.sku_code}</td>

                      <td>
                        {isEditing ? (
                          <input
                            className="inventory-number-input"
                            type="number"
                            name="stockQuantity"
                            min="0"
                            step="1"
                            value={editValues.stockQuantity}
                            onChange={handleEditChange}
                            aria-label={`${inventory.product_name} 현재재고`}
                          />
                        ) : (
                          inventory.stock_quantity.toLocaleString('ko-KR')
                        )}
                      </td>

                      <td>
                        {inventory.reserved_quantity.toLocaleString('ko-KR')}
                      </td>

                      <td>
                        <strong>
                          {inventory.available_quantity.toLocaleString(
                            'ko-KR',
                          )}
                        </strong>
                      </td>

                      <td>
                        {isEditing ? (
                          <input
                            className="inventory-number-input"
                            type="number"
                            name="safetyStock"
                            min="0"
                            step="1"
                            value={editValues.safetyStock}
                            onChange={handleEditChange}
                            aria-label={`${inventory.product_name} 안전재고`}
                          />
                        ) : (
                          inventory.safety_stock.toLocaleString('ko-KR')
                        )}
                      </td>

                      <td>
                        <span
                          className={`inventory-status-badge ${
                            inventory.is_low_stock
                              ? 'is-low'
                              : 'is-normal'
                          }`}
                        >
                          {inventory.is_low_stock
                            ? '재고 부족'
                            : '정상'}
                        </span>
                      </td>

                      <td>
                        {isEditing ? (
                          <div className="inventory-actions">
                            <button
                              className="inventory-save-button"
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                saveInventory(inventory.inventory_id)
                              }
                            >
                              {isSaving ? '저장 중' : '저장'}
                            </button>

                            <button
                              className="inventory-cancel-button"
                              type="button"
                              disabled={isSaving}
                              onClick={cancelEditing}
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            className="inventory-edit-button"
                            type="button"
                            onClick={() => startEditing(inventory)}
                          >
                            수정
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default InventoryPage
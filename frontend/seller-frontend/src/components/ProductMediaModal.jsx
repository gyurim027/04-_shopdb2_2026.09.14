import { useEffect, useRef, useState } from 'react'

import {
  deactivateSellerProductImage,
  deleteSellerProductFile,
  getSellerProductAssetBlob,
  getSellerProductFiles,
  getSellerProductImages,
  updateSellerProductFile,
  updateSellerProductImage,
  uploadSellerProductFile,
  uploadSellerProductImage,
} from '../services/sellerProductsService'

const initialImageForm = {
  imageType: 'DETAIL',
  altText: '',
  displayOrder: '0',
}

const initialFileForm = {
  fileCategory: 'ETC',
  fileDescription: '',
  displayOrder: '0',
}

const fileCategoryLabels = {
  MANUAL: '상품설명서',
  CERTIFICATE: '인증서',
  SIZE_GUIDE: '사이즈표',
  ETC: '기타',
}

const allowedImageExtensions = ['jpg', 'jpeg', 'png', 'webp']
const allowedFileExtensions = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'hwp',
]

function getFileExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

function formatFileSize(value) {
  const bytes = Number(value || 0)

  if (bytes < 1024) {
    return `${bytes}B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function ProductMediaModal({ product, onBack, onClose }) {
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const [activeTab, setActiveTab] = useState('images')
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState({})
  const [imageDrafts, setImageDrafts] = useState({})
  const [fileDrafts, setFileDrafts] = useState({})

  const [imageFile, setImageFile] = useState(null)
  const [fileToUpload, setFileToUpload] = useState(null)
  const [imageForm, setImageForm] = useState(initialImageForm)
  const [fileForm, setFileForm] = useState(initialFileForm)

  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [processingKey, setProcessingKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isProcessing = processingKey !== ''

  useEffect(() => {
    let isActive = true
    const createdPreviewUrls = []

    Promise.all([
      getSellerProductImages(product.product_id),
      getSellerProductFiles(product.product_id),
    ])
      .then(async ([imageData, fileData]) => {
        const previewEntries = await Promise.all(
          imageData.map(async (image) => {
            try {
              const blob = await getSellerProductAssetBlob(
                image.file_id,
              )
              const previewUrl = URL.createObjectURL(blob)

              if (!isActive) {
                URL.revokeObjectURL(previewUrl)
                return [image.product_image_id, '']
              }

              createdPreviewUrls.push(previewUrl)
              return [image.product_image_id, previewUrl]
            } catch {
              return [image.product_image_id, '']
            }
          }),
        )

        return {
          imageData,
          fileData,
          previewEntries,
        }
      })
      .then(({ imageData, fileData, previewEntries }) => {
        if (!isActive) {
          return
        }

        setImages(imageData)
        setFiles(fileData)
        setPreviewUrls(Object.fromEntries(previewEntries))
        setImageDrafts(
          Object.fromEntries(
            imageData.map((image) => [
              image.product_image_id,
              {
                altText: image.alt_text ?? '',
                displayOrder: String(image.display_order ?? 0),
              },
            ]),
          ),
        )
        setFileDrafts(
          Object.fromEntries(
            fileData.map((item) => [
              item.product_file_id,
              {
                fileCategory: item.file_category || 'ETC',
                fileDescription: item.file_description ?? '',
                displayOrder: String(item.display_order ?? 0),
              },
            ]),
          ),
        )
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
      createdPreviewUrls.forEach((url) => {
        URL.revokeObjectURL(url)
      })
    }
  }, [product.product_id, refreshKey])

  function refreshMedia(message) {
    setSuccessMessage(message)
    setErrorMessage('')
    setIsLoading(true)
    setRefreshKey((currentKey) => currentKey + 1)
  }

  function handleImageFormChange(event) {
    const { name, value } = event.target

    setImageForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleFileFormChange(event) {
    const { name, value } = event.target

    setFileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleImageDraftChange(productImageId, event) {
    const { name, value } = event.target

    setImageDrafts((currentDrafts) => ({
      ...currentDrafts,
      [productImageId]: {
        ...currentDrafts[productImageId],
        [name]: value,
      },
    }))
  }

  function handleFileDraftChange(productFileId, event) {
    const { name, value } = event.target

    setFileDrafts((currentDrafts) => ({
      ...currentDrafts,
      [productFileId]: {
        ...currentDrafts[productFileId],
        [name]: value,
      },
    }))
  }

  async function handleImageUpload(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!imageFile) {
      setErrorMessage('등록할 이미지를 선택해 주세요.')
      return
    }

    const extension = getFileExtension(imageFile.name)

    if (!allowedImageExtensions.includes(extension)) {
      setErrorMessage('JPG, JPEG, PNG, WebP 이미지만 등록할 수 있습니다.')
      return
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      setErrorMessage('상품 이미지는 파일당 10MB까지 등록할 수 있습니다.')
      return
    }

    setProcessingKey('upload-image')

    try {
      await uploadSellerProductImage(product.product_id, {
        file: imageFile,
        imageType: imageForm.imageType,
        altText: imageForm.altText,
        displayOrder: Number(imageForm.displayOrder || 0),
      })

      setImageFile(null)
      setImageForm(initialImageForm)

      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }

      refreshMedia('상품 이미지가 등록되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleImageUpdate(image) {
    const draft = imageDrafts[image.product_image_id]

    if (!draft) {
      return
    }

    setProcessingKey(`image-${image.product_image_id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateSellerProductImage(image.product_image_id, {
        alt_text: draft.altText.trim(),
        display_order: Number(draft.displayOrder || 0),
      })

      refreshMedia('이미지 정보가 수정되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleSetMain(image) {
    setProcessingKey(`image-${image.product_image_id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateSellerProductImage(image.product_image_id, {
        image_type: 'MAIN',
      })

      refreshMedia('대표 이미지가 변경되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleImageDelete(image) {
    const confirmed = window.confirm(
      '이 상품 이미지를 삭제하시겠습니까?',
    )

    if (!confirmed) {
      return
    }

    setProcessingKey(`image-${image.product_image_id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deactivateSellerProductImage(image.product_image_id)
      refreshMedia('상품 이미지가 삭제되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleFileUpload(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!fileToUpload) {
      setErrorMessage('등록할 첨부파일을 선택해 주세요.')
      return
    }

    const extension = getFileExtension(fileToUpload.name)

    if (!allowedFileExtensions.includes(extension)) {
      setErrorMessage(
        'PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, HWP 파일만 등록할 수 있습니다.',
      )
      return
    }

    if (fileToUpload.size > 20 * 1024 * 1024) {
      setErrorMessage('첨부파일은 파일당 20MB까지 등록할 수 있습니다.')
      return
    }

    setProcessingKey('upload-file')

    try {
      await uploadSellerProductFile(product.product_id, {
        file: fileToUpload,
        fileCategory: fileForm.fileCategory,
        fileDescription: fileForm.fileDescription,
        displayOrder: Number(fileForm.displayOrder || 0),
      })

      setFileToUpload(null)
      setFileForm(initialFileForm)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      refreshMedia('첨부파일이 등록되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleFileUpdate(item) {
    const draft = fileDrafts[item.product_file_id]

    if (!draft) {
      return
    }

    setProcessingKey(`file-${item.product_file_id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await updateSellerProductFile(item.product_file_id, {
        file_category: draft.fileCategory,
        file_description: draft.fileDescription.trim(),
        display_order: Number(draft.displayOrder || 0),
      })

      refreshMedia('첨부파일 정보가 수정되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleFileDownload(item) {
    setProcessingKey(`file-${item.product_file_id}`)
    setErrorMessage('')

    try {
      const blob = await getSellerProductAssetBlob(item.file_id)
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')

      anchor.href = downloadUrl
      anchor.download =
        item.file?.original_file_name || `file-${item.file_id}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  async function handleFileDelete(item) {
    const fileName =
      item.file?.original_file_name || '선택한 첨부파일'
    const confirmed = window.confirm(
      `${fileName}을(를) 삭제하시겠습니까?`,
    )

    if (!confirmed) {
      return
    }

    setProcessingKey(`file-${item.product_file_id}`)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteSellerProductFile(item.product_file_id)
      refreshMedia('첨부파일이 삭제되었습니다.')
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setProcessingKey('')
    }
  }

  return (
    <div
      className="product-create-overlay"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="product-create-modal product-media-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-media-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="product-create-heading">
          <div>
            <h2 id="product-media-title">이미지·첨부파일 관리</h2>
            <p>{product.product_name} 상품의 파일을 관리합니다.</p>
          </div>

          <button
            className="product-create-close"
            type="button"
            aria-label="이미지 및 첨부파일 관리 팝업 닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="media-tabs" role="tablist">
          <button
            className={activeTab === 'images' ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'images'}
            onClick={() => setActiveTab('images')}
          >
            상품 이미지 ({images.length}/10)
          </button>

          <button
            className={activeTab === 'files' ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
          >
            첨부파일 ({files.length}/5)
          </button>
        </div>

        {errorMessage && (
          <div className="products-message is-error" role="alert">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="products-message is-success" role="status">
            {successMessage}
          </div>
        )}

        <div className="media-modal-body">
          {isLoading && (
            <div className="media-empty-state">
              이미지와 첨부파일을 불러오는 중입니다.
            </div>
          )}

          {!isLoading && activeTab === 'images' && (
            <>
              <form
                className="media-upload-panel"
                onSubmit={handleImageUpload}
              >
                <div className="media-section-heading">
                  <div>
                    <h3>상품 이미지 등록</h3>
                    <p>
                      JPG, PNG, WebP 형식·10MB 이하·정사각형
                      1000px 이상을 권장합니다.
                    </p>
                  </div>
                </div>

                <div className="media-upload-grid">
                  <label className="media-field-wide">
                    <span>이미지 파일 *</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      disabled={isProcessing || images.length >= 10}
                      onChange={(event) =>
                        setImageFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>

                  <label>
                    <span>이미지 구분</span>
                    <select
                      name="imageType"
                      value={imageForm.imageType}
                      disabled={isProcessing}
                      onChange={handleImageFormChange}
                    >
                      <option value="DETAIL">상세 이미지</option>
                      <option value="MAIN">대표 이미지</option>
                    </select>
                  </label>

                  <label>
                    <span>노출 순서</span>
                    <input
                      type="number"
                      name="displayOrder"
                      min="0"
                      value={imageForm.displayOrder}
                      disabled={isProcessing}
                      onChange={handleImageFormChange}
                    />
                  </label>

                  <label className="media-field-wide">
                    <span>이미지 설명</span>
                    <input
                      type="text"
                      name="altText"
                      maxLength="500"
                      value={imageForm.altText}
                      disabled={isProcessing}
                      placeholder="예: 상품 정면 이미지"
                      onChange={handleImageFormChange}
                    />
                  </label>
                </div>

                <div className="media-upload-actions">
                  <button
                    className="product-create-submit"
                    type="submit"
                    disabled={
                      isProcessing ||
                      images.length >= 10 ||
                      !imageFile
                    }
                  >
                    {processingKey === 'upload-image'
                      ? '등록 중'
                      : '이미지 등록'}
                  </button>
                </div>
              </form>

              <div className="media-section-heading">
                <div>
                  <h3>등록된 이미지</h3>
                  <p>대표 이미지와 노출 순서를 관리합니다.</p>
                </div>
              </div>

              {images.length === 0 ? (
                <div className="media-empty-state">
                  등록된 이미지가 없습니다.
                </div>
              ) : (
                <div className="media-image-list">
                  {images.map((image) => {
                    const draft = imageDrafts[
                      image.product_image_id
                    ] || {
                      altText: '',
                      displayOrder: '0',
                    }
                    const isCurrentProcessing =
                      processingKey ===
                      `image-${image.product_image_id}`

                    return (
                      <article
                        className="media-image-card"
                        key={image.product_image_id}
                      >
                        <div className="media-image-preview">
                          {previewUrls[image.product_image_id] ? (
                            <img
                              src={
                                previewUrls[image.product_image_id]
                              }
                              alt={
                                image.alt_text ||
                                image.file?.original_file_name ||
                                '상품 이미지'
                              }
                            />
                          ) : (
                            <span>미리보기 없음</span>
                          )}
                        </div>

                        <div className="media-item-content">
                          <div className="media-item-title">
                            <strong>
                              {image.file?.original_file_name ||
                                `이미지 ${image.file_id}`}
                            </strong>

                            <span
                              className={
                                image.image_type === 'MAIN'
                                  ? 'media-type-badge is-main'
                                  : 'media-type-badge'
                              }
                            >
                              {image.image_type === 'MAIN'
                                ? '대표 이미지'
                                : '상세 이미지'}
                            </span>
                          </div>

                          <span className="media-file-meta">
                            {formatFileSize(image.file?.file_size)}
                          </span>

                          <div className="media-edit-grid">
                            <label>
                              <span>이미지 설명</span>
                              <input
                                type="text"
                                name="altText"
                                maxLength="500"
                                value={draft.altText}
                                disabled={isProcessing}
                                onChange={(event) =>
                                  handleImageDraftChange(
                                    image.product_image_id,
                                    event,
                                  )
                                }
                              />
                            </label>

                            <label>
                              <span>노출 순서</span>
                              <input
                                type="number"
                                name="displayOrder"
                                min="0"
                                value={draft.displayOrder}
                                disabled={isProcessing}
                                onChange={(event) =>
                                  handleImageDraftChange(
                                    image.product_image_id,
                                    event,
                                  )
                                }
                              />
                            </label>
                          </div>

                          <div className="media-item-actions">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleImageUpdate(image)}
                            >
                              {isCurrentProcessing
                                ? '처리 중'
                                : '정보 저장'}
                            </button>

                            {image.image_type !== 'MAIN' && (
                              <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => handleSetMain(image)}
                              >
                                대표로 설정
                              </button>
                            )}

                            <button
                              className="is-danger"
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleImageDelete(image)}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {!isLoading && activeTab === 'files' && (
            <>
              <form
                className="media-upload-panel"
                onSubmit={handleFileUpload}
              >
                <div className="media-section-heading">
                  <div>
                    <h3>첨부파일 등록</h3>
                    <p>
                      상품설명서, 인증서, 사이즈표 등을 파일당
                      20MB까지 등록할 수 있습니다.
                    </p>
                  </div>
                </div>

                <div className="media-upload-grid">
                  <label className="media-field-wide">
                    <span>첨부파일 *</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp"
                      disabled={isProcessing || files.length >= 5}
                      onChange={(event) =>
                        setFileToUpload(
                          event.target.files?.[0] || null,
                        )
                      }
                    />
                  </label>

                  <label>
                    <span>파일 분류</span>
                    <select
                      name="fileCategory"
                      value={fileForm.fileCategory}
                      disabled={isProcessing}
                      onChange={handleFileFormChange}
                    >
                      {Object.entries(fileCategoryLabels).map(
                        ([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span>노출 순서</span>
                    <input
                      type="number"
                      name="displayOrder"
                      min="0"
                      value={fileForm.displayOrder}
                      disabled={isProcessing}
                      onChange={handleFileFormChange}
                    />
                  </label>

                  <label className="media-field-wide">
                    <span>파일 설명</span>
                    <input
                      type="text"
                      name="fileDescription"
                      maxLength="500"
                      value={fileForm.fileDescription}
                      disabled={isProcessing}
                      placeholder="예: 제품 사용설명서"
                      onChange={handleFileFormChange}
                    />
                  </label>
                </div>

                <div className="media-upload-actions">
                  <button
                    className="product-create-submit"
                    type="submit"
                    disabled={
                      isProcessing ||
                      files.length >= 5 ||
                      !fileToUpload
                    }
                  >
                    {processingKey === 'upload-file'
                      ? '등록 중'
                      : '첨부파일 등록'}
                  </button>
                </div>
              </form>

              <div className="media-section-heading">
                <div>
                  <h3>등록된 첨부파일</h3>
                  <p>파일 설명과 분류, 노출 순서를 관리합니다.</p>
                </div>
              </div>

              {files.length === 0 ? (
                <div className="media-empty-state">
                  등록된 첨부파일이 없습니다.
                </div>
              ) : (
                <div className="media-file-list">
                  {files.map((item) => {
                    const draft = fileDrafts[
                      item.product_file_id
                    ] || {
                      fileCategory: 'ETC',
                      fileDescription: '',
                      displayOrder: '0',
                    }
                    const isCurrentProcessing =
                      processingKey ===
                      `file-${item.product_file_id}`

                    return (
                      <article
                        className="media-file-card"
                        key={item.product_file_id}
                      >
                        <div className="media-item-title">
                          <strong>
                            {item.file?.original_file_name ||
                              `첨부파일 ${item.file_id}`}
                          </strong>

                          <span className="media-type-badge">
                            {fileCategoryLabels[
                              item.file_category
                            ] || '기타'}
                          </span>
                        </div>

                        <span className="media-file-meta">
                          {item.file?.file_extension?.toUpperCase() ||
                            'FILE'}
                          {' · '}
                          {formatFileSize(item.file?.file_size)}
                        </span>

                        <div className="media-edit-grid media-file-edit-grid">
                          <label>
                            <span>파일 분류</span>
                            <select
                              name="fileCategory"
                              value={draft.fileCategory}
                              disabled={isProcessing}
                              onChange={(event) =>
                                handleFileDraftChange(
                                  item.product_file_id,
                                  event,
                                )
                              }
                            >
                              {Object.entries(fileCategoryLabels).map(
                                ([value, label]) => (
                                  <option value={value} key={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </label>

                          <label>
                            <span>노출 순서</span>
                            <input
                              type="number"
                              name="displayOrder"
                              min="0"
                              value={draft.displayOrder}
                              disabled={isProcessing}
                              onChange={(event) =>
                                handleFileDraftChange(
                                  item.product_file_id,
                                  event,
                                )
                              }
                            />
                          </label>

                          <label className="media-field-wide">
                            <span>파일 설명</span>
                            <input
                              type="text"
                              name="fileDescription"
                              maxLength="500"
                              value={draft.fileDescription}
                              disabled={isProcessing}
                              onChange={(event) =>
                                handleFileDraftChange(
                                  item.product_file_id,
                                  event,
                                )
                              }
                            />
                          </label>
                        </div>

                        <div className="media-item-actions">
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleFileUpdate(item)}
                          >
                            {isCurrentProcessing
                              ? '처리 중'
                              : '정보 저장'}
                          </button>

                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleFileDownload(item)}
                          >
                            다운로드
                          </button>

                          <button
                            className="is-danger"
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleFileDelete(item)}
                          >
                            삭제
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        <div className="product-create-footer media-modal-footer">
          <button
            className="product-create-cancel"
            type="button"
            disabled={isProcessing}
            onClick={onBack}
          >
            이전
          </button>

          <button
            className="product-create-submit"
            type="button"
            disabled={isProcessing}
            onClick={onClose}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProductMediaModal

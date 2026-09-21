import {
  apiBlobRequest,
  apiRequest,
} from './apiClient'

// 로그인한 셀러의 상품 목록을 불러옵니다.
export async function getSellerProducts({
  page = 1,
  size = 20,
  productStatus = '',
  keyword = '',
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (productStatus) {
    query.set('product_status', productStatus)
  }

  if (keyword.trim()) {
    query.set('keyword', keyword.trim())
  }

  return apiRequest(`/seller/products/products?${query.toString()}`)
}

// 상품 등록 화면에서 사용할 카테고리를 불러옵니다.
export async function getSellerCategories() {
  return apiRequest('/seller/products/categories')
}

// 새 상품을 등록합니다.
export async function createSellerProduct(values) {
  return apiRequest('/seller/products/products', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

// 기존 상품의 기본 정보와 판매 상태를 수정합니다.
export async function updateSellerProduct(productId, values) {
  return apiRequest(`/seller/products/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

// ---------------------------------------------------------------------------
// 상품 옵션
// ---------------------------------------------------------------------------

// 특정 상품의 옵션/SKU 목록을 불러옵니다.
export async function getSellerProductVariants(productId) {
  return apiRequest(
    `/seller/products/products/${productId}/variants`,
  )
}

// 특정 상품에 새로운 옵션/SKU를 등록합니다.
export async function createSellerProductVariant(productId, values) {
  return apiRequest(
    `/seller/products/products/${productId}/variants`,
    {
      method: 'POST',
      body: JSON.stringify(values),
    },
  )
}

// 기존 옵션/SKU 정보를 수정합니다.
export async function updateSellerProductVariant(variantId, values) {
  return apiRequest(
    `/seller/products/variants/${variantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
  )
}

// 옵션/SKU를 비활성화합니다.
export async function deactivateSellerProductVariant(variantId) {
  return apiRequest(
    `/seller/products/variants/${variantId}`,
    {
      method: 'DELETE',
    },
  )
}

// ---------------------------------------------------------------------------
// 상품 이미지
// ---------------------------------------------------------------------------

// 상품에 등록된 이미지 목록을 불러옵니다.
export async function getSellerProductImages(productId) {
  return apiRequest(
    `/seller/products/products/${productId}/images`,
  )
}

// 상품 이미지를 실제 파일과 함께 업로드합니다.
export async function uploadSellerProductImage(
  productId,
  {
    file,
    imageType = 'DETAIL',
    altText = '',
    displayOrder = 0,
  },
) {
  const formData = new FormData()

  formData.append('file', file)
  formData.append('image_type', imageType)
  formData.append('display_order', String(displayOrder))

  if (altText.trim()) {
    formData.append('alt_text', altText.trim())
  }

  return apiRequest(
    `/seller/products/products/${productId}/images/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )
}

// 대표 이미지, 이미지 설명, 노출 순서 등을 수정합니다.
export async function updateSellerProductImage(
  productImageId,
  values,
) {
  return apiRequest(
    `/seller/products/images/${productImageId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
  )
}

// 상품 이미지를 비활성화합니다.
export async function deactivateSellerProductImage(
  productImageId,
) {
  return apiRequest(
    `/seller/products/images/${productImageId}`,
    {
      method: 'DELETE',
    },
  )
}

// ---------------------------------------------------------------------------
// 상품 첨부파일
// ---------------------------------------------------------------------------

// 상품에 등록된 첨부파일 목록을 불러옵니다.
export async function getSellerProductFiles(productId) {
  return apiRequest(
    `/seller/products/products/${productId}/files`,
  )
}

// 상품 첨부파일을 실제 파일과 함께 업로드합니다.
export async function uploadSellerProductFile(
  productId,
  {
    file,
    fileCategory = 'ETC',
    fileDescription = '',
    displayOrder = 0,
  },
) {
  const formData = new FormData()

  formData.append('file', file)
  formData.append('file_category', fileCategory)
  formData.append('display_order', String(displayOrder))

  if (fileDescription.trim()) {
    formData.append(
      'file_description',
      fileDescription.trim(),
    )
  }

  return apiRequest(
    `/seller/products/products/${productId}/files/upload`,
    {
      method: 'POST',
      body: formData,
    },
  )
}

// 첨부파일 분류, 설명, 노출 순서를 수정합니다.
export async function updateSellerProductFile(
  productFileId,
  values,
) {
  return apiRequest(
    `/seller/products/files/${productFileId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
  )
}

// 상품과 첨부파일의 연결을 삭제합니다.
export async function deleteSellerProductFile(productFileId) {
  return apiRequest(
    `/seller/products/files/${productFileId}`,
    {
      method: 'DELETE',
    },
  )
}

// ---------------------------------------------------------------------------
// 파일 미리보기·다운로드
// ---------------------------------------------------------------------------

// 권한이 확인된 이미지 또는 첨부파일을 Blob으로 가져옵니다.
export async function getSellerProductAssetBlob(fileId) {
  return apiBlobRequest(
    `/seller/products/assets/${fileId}/content`,
  )
}
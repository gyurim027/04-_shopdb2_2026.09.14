import { apiRequest } from './apiClient'

// 판매자 프로필을 불러옵니다.
export async function getSellerProfile() {
  return apiRequest('/seller/info/profile')
}

// 판매자 승인·운영 상태를 불러옵니다.
export async function getSellerStatus() {
  return apiRequest('/seller/info/status')
}

// 정산계좌 정보를 불러옵니다.
export async function getSellerSettlementAccount() {
  return apiRequest('/seller/info/settlement-account')
}

// 판매자 프로필을 수정합니다.
export async function updateSellerProfile(values) {
  return apiRequest('/seller/info/profile', {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

// 정산계좌를 수정합니다.
export async function updateSellerSettlementAccount(values) {
  return apiRequest('/seller/info/settlement-account', {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

// 내 정보 화면에 필요한 데이터를 동시에 불러옵니다.
export async function getSellerInfo() {
  const [profile, status, settlementAccount] = await Promise.all([
    getSellerProfile(),
    getSellerStatus(),
    getSellerSettlementAccount(),
  ])

  return {
    profile,
    status,
    settlementAccount,
  }
}
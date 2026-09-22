import axios from 'axios';

// FastAPI 백엔드 주소 (포트에 맞게 수정 가능)
const API_BASE_URL = 'http://localhost:8000/api/admin';

const adminClient = axios.create({
  baseURL: API_BASE_URL,
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 환불 정책 관련
export const fetchRefundPolicies = () => adminClient.get('/refunds/policies');
export const createRefundPolicy = (data) => adminClient.post('/refunds/policies', data);

// 환불 요청 관련
export const fetchRefundRequests = (status) => adminClient.get('/refunds/requests', { params: { refund_status: status } });
export const approveRefundRequest = (requestId, amount) => adminClient.patch(`/refunds/requests/${requestId}/approve`, { approved_amount: amount });

// 회사 정책 관련
export const fetchCompanyPolicies = () => adminClient.get('/support/policies');
export const createCompanyPolicy = (data) => adminClient.post('/support/policies', data);

// 상품 옵션/SKU 관련
export const fetchProductVariants = (productId) => adminClient.get(`/products/products/${productId}/variants`);
export const createProductVariant = (productId, data) => adminClient.post(`/products/products/${productId}/variants`, data);

// 고객 문의 관련
export const fetchInquiries = () => adminClient.get('/inquiries');
export const answerInquiry = (id, data) => adminClient.post(`/support/inquiries/${id}/answer`, data);

// 교환 승인 API 호출
export const approveExchangeRequest = async (exchangeId) => {
  const response = await adminClient.patch(`/exchanges/${exchangeId}/approve`);
  return response.data;
};

// 교환 반려 API 호출
export const rejectExchangeRequest = async (exchangeId) => {
  const response = await adminClient.patch(`/exchanges/${exchangeId}/reject`);
  return response.data;
};

// 교환 요청 목록 조회 API 호출
export const fetchExchangeRequests = (status) => 
  adminClient.get('/exchanges', { params: { exchange_status: status } });
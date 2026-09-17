import { apiRequest } from './client'

export const customerApi = {
  login: (body) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  register: (body) => apiRequest('/customer/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  getProfile: () => apiRequest('/customer/profile/me'),
  updateProfile: (body) => apiRequest('/customer/profile/me', { method: 'PATCH', body: JSON.stringify(body) }),

  getCategories: () => apiRequest('/customer/products/categories'),
  getProducts: ({ page = 1, size = 20, categoryId, keyword } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (categoryId) params.set('category_id', String(categoryId))
    if (keyword) params.set('keyword', keyword)
    return apiRequest(`/customer/products?${params.toString()}`)
  },
  getProduct: (id) => apiRequest(`/customer/products/${id}`),

  getAddresses: () => apiRequest('/customer/addresses'),
  createAddress: (body) => apiRequest('/customer/addresses', { method: 'POST', body: JSON.stringify(body) }),
  updateAddress: (id, body) => apiRequest(`/customer/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteAddress: (id) => apiRequest(`/customer/addresses/${id}`, { method: 'DELETE' }),

  createOrder: (body) => apiRequest('/customer/orders', { method: 'POST', body: JSON.stringify(body) }),
  getOrders: ({ page = 1, size = 20 } = {}) => apiRequest(`/customer/orders?page=${page}&size=${size}`),
  getOrder: (id) => apiRequest(`/customer/orders/${id}`),
  getOrderStatus: (id) => apiRequest(`/customer/orders/${id}/status`),

  requestPayment: (body) => apiRequest('/customer/payments/request', { method: 'POST', body: JSON.stringify(body) }),
  approvePayment: (id, body) => apiRequest(`/customer/payments/${id}/approve`, { method: 'POST', body: JSON.stringify(body) }),
  getPayment: (id) => apiRequest(`/customer/payments/${id}`),
  getPaymentStatus: (id) => apiRequest(`/customer/payments/${id}/status`),

  getRefundPolicy: (orderId) => apiRequest(`/customer/refunds/policy?order_id=${orderId}`),
  createRefund: (body) => apiRequest('/customer/refunds', { method: 'POST', body: JSON.stringify(body) }),
  getRefunds: ({ page = 1, size = 20 } = {}) => apiRequest(`/customer/refunds?page=${page}&size=${size}`),
  getRefund: (id) => apiRequest(`/customer/refunds/${id}`),

  createInquiry: (body) => apiRequest('/customer/support/inquiries', { method: 'POST', body: JSON.stringify(body) }),
  getInquiries: ({ page = 1, size = 20, status, category } = {}) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (status) params.set('inquiry_status', status)
    if (category) params.set('category_code', category)
    return apiRequest(`/customer/support/inquiries?${params.toString()}`)
  },
  getInquiry: (id) => apiRequest(`/customer/support/inquiries/${id}`),
  uploadInquiryFile: (id, file) => {
    const form = new FormData()
    form.append('file', file)
    return apiRequest(`/customer/support/inquiries/${id}/files`, { method: 'POST', body: form })
  },
  getPolicies: () => apiRequest('/customer/support/policies'),
  getPolicy: (id) => apiRequest(`/customer/support/policies/${id}`),

  askAi: (question) => apiRequest('/customer/ai/chat', { method: 'POST', body: JSON.stringify({ question }) }),
  getAiLogs: ({ page = 1, size = 20 } = {}) => apiRequest(`/customer/ai/query-logs?page=${page}&size=${size}`),
  convertAiToInquiry: (id, body = {}) => apiRequest(`/customer/ai/query-logs/${id}/convert-to-inquiry`, { method: 'POST', body: JSON.stringify(body) }),
}

import React, { useState, useEffect } from 'react';
import { fetchInquiries, answerInquiry } from '../../services/adminApi';
import { useNavigate } from 'react-router-dom';
import { 
  Layout, Menu, Button, Card, Row, Col, Statistic, message, Space, Typography,
  Modal, Form, Input, Select, Tabs, DatePicker 
} from 'antd';
import {
  HomeOutlined, ShoppingCartOutlined, UserOutlined, AppstoreOutlined,
  MessageOutlined, PayCircleOutlined, FileTextOutlined,
  LogoutOutlined, PlusOutlined, ShopOutlined, CrownOutlined
} from '@ant-design/icons';

// 컴포넌트들 임포트
import DashboardHome from './components/DashboardHome';
import OrderTable from './components/OrderTable';
import UserTable from './components/UserTable';
import InventoryTable from './components/InventoryTable';
import SupportTable from './components/SupportTable';
import RefundTable from './components/RefundTable';
import PolicyTable from './components/PolicyTable';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function AdminDashboard() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('home');
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [products, setProducts] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [refundPolicies, setRefundPolicies] = useState([]);
  const [refundRequests, setRefundRequests] = useState([]);
  const [companyPolicies, setCompanyPolicies] = useState([]);
  const [organizations, setOrganizations] = useState([]); 
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [userInfo, setUserInfo] = useState({
    name: '관리자',
    orgType: 'HEADQUARTER',
    orgId: '',
    userId: null,
  });

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [regModalTab, setRegModalTab] = useState('user');
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);

  const [userForm] = Form.useForm();
  const [orgForm] = Form.useForm();
  const [productForm] = Form.useForm();
  const [answerForm] = Form.useForm();
  const [policyForm] = Form.useForm();

  const handleAuthError = () => {
    localStorage.clear();
    message.warning('인증이 만료되었습니다. 다시 로그인해 주세요.');
    navigate('/admin/login');
  };

  const fetchDashboardData = async (token) => {
    try {
      setLoading(true);
      const meRes = await fetch('http://127.0.0.1:8000/api/admin/me', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (meRes.status === 401) { handleAuthError(); return; }

      let currentOrgType = localStorage.getItem('org_type') || 'HEADQUARTER';
      let currentOrgId = localStorage.getItem('org_id') || '';
      let currentName = localStorage.getItem('user_name') || '관리자';
      let currentUserId = null;

      if (meRes.ok) {
        const meData = await meRes.json();
        currentName = meData.user_name || currentName;
        currentOrgId = meData.org_id || '';
        currentOrgType = (meData.org_id === 1) ? 'HEADQUARTER' : 'BRANCH'; 
        currentUserId = meData.user_id;
      }
      
      setUserInfo({ name: currentName, orgType: currentOrgType, orgId: currentOrgId, userId: currentUserId });

      const endpoints = [
        { url: '/api/admin/dashboard/summary', setter: setSummary, isObject: true },
        { url: '/api/admin/users', setter: setUsers },
        { url: '/api/admin/orders', setter: setOrders },
        { url: '/api/admin/products/inventories', setter: setInventories },
        { url: '/api/admin/products/products', setter: setProducts },
        { url: '/api/admin/support/inquiries', setter: setInquiries },
        { url: '/api/admin/refunds/policies', setter: setRefundPolicies },
        { url: '/api/admin/refunds/requests', setter: setRefundRequests },
        { url: '/api/admin/support/policies', setter: setCompanyPolicies },
        { url: '/api/admin/organizations', setter: setOrganizations }, 
      ];

      for (const ep of endpoints) {
        const res = await fetch(`http://127.0.0.1:8000${ep.url}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.status === 401) { handleAuthError(); return; }
        if (res.ok) {
          const data = await res.json();
          if (ep.isObject) ep.setter(data);
          else ep.setter(Array.isArray(data) ? data : (data.items || data.data || []));
        }
      }
      setLoading(false);
    } catch (err) {
      message.error('데이터를 불러오는 중 에러가 발생했습니다.');
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      message.warning('로그인이 필요한 서비스입니다.');
      navigate('/admin/login');
      return;
    }
    fetchDashboardData(token);
  }, [navigate]);

  const handleAction = async (url, method, body, successMsg) => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`http://127.0.0.1:8000${url}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) { handleAuthError(); return; }
      if (res.ok) {
        message.success(successMsg);
        fetchDashboardData(token);
      } else {
        const errData = await res.json();
        message.error(`실패: ${errData.detail || '권한이 없습니다.'}`);
      }
    } catch (err) { message.error('서버 통신 중 에러가 발생했습니다.'); }
  };

  const handleCreateOrgSubmit = async (values) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/organizations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, org_type: 'BRANCH', parent_org_id: 1, active_yn: 'Y' }),
      });
      if (response.status === 401) return handleAuthError();
      if (response.ok) {
        message.success('신규 지점이 성공적으로 등록되었습니다.');
        setIsRegModalOpen(false);
        orgForm.resetFields();
        fetchDashboardData(token); 
      } else {
        const errData = await response.json();
        message.error(`등록 실패: ${errData.detail}`);
      }
    } catch (error) { message.error('서버 통신 중 에러가 발생했습니다.'); }
  };

  const handleCreateUserSubmit = async (values) => {
    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (response.status === 401) return handleAuthError();
      if (response.ok) {
        message.success('신규 회원이 성공적으로 등록되었습니다.');
        setIsRegModalOpen(false);
        userForm.resetFields(); 
        fetchDashboardData(token); 
      } else {
        const errData = await response.json();
        message.error(`등록 실패: ${errData.detail || '권한이 없습니다.'}`);
      }
    } catch (error) { message.error('서버 통신 중 에러가 발생했습니다.'); }
  };

  const handleOrderStatusChange = (orderId, currentStatus) => {
    const newStatus = prompt(`현재 상태: [${currentStatus}]\n변경할 상태(PAID, COMPLETED, CANCELLED):`, 'PAID');
    if (newStatus) handleAction(`/api/admin/orders/${orderId}/status`, 'PATCH', { status: newStatus.trim().toUpperCase() }, '주문 상태가 변경되었습니다.');
  };

  const handleUserStatusChange = (userId, currentStatus) => {
    const newStatus = prompt(`현재 상태: [${currentStatus}]\n변경할 상태(ACTIVE, INACTIVE, SUSPENDED):`, 'ACTIVE');
    if (newStatus) handleAction(`/api/admin/users/${userId}/status`, 'PATCH', { user_status: newStatus.trim().toUpperCase() }, '회원 상태가 변경되었습니다.');
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm("정말로 이 회원을 탈퇴(삭제) 처리하시겠습니까?")) {
      handleAction(`/api/admin/users/${userId}/status`, 'PATCH', { user_status: 'WITHDRAWN' }, '회원이 성공적으로 탈퇴 처리되었습니다.');
    }
  };

  const handleInventoryAdjust = (inventoryId, currentStock) => {
    const newStockStr = prompt(`현재 재고: [${currentStock}개]\n조정할 수량:`, currentStock);
    const newStock = parseInt(newStockStr, 10);
    if (!isNaN(newStock)) handleAction(`/api/admin/products/inventories/${inventoryId}`, 'PATCH', { stock_quantity: newStock }, '재고가 조정되었습니다.');
  };

  const handleSalePriceAdjust = (productId, currentPrice, productName) => {
    if (userInfo.orgType !== 'HEADQUARTER') return message.warning('본사 최고관리자만 가능합니다.');
    const newPriceStr = prompt(`[${productName}] 현재 세일가: [${currentPrice}원]\n변경할 새로운 세일가:`, currentPrice);
    const newPrice = parseFloat(newPriceStr);
    if (!isNaN(newPrice)) handleAction(`/api/admin/products/products/${productId}`, 'PATCH', { sale_price: newPrice }, '세일가가 조정되었습니다.');
  };

  const handleOpenAnswerModal = (inquiryId, currentAnswer) => {
    setSelectedInquiryId(inquiryId);
    answerForm.setFieldsValue({ answer_content: currentAnswer || '' });
    setIsAnswerModalOpen(true);
  };

  const handleAnswerSubmit = async (values) => {
    try {
      await answerInquiry(selectedInquiryId, { 
        answer_content: values.answer_content.trim(), 
        inquiry_status: 'ANSWERED' 
      });
      message.success('답변이 성공적으로 등록되었습니다.');
      setIsAnswerModalOpen(false);
      answerForm.resetFields();
      const token = localStorage.getItem('access_token');
      if (token) fetchDashboardData(token);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || '권한이 없거나 요청에 실패했습니다.';
      message.error(`답변 등록 실패: ${errorMsg}`);
    }
  };

  const handleApproveRefund = (refundRequestId) => {
    if (window.confirm("해당 환불 요청을 승인하시겠습니까?")) {
      handleAction(`/api/admin/refunds/requests/${refundRequestId}/approve`, 'PATCH', {}, '환불 요청이 승인 처리되었습니다!');
    }
  };

  const handleRejectRefund = (refundRequestId) => {
    if (window.confirm("해당 환불 요청을 반려하시겠습니까?")) {
      handleAction(`/api/admin/refunds/requests/${refundRequestId}/reject`, 'PATCH', {}, '환불 요청이 반려 처리되었습니다!');
    }
  };

  const handleCreateProductSubmit = async (values) => {
    if (userInfo.orgType !== 'HEADQUARTER' && userInfo.orgType !== 'BRANCH') {
      return message.warning('상품 등록 권한이 없습니다.');
    }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/products/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller_user_id: userInfo.userId, 
          category_id: values.category_id || 1,
          product_code: values.product_code.trim(), 
          product_name: values.product_name.trim(),
          short_description: values.short_description || '관리자 콘솔 등록 상품', 
          description: values.description || '신규 등록 상품 상세 설명',
          regular_price: parseFloat(values.regular_price), 
          sale_price: parseFloat(values.sale_price),
          product_status: 'SALE', 
          variants: [], 
          images: []
        }),
      });

      if (response.status === 401) return handleAuthError();
      if (response.ok) {
        message.success('신규 상품이 성공적으로 등록되었습니다!');
        setIsProductModalOpen(false);
        productForm.resetFields();
        fetchDashboardData(token);
      } else {
        const errData = await response.json();
        message.error(`등록 실패: ${errData.detail || '권한이 없습니다.'}`);
      }
    } catch (error) {
      message.error('서버 통신 중 에러가 발생했습니다.');
    }
  };

  const handleCreatePolicySubmit = async (values) => {
    if (userInfo.orgType !== 'HEADQUARTER') return message.warning('본사 최고관리자만 가능합니다.');

    const token = localStorage.getItem('access_token');
    const effectiveFromDate = values.effective_from 
      ? values.effective_from.format('YYYY-MM-DD') 
      : new Date().toISOString().split('T')[0];
    
    const effectiveToDate = values.effective_to 
      ? values.effective_to.format('YYYY-MM-DD') 
      : null;

    try {
      const response = await fetch('http://127.0.0.1:8000/api/admin/support/policies', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_code: values.policy_code.trim(),
          policy_name: values.policy_name.trim(),
          policy_version: values.policy_version.trim(),
          policy_type: values.policy_code.trim(),
          policy_content: values.policy_content.trim(),
          effective_from: effectiveFromDate,
          effective_to: effectiveToDate,
          active_yn: 'Y'
        }),
      });

      if (response.status === 401) return handleAuthError();
      if (response.ok) {
        message.success('새로운 회사 정책이 성공적으로 등록되었습니다!');
        setIsPolicyModalOpen(false);
        policyForm.resetFields();
        fetchDashboardData(token);
      } else {
        const errData = await response.json();
        message.error(`등록 실패: ${errData.detail || '권한이 없습니다.'}`);
      }
    } catch (error) {
      message.error('서버 통신 중 에러가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    message.success('로그아웃 되었습니다.');
    navigate('/admin/login');
  };

  const renderActiveContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <>
            <DashboardHome summary={summary} orders={orders} refundRequests={refundRequests} inquiries={inquiries} users={users} inventories={inventories} onNavigate={(tabKey) => setActiveTab(tabKey)} />
            
            {/* ====== DB 관리 열기 섹션 ====== */}
            <div style={{ border: '2px solid #f97316', padding: '20px', borderRadius: '8px', marginTop: '40px', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: 'teal', fontWeight: 'bold' }}>데이터 운영</span>
                  <h2 style={{ margin: '5px 0 0 0' }}>별도 DB 관리 화면</h2>
                </div>
                <p style={{ color: '#666', margin: 0 }}>원본 테이블 검색, CRUD, 행 상세 조회는 `/dbAdmin` 경로에서 처리합니다.</p>
              </div>
              
              <div style={{ border: '1px solid #eee', padding: '20px', borderRadius: '8px', marginTop: '20px', width: '350px' }}>
                <span style={{ color: 'teal', fontSize: '12px', fontWeight: 'bold', backgroundColor: '#e6fffa', padding: '4px 8px', borderRadius: '4px' }}>전용 경로</span>
                <h3 style={{ margin: '15px 0' }}>`/dbAdmin`</h3>
                <p style={{ fontSize: '14px', color: '#555', marginBottom: '20px', lineHeight: '1.5' }}>
                  본사 전용 화면에서 허용된 모든 테이블을 검색하고 수정할 수 있습니다.
                </p>
                <button 
                  onClick={() => navigate('/dbAdmin')} 
                  style={{ backgroundColor: '#f97316', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
                >
                  DB 관리 열기
                </button>
              </div>
            </div>
            {/* ====== DB 관리 열기 섹션 끝 ====== */}
          </>
        );
      case 'orders':
        return (
          <Card title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>주문 목록</span>} variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
            <OrderTable 
              orders={orders} 
              users={users} 
              organizations={organizations} 
              userInfo={userInfo} 
              onStatusChange={handleOrderStatusChange} 
              loading={loading} 
            />
          </Card>
        );
      case 'users':
        return (
          <Card 
            title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>회원 목록</span>} 
            variant="borderless" 
            style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
            extra={userInfo.orgType === 'HEADQUARTER' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsRegModalOpen(true)} style={{ background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>신규 등록 (지점/회원)</Button>}
          >
            <UserTable users={users} organizations={organizations} onStatusChange={handleUserStatusChange} onDelete={handleDeleteUser} loading={loading} userInfo={userInfo} />
          </Card>
        );
      case 'inventory':
        return (
          <Card 
            title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>재고 현황</span>} 
            variant="borderless" 
            style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
            extra={(userInfo.orgType === 'HEADQUARTER' || userInfo.orgType === 'BRANCH') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsProductModalOpen(true)} style={{ background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>신규 상품 등록</Button>}
          >
            <InventoryTable inventories={inventories} products={products} organizations={organizations} userInfo={userInfo} onAdjustStock={handleInventoryAdjust} onAdjustPrice={handleSalePriceAdjust} loading={loading} />
          </Card>
        );
      case 'support':
        return (
          <Card title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>1:1 문의</span>} variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
            <SupportTable inquiries={inquiries} users={users} organizations={organizations} userInfo={userInfo} onAnswer={handleOpenAnswerModal} loading={loading} />
          </Card>
        );
      case 'refunds':
        return (
          <Card title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>교환/환불/정산 관리</span>} variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
            <RefundTable refundPolicies={refundPolicies} refundRequests={refundRequests} users={users} organizations={organizations} userInfo={userInfo} onApprove={handleApproveRefund} onReject={handleRejectRefund} loading={loading} />
          </Card>
        );
      case 'policies':
        return (
          <Card 
            title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>회사 정책</span>} 
            variant="borderless" 
            style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
            extra={userInfo.orgType === 'HEADQUARTER' && <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsPolicyModalOpen(true)} style={{ background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>신규 회사 정책 등록</Button>}
          >
            <PolicyTable companyPolicies={companyPolicies} loading={loading} />
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#FAFAF9' }}>
      
      {/* 사이드바 */}
      <Sider 
        width={250} 
        theme="light" 
        style={{ background: '#F4F3F1', borderRight: '1px solid #E5E4E0', boxShadow: '1px 0 4px rgba(0,0,0,0.02)', zIndex: 10 }}
      >
        <div style={{ height: '70px', display: 'flex', alignItems: 'center', paddingLeft: '24px', borderBottom: '1px solid #EAE8E4', cursor: 'pointer' }} onClick={() => setActiveTab('home')}>
          <Title level={5} style={{ margin: 0, color: '#37352F', fontWeight: 600, letterSpacing: '-0.5px', fontSize: '15px' }}>
            <ShopOutlined style={{ marginRight: 8, color: '#37352F' }} /> ShopDB Workspace
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeTab]}
          onClick={(e) => setActiveTab(e.key)}
          style={{ background: 'transparent', borderRight: 0, padding: '12px 10px', fontWeight: 500 }}
          items={[
            { key: 'home', icon: <HomeOutlined style={{ fontSize: '15px', color: '#666' }} />, label: '대시보드 홈' },
            { key: 'orders', icon: <ShoppingCartOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `주문 관리 (${orders.length})` },
            { key: 'users', icon: <UserOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `회원/조직 (${users.length})` },
            { key: 'inventory', icon: <AppstoreOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `상품/재고 (${inventories.length})` },
            { key: 'support', icon: <MessageOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `고객 문의 (${inquiries.length})` },
            { key: 'refunds', icon: <PayCircleOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `교환/환불/정산 (${refundRequests.filter(req => req.refund_status === 'REQUESTED').length})` },
            { key: 'policies', icon: <FileTextOutlined style={{ fontSize: '15px', color: '#666' }} />, label: '회사 정책' },
          ]}
        />
      </Sider>

      <Layout style={{ background: '#FAFAF9' }}>
        
        {/* 상단 헤더 */}
        <Header 
          style={{ background: '#FFFFFF', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE8E4', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', height: '70px', zIndex: 9 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text style={{ color: '#888', fontSize: '13px', fontWeight: 500 }}>Workspace</Text>
            <span style={{ color: '#ccc' }}>/</span>
            <Title level={5} style={{ margin: 0, color: '#37352F', fontWeight: 600, fontSize: '14px' }}>
              {activeTab === 'home' ? '대시보드 홈' : 
               activeTab === 'orders' ? '주문 관리' : 
               activeTab === 'users' ? '회원 및 조직 관리' : 
               activeTab === 'inventory' ? '상품 및 재고 관리' : 
               activeTab === 'support' ? '고객 1:1 문의' : 
               activeTab === 'refunds' ? '교환/환불/정산 관리' : '회사 정책 관리'}
            </Title>
          </div>
          <Space size="middle">
            <Text style={{ color: '#555', fontSize: '13px', background: '#F4F3F1', padding: '5px 12px', borderRadius: '6px', border: '1px solid #EAE8E4' }}>
              <b>{userInfo.name}</b> 님
            </Text>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout} style={{ color: '#777', fontSize: '13px' }}>로그아웃</Button>
          </Space>
        </Header>

        {/* 컨텐츠 렌더링 영역 */}
        <Content style={{ margin: '32px', overflow: 'initial' }}>
          {renderActiveContent()}
        </Content>

        {/* 1. 회원/지점 통합 신규 등록 모달 */}
        <Modal
          title={<span style={{ fontWeight: 600, color: '#37352F' }}>통합 신규 등록</span>}
          open={isRegModalOpen}
          onCancel={() => { setIsRegModalOpen(false); userForm.resetFields(); orgForm.resetFields(); }}
          footer={null} 
          destroyOnHidden
        >
          <Tabs
            activeKey={regModalTab}
            onChange={(key) => setRegModalTab(key)}
            items={[
              {
                key: 'org',
                label: '신규 지점 생성',
                children: (
                  <Form form={orgForm} layout="vertical" onFinish={handleCreateOrgSubmit} style={{ marginTop: 10 }}>
                    <Form.Item name="org_code" label="지점 코드" rules={[{ required: true, message: '코드를 입력해주세요.' }]}>
                      <Input placeholder="예: BR003" />
                    </Form.Item>
                    <Form.Item name="org_name" label="지점명" rules={[{ required: true, message: '지점명을 입력해주세요.' }]}>
                      <Input placeholder="예: 스마트쇼핑 제주지사" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ marginTop: 10, background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>지점 생성하기</Button>
                  </Form>
                )
              },
              {
                key: 'user',
                label: '신규 회원 (관리자) 등록',
                children: (
                  <Form form={userForm} layout="vertical" onFinish={handleCreateUserSubmit} style={{ marginTop: 10 }}>
                    <Form.Item name="login_id" label="아이디" rules={[{ required: true, message: '아이디를 입력해주세요.' }]}>
                      <Input placeholder="예: manager_jeju" />
                    </Form.Item>
                    <Form.Item name="password" label="비밀번호" rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}>
                      <Input.Password placeholder="임시 비밀번호 입력" />
                    </Form.Item>
                    <Form.Item name="user_name" label="이름" rules={[{ required: true, message: '이름을 입력해주세요.' }]}>
                      <Input placeholder="예: 제주 지점장" />
                    </Form.Item>
                    <Form.Item name="email" label="이메일" rules={[{ required: true, type: 'email', message: '유효한 이메일을 입력해주세요.' }]}>
                      <Input placeholder="예: jeju@shopdb.com" />
                    </Form.Item>
                    <Form.Item name="phone" label="연락처">
                      <Input placeholder="예: 010-1234-5678" />
                    </Form.Item>
                    <Form.Item name="org_id" label="소속 조직 (지점 발령)" rules={[{ required: true, message: '소속 조직을 선택해주세요.' }]}>
                      <Select placeholder="권한 및 소속 조직 선택">
                        {organizations.map(org => (
                          <Option key={org.org_id} value={org.org_id}>
                            {org.org_name} (ID: {org.org_id})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block style={{ marginTop: 10, background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>회원 등록하기</Button>
                  </Form>
                )
              }
            ]}
          />
        </Modal>

        {/* 2. 신규 상품 등록 모달 */}
        <Modal
          title={<span style={{ fontWeight: 600, color: '#37352F' }}>신규 상품 등록</span>}
          open={isProductModalOpen}
          onCancel={() => { setIsProductModalOpen(false); productForm.resetFields(); }}
          footer={null} 
          destroyOnHidden
        >
          <Form form={productForm} layout="vertical" onFinish={handleCreateProductSubmit} style={{ marginTop: 10 }}>
            <Form.Item name="product_name" label="상품명" rules={[{ required: true, message: '상품명을 입력해주세요.' }]}>
              <Input placeholder="예: 프리미엄 무선 게이밍 마우스" />
            </Form.Item>
            <Form.Item name="product_code" label="상품 코드" rules={[{ required: true, message: '상품 코드를 입력해주세요.' }]}>
                      <Input placeholder="예: P2026-001" />
            </Form.Item>
            <Form.Item name="regular_price" label="정가 (원)" rules={[{ required: true, message: '정가를 입력해주세요.' }]}>
              <Input type="number" placeholder="예: 100000" />
            </Form.Item>
            <Form.Item name="sale_price" label="세일가 (원)" rules={[{ required: true, message: '세일가를 입력해주세요.' }]}>
              <Input type="number" placeholder="예: 90000" />
            </Form.Item>
            <Form.Item name="short_description" label="간단 설명">
              <Input placeholder="상품 요약 설명을 입력하세요" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ marginTop: 10, background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>상품 등록하기</Button>
          </Form>
        </Modal>

        {/* 3. 1:1 고객 문의 답변 작성 모달 */}
        <Modal
          title={<span style={{ fontWeight: 600, color: '#37352F' }}>1:1 문의 답변 작성</span>}
          open={isAnswerModalOpen}
          onCancel={() => { setIsAnswerModalOpen(false); answerForm.resetFields(); }}
          footer={null} 
          destroyOnHidden
        >
          <Form form={answerForm} layout="vertical" onFinish={handleAnswerSubmit} style={{ marginTop: 10 }}>
            <Form.Item name="answer_content" label="답변 내용" rules={[{ required: true, message: '답변 내용을 입력해주세요.' }]}>
              <TextArea rows={4} placeholder="고객 문의에 대한 답변 내용을 상세히 입력하세요." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ marginTop: 10, background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>답변 등록하기</Button>
          </Form>
        </Modal>

        {/* 4. 신규 회사 정책 등록 모달 */}
        <Modal
          title={<span style={{ fontWeight: 600, color: '#37352F' }}>신규 회사 정책 등록</span>}
          open={isPolicyModalOpen}
          onCancel={() => { setIsPolicyModalOpen(false); policyForm.resetFields(); }}
          footer={null} 
          destroyOnHidden
        >
          <Form form={policyForm} layout="vertical" onFinish={handleCreatePolicySubmit} style={{ marginTop: 10 }}>
            <Form.Item name="policy_code" label="정책 코드" rules={[{ required: true, message: '정책 코드를 선택해주세요.' }]}>
              <Select placeholder="정책 코드 선택">
                <Option value="TERMS">TERMS (이용약관)</Option>
                <Option value="PRIVACY">PRIVACY (개인정보처리방침)</Option>
                <Option value="REFUND">REFUND (환불/교환 정책)</Option>
                <Option value="SHIPPING">SHIPPING (배송 정책)</Option>
              </Select>
            </Form.Item>
            <Form.Item name="policy_name" label="정책명" rules={[{ required: true, message: '정책명을 입력해주세요.' }]}>
              <Input placeholder="예: 2026 쇼핑몰 이용약관" />
            </Form.Item>
            <Form.Item name="policy_version" label="정책 버전" rules={[{ required: true, message: '버전을 입력해주세요.' }]}>
              <Input placeholder="예: 2026.2" />
            </Form.Item>
            <Form.Item name="effective_from" label="효력 발생일 (시행일)" rules={[{ required: true, message: '효력 발생일을 선택해주세요.' }]}>
              <DatePicker style={{ width: '100%' }} placeholder="시행일 선택" />
            </Form.Item>
            <Form.Item name="effective_to" label="효력 마감일 (선택사항)">
              <DatePicker style={{ width: '100%' }} placeholder="마감일 선택 (상시 적용인 경우 비워두세요)" />
            </Form.Item>
            <Form.Item name="policy_content" label="정책 내용" rules={[{ required: true, message: '정책 내용을 입력해주세요.' }]}>
              <TextArea rows={4} placeholder="정책 상세 내용을 입력하세요." />
            </Form.Item>
            <Button type="primary" htmlType="submit" block style={{ marginTop: 10, background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>정책 등록하기</Button>
          </Form>
        </Modal>

      </Layout>
    </Layout>
  );
}
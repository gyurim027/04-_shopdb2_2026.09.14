import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layout, Menu, Button, Card, Row, Col, Statistic, message, Space, Typography,
  Modal, Form, Input, Select, Tabs 
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
  });

  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regModalTab, setRegModalTab] = useState('user');
  
  const [userForm] = Form.useForm();
  const [orgForm] = Form.useForm();

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

      if (meRes.ok) {
        const meData = await meRes.json();
        currentName = meData.user_name || currentName;
        currentOrgId = meData.org_id || '';
        currentOrgType = meData.org_id && meData.org_id !== 1 ? 'BRANCH' : 'HEADQUARTER';
      }
      setUserInfo({ name: currentName, orgType: currentOrgType, orgId: currentOrgId });

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

  const handleAnswerInquiry = (inquiryId, currentAnswer) => {
    const answerContent = prompt(`답변 내용:`, currentAnswer || '');
    if (answerContent) handleAction(`/api/admin/support/inquiries/${inquiryId}/answer`, 'PATCH', { answer_content: answerContent.trim(), inquiry_status: 'ANSWERED' }, '답변이 등록되었습니다.');
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

  const handleCreateProduct = () => {
    if (userInfo.orgType !== 'HEADQUARTER') return message.warning('본사 최고관리자만 가능합니다.');
    const productName = prompt('상품명을 입력하세요:');
    if (!productName) return;
    const productCode = prompt('상품 코드 입력:', 'P2026' + Math.floor(Math.random() * 10000));
    if (!productCode) return;
    const regularPrice = prompt('정가 입력:', '100000');
    if (!regularPrice) return;
    const salePrice = prompt('세일가 입력:', '90000');
    if (!salePrice) return;

    handleAction('/api/admin/products/products', 'POST', {
      seller_user_id: 2, category_id: 1,
      product_code: productCode.trim(), product_name: productName.trim(),
      short_description: '관리자 콘솔 등록 상품', description: '신규 등록 상품 상세 설명',
      regular_price: parseFloat(regularPrice), sale_price: parseFloat(salePrice),
      product_status: 'SALE', variants: [], images: []
    }, '신규 상품이 등록되었습니다!');
  };

  const handleCreateCompanyPolicy = () => {
    if (userInfo.orgType !== 'HEADQUARTER') return message.warning('본사 최고관리자만 가능합니다.');
    const policyCode = prompt('정책 코드 입력 (TERMS, REFUND 등):', 'TERMS');
    if (!policyCode) return;
    const policyName = prompt('정책명 입력:', '2026 쇼핑몰 이용약관');
    if (!policyName) return;
    const policyVersion = prompt('정책 버전 입력:', '2026.2');
    if (!policyVersion) return;
    const policyContent = prompt('정책 내용 입력:', '정책 내용입니다.');
    if (!policyContent) return;

    handleAction('/api/admin/support/policies', 'POST', {
      policy_code: policyCode.trim(), policy_name: policyName.trim(),
      policy_version: policyVersion.trim(), policy_type: policyCode.trim(),
      policy_content: policyContent.trim(), effective_from: new Date().toISOString().split('T')[0], active_yn: 'Y'
    }, '새로운 회사 정책이 등록되었습니다!');
  };

  const handleLogout = () => {
    localStorage.clear();
    message.success('로그아웃 되었습니다.');
    navigate('/admin/login');
  };

  // 💡 탭별 화면 렌더링 함수 (주문 관리 화면 명확히 포함)
  const renderActiveContent = () => {
    switch(activeTab) {
      case 'home':
        return <DashboardHome summary={summary} orders={orders} refundRequests={refundRequests} inquiries={inquiries} users={users} inventories={inventories} onNavigate={(tabKey) => setActiveTab(tabKey)} />;
      case 'orders':
        return (
          <Card title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>주문 목록</span>} variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
            <OrderTable orders={orders} users={users} onStatusChange={handleOrderStatusChange} loading={loading} />
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
            <UserTable users={users} organizations={organizations} onStatusChange={handleUserStatusChange} onDelete={handleDeleteUser} loading={loading} />
          </Card>
        );
      case 'inventory':
        return (
          <Card 
            title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>재고 현황</span>} 
            variant="borderless" 
            style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
            extra={userInfo.orgType === 'HEADQUARTER' && <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProduct} style={{ background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>신규 상품 등록</Button>}
          >
            <InventoryTable inventories={inventories} products={products} organizations={organizations} userInfo={userInfo} onAdjustStock={handleInventoryAdjust} onAdjustPrice={handleSalePriceAdjust} loading={loading} />
          </Card>
        );
      case 'support':
        return (
          <Card title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>1:1 문의</span>} variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
            <SupportTable inquiries={inquiries} users={users} onAnswer={handleAnswerInquiry} loading={loading} />
          </Card>
        );
      case 'refunds':
        return <RefundTable refundPolicies={refundPolicies} refundRequests={refundRequests} users={users} onApprove={handleApproveRefund} onReject={handleRejectRefund} loading={loading} />;
      case 'policies':
        return (
          <Card 
            title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>회사 정책</span>} 
            variant="borderless" 
            style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
            extra={userInfo.orgType === 'HEADQUARTER' && <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCompanyPolicy} style={{ background: '#37352F', borderColor: '#37352F', borderRadius: '6px' }}>신규 회사 정책 등록</Button>}
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
            { key: 'refunds', icon: <PayCircleOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `환불/정산 (${refundRequests.length})` },
            { key: 'policies', icon: <FileTextOutlined style={{ fontSize: '15px', color: '#666' }} />, label: `회사 정책 (${companyPolicies.length})` },
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
               activeTab === 'refunds' ? '환불 및 정산 관리' : '회사 정책 관리'}
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

      </Layout>
    </Layout>
  );
}
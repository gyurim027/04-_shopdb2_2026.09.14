import React from 'react';
import { Card, Row, Col, Typography, Statistic, Space, Tag } from 'antd';
import {
  ShoppingCartOutlined, UserOutlined, AppstoreOutlined,
  MessageOutlined, PayCircleOutlined, FileTextOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function DashboardHome({ summary, orders, refundRequests, inquiries, users, inventories, onNavigate }) {
  // 1. 주문 상태별 실제 건수 계산
  const paidCount = orders.filter(o => (o.status || o.order_status) === 'PAID').length;
  const completedCount = orders.filter(o => (o.status || o.order_status) === 'COMPLETED').length;
  const pendingCount = orders.filter(o => (o.status || o.order_status) === 'PAYMENT_PENDING').length;
  
  // 💡 총 주문 건수 (summary 값이 없거나 0이어도 orders 배열 길이로 안전하게 보정)
  const totalOrdersCount = summary?.total_orders_count || orders.length;

  // 2. 미답변 고객 문의 실제 건수 계산
  const unansweredCount = inquiries.filter(i => (i.inquiry_status || i.status) !== 'ANSWERED').length;

  // 3. 💡 환불 요청 상태별 건수 계산 (대기 중인 요청 / 전체 요청)
  const pendingRefunds = refundRequests.filter(r => (r.refund_status || r.status) === 'REQUESTED').length;

  const menuCards = [
    { 
      key: 'orders', 
      title: '주문 관리', 
      desc: '고객 주문 현황 및 상태 일괄 관리', 
      icon: <ShoppingCartOutlined style={{ fontSize: '24px', color: '#2383E2' }} />, 
      subInfo: (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Tag color="blue" style={{ margin: 0 }}>결제완료 {paidCount}</Tag>
          <Tag color="green" style={{ margin: 0 }}>구매확정 {completedCount}</Tag>
          <Tag color="orange" style={{ margin: 0 }}>대기 {pendingCount}</Tag>
        </div>
      ),
      // 💡 실제 총 주문 건수 표기
      count: `${totalOrdersCount}건`, 
      bg: '#F0F7FF' 
    },
    { 
      key: 'users', 
      title: '회원 및 조직', 
      desc: '회원 정보, 지점 관리 및 권한 설정', 
      icon: <UserOutlined style={{ fontSize: '24px', color: '#37352F' }} />, 
      subInfo: <Text type="secondary" style={{ fontSize: '12px' }}>총 회원 {users.length}명 등록됨</Text>,
      count: `${users.length}명`, 
      bg: '#F4F3F1' 
    },
    { 
      key: 'inventory', 
      title: '상품 및 재고', 
      desc: '지점별 재고 수량 및 세일가 조정', 
      icon: <AppstoreOutlined style={{ fontSize: '24px', color: '#D9730D' }} />, 
      subInfo: summary?.low_stock_count > 0 ? 
        <Tag color="error" style={{ margin: 0 }}>재고 부족 {summary.low_stock_count}개</Tag> : 
        <Tag color="success" style={{ margin: 0 }}>재고 원활</Tag>,
      count: `${inventories.length}개 SKU`, 
      bg: '#FEF3EC' 
    },
    { 
      key: 'support', 
      title: '고객 1:1 문의', 
      desc: '고객 문의 내역 확인 및 답변 작성', 
      icon: <MessageOutlined style={{ fontSize: '24px', color: '#722ED1' }} />, 
      subInfo: unansweredCount > 0 ? 
        <Tag color="warning" style={{ margin: 0 }}>미답변 {unansweredCount}건 대기중</Tag> : 
        <Tag color="success" style={{ margin: 0 }}>모든 문의 답변완료</Tag>,
      count: `총 ${inquiries.length}건`, 
      bg: '#F9F0FF' 
    },
    { 
      key: 'refunds', 
      title: '환불 및 정산', 
      desc: '고객 환불 요청 승인 및 반려 처리', 
      icon: <PayCircleOutlined style={{ fontSize: '24px', color: '#52C41A' }} />, 
      // 💡 환불 요청 건수가 몇 건인지 태그로 시인성 있게 표시
      subInfo: pendingRefunds > 0 ? 
        <Tag color="warning" style={{ margin: 0 }}>환불요청 {pendingRefunds}건 대기중</Tag> : 
        <Tag color="success" style={{ margin: 0 }}>처리할 환불 없음</Tag>,
      count: `총 ${refundRequests.length}건`, 
      bg: '#F6FFED' 
    },
    { 
      key: 'policies', 
      title: '회사 정책 관리', 
      desc: '이용약관 및 환불/회사 정책 버전 관리', 
      icon: <FileTextOutlined style={{ fontSize: '24px', color: '#EB2F96' }} />, 
      subInfo: <Text type="secondary" style={{ fontSize: '12px' }}>약관 버전 및 시행일 설정</Text>,
      count: '등록', 
      bg: '#FFF0F6' 
    },
  ];

  return (
    <div>
      {/* 상단 요약 배너 */}
      {summary && (
        <Row gutter={20} style={{ marginBottom: 28 }}>
          <Col span={6}>
            <Card variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
              <Statistic title={<span style={{ color: '#777', fontSize: '13px', fontWeight: 500 }}>총 주문 건수</span>} value={summary.total_orders_count} suffix="건" valueStyle={{ color: '#37352F', fontWeight: 600, fontSize: '22px' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
              <Statistic title={<span style={{ color: '#777', fontSize: '13px', fontWeight: 500 }}>총 매출액</span>} value={summary.total_sales_amount} suffix="원" valueStyle={{ color: '#2383E2', fontWeight: 600, fontSize: '22px' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
              <Statistic title={<span style={{ color: '#777', fontSize: '13px', fontWeight: 500 }}>재고 부족 경고</span>} value={summary.low_stock_count} suffix="개" valueStyle={{ color: '#D9730D', fontWeight: 600, fontSize: '22px' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card variant="borderless" style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}>
              <Statistic title={<span style={{ color: '#777', fontSize: '13px', fontWeight: 500 }}>미답변 문의</span>} value={summary.unanswered_inquiries_count} suffix="건" valueStyle={{ color: '#E03E3E', fontWeight: 600, fontSize: '22px' }} />
            </Card>
          </Col>
        </Row>
      )}

      {/* 포털형 카드 그리드 섹션 */}
      <Card 
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '16px' }}>관리자 포털 서비스 바로가기</span>}
        variant="borderless"
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 4px rgba(0,0,0,0.03), 0 0 0 1px #EAE8E4' }}
      >
        <Row gutter={[20, 20]}>
          {menuCards.map((card) => (
            <Col span={8} key={card.key}>
              <div 
                onClick={() => onNavigate(card.key)}
                style={{ 
                  background: card.bg, 
                  border: '1px solid #EAE8E4', 
                  borderRadius: '12px', 
                  padding: '24px', 
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '175px' 
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <Space size="middle">
                      <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                        {card.icon}
                      </div>
                      <div>
                        <Title level={5} style={{ margin: 0, color: '#37352F', fontSize: '15px' }}>{card.title}</Title>
                        <Text type="secondary" style={{ fontSize: '12px' }}>{card.desc}</Text>
                      </div>
                    </Space>
                  </div>
                  <div style={{ marginTop: '10px', paddingLeft: '52px' }}>
                    {card.subInfo}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px', marginTop: '14px' }}>
                  <Text strong style={{ fontSize: '13px', color: '#37352F' }}>{card.count}</Text>
                  <Text style={{ fontSize: '13px', color: '#2383E2', fontWeight: 500 }}>바로가기 <ArrowRightOutlined style={{ fontSize: '11px' }} /></Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
}
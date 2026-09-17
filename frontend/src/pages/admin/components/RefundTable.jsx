import React from 'react';
import { Table, Tag, Button, Space, Typography, Card } from 'antd';

const { Text } = Typography;

export default function RefundTable({ refundPolicies, refundRequests, users, onApprove, onReject, loading }) {
  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  const policyColumns = [
    { title: '정책 ID', dataIndex: 'refund_policy_id', width: 90, align: 'center' },
    { title: '정책명', dataIndex: 'policy_name', width: 200 },
    { title: '환불 허용일', width: 160, render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>수령 후 {r.allowed_days}일 이내</span> },
    { title: '택배비 부담', dataIndex: 'shipping_fee_payer', width: 130, align: 'center' },
    { title: '활성 여부', dataIndex: 'active_yn', width: 110, align: 'center', render: s => <Tag color={s === 'Y' ? 'success' : 'default'}>{s === 'Y' ? '활성' : '비활성'}</Tag> },
  ];

  const requestColumns = [
    { title: '요청 ID', dataIndex: 'refund_request_id', width: 90, align: 'center' },
    { title: '주문 ID', dataIndex: 'order_id', width: 90, align: 'center' },
    { title: '회원명 (번호)', width: 170, render: (_, r) => <Text strong style={{ whiteSpace: 'nowrap' }}>{getUserName(r.buyer_user_id)}</Text> },
    { title: '환불 사유', dataIndex: 'refund_reason', width: 250, render: t => t || '-' },
    { title: '요청 금액', width: 140, align: 'right', render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>{Number(r.requested_amount || 0).toLocaleString()} 원</span> },
    { title: '상태', dataIndex: 'refund_status', width: 120, align: 'center', render: s => <Tag color={s === 'REQUESTED' ? 'warning' : s === 'APPROVED' ? 'blue' : 'error'}>{s}</Tag> },
    { title: '작업', width: 150, align: 'center', render: (_, r) => (
      r.refund_status === 'REQUESTED' ? (
        <Space size="small">
          <Button size="small" type="primary" style={{ backgroundColor: '#52c41a' }} onClick={() => onApprove(r.refund_request_id)}>승인</Button>
          <Button size="small" danger onClick={() => onReject(r.refund_request_id)}>반려</Button>
        </Space>
      ) : <Text type="secondary" style={{ fontSize: 12 }}>처리 완료</Text>
    )},
  ];

  return (
    <>
      <Card 
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '15px' }}>등록된 환불 정책 목록</span>} 
        variant="borderless" 
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #E9E8E4', marginBottom: 24 }}
      >
        <Table columns={policyColumns} dataSource={refundPolicies} rowKey="refund_policy_id" loading={loading} pagination={false} size="small" scroll={{ x: 700 }} />
      </Card>
      
      <Card 
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '15px' }}>고객 환불 요청 내역 및 처리</span>} 
        variant="borderless" 
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #E9E8E4' }}
      >
        <Table columns={requestColumns} dataSource={refundRequests} rowKey="refund_request_id" loading={loading} pagination={{ pageSize: 5 }} size="middle" scroll={{ x: 1000 }} />
      </Card>
    </>
  );
}
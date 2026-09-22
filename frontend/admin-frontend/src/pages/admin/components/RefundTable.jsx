import React, { useState } from 'react';
import { Table, Tag, Button, Space, Typography, Card, Radio, Tabs, Badge } from 'antd';

const { Text } = Typography;

export default function RefundTable({ 
  refundPolicies, 
  refundRequests, 
  exchangeRequests = [], 
  users, 
  organizations = [], 
  userInfo, 
  onApprove, 
  onReject, 
  onApproveExchange, 
  onRejectExchange,  
  loading 
}) {
  const [selectedOrgId, setSelectedOrgId] = useState('all');
  const [activeTab, setActiveTab] = useState('refund');

  const branchOrganizations = organizations ? organizations.filter(org => Number(org.org_id) !== 1) : [];

  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  const filteredRefundRequests = (userInfo?.orgType === 'HEADQUARTER')
    ? refundRequests.filter(req => {
        const user = users.find(u => Number(u.user_id) === Number(req.buyer_user_id));
        const orgId = user ? user.org_id : null;
        if (Number(orgId) === 1) return false;
        if (selectedOrgId !== 'all') {
          return Number(orgId) === Number(selectedOrgId);
        }
        return true;
      })
    : refundRequests;

  const filteredExchangeRequests = (userInfo?.orgType === 'HEADQUARTER')
    ? exchangeRequests.filter(req => {
        const user = users.find(u => Number(u.user_id) === Number(req.buyer_user_id));
        const orgId = user ? user.org_id : null;
        if (Number(orgId) === 1) return false;
        if (selectedOrgId !== 'all') {
          return Number(orgId) === Number(selectedOrgId);
        }
        return true;
      })
    : exchangeRequests;

  const policyColumns = [
    { title: '정책 ID', dataIndex: 'refund_policy_id', width: 90, align: 'center' },
    { title: '정책명', dataIndex: 'policy_name', width: 180, render: t => <Text strong>{t || '-'}</Text> },
    { title: '환불 허용일', width: 150, render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>수령 후 {r.allowed_days}일 이내</span> },
    { title: '시행일', dataIndex: 'effective_from', width: 110, align: 'center', render: d => d || '-' },
    { title: '마감일', dataIndex: 'effective_to', width: 110, align: 'center', render: d => d ? d : <Text type="secondary">상시 적용</Text> },
    { title: '택배비 부담', dataIndex: 'shipping_fee_payer', width: 120, align: 'center', render: t => t || '-' },
    { title: '활성 여부', dataIndex: 'active_yn', width: 100, align: 'center', render: s => <Tag color={s === 'Y' ? 'success' : 'default'}>{s === 'Y' ? '활성' : '비활성'}</Tag> },
  ];

  const refundRequestColumns = [
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

  const exchangeRequestColumns = [
    { title: '교환 ID', dataIndex: 'exchange_request_id', width: 90, align: 'center' },
    { title: '주문 ID', dataIndex: 'order_id', width: 90, align: 'center' },
    { title: '회원명 (번호)', width: 170, render: (_, r) => <Text strong style={{ whiteSpace: 'nowrap' }}>{getUserName(r.buyer_user_id)}</Text> },
    { title: '교환 사유', dataIndex: 'exchange_reason', width: 250, render: t => t || '-' },
    { title: '상태', dataIndex: 'exchange_status', width: 120, align: 'center', render: s => <Tag color={s === 'REQUESTED' ? 'warning' : s === 'APPROVED' ? 'blue' : 'error'}>{s}</Tag> },
    { title: '작업', width: 150, align: 'center', render: (_, r) => (
      r.exchange_status === 'REQUESTED' ? (
        <Space size="small">
          <Button size="small" type="primary" style={{ backgroundColor: '#52c41a' }} onClick={() => onApproveExchange(r.exchange_request_id)}>승인</Button>
          <Button size="small" danger onClick={() => onRejectExchange(r.exchange_request_id)}>반려</Button>
        </Space>
      ) : <Text type="secondary" style={{ fontSize: '12px' }}>처리 완료</Text>
    )},
  ];

  const pendingRefundsTabCount = filteredRefundRequests.filter(r => r.refund_status === 'REQUESTED').length;
  const pendingExchangesTabCount = filteredExchangeRequests.filter(r => r.exchange_status === 'REQUESTED').length;

  return (
    <>
      <Card 
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '15px' }}>등록된 환불 정책 목록 (행을 클릭해 상세 내용을 확인하세요)</span>} 
        variant="borderless" 
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #E9E8E4', marginBottom: 24 }}
      >
        <Table 
          columns={policyColumns} 
          dataSource={refundPolicies || []} 
          rowKey={(record) => record.refund_policy_id || record.policy_id || Math.random()} 
          loading={loading} 
          pagination={false} 
          size="small" 
          scroll={{ x: 800 }} 
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ margin: 0, padding: '12px 24px', background: '#FAFAF9', borderRadius: '8px', border: '1px solid #EAE8E4' }}>
                <Text strong style={{ display: 'block', marginBottom: 4, color: '#37352F' }}>[환불 정책 상세 설명]</Text>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#555', lineHeight: '1.6' }}>
                  {record.refund_policy_text || record.policy_content || '등록된 상세 설명이 없습니다.'}
                </p>
              </div>
            ),
            rowExpandable: (record) => !!(record.refund_policy_text || record.policy_content),
          }}
        />
      </Card>

      <Card 
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '15px' }}>고객 요청 내역 및 처리</span>} 
        variant="borderless" 
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #E9E8E4' }}
      >
        {/* 스타일 수정: display: flex와 justifyContent: 'center' 추가 */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={[
              { 
                key: 'refund', 
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 'normal' }}>
                    <span>고객 환불 요청 내역 및 처리</span>
                    <Badge count={pendingRefundsTabCount} style={{ backgroundColor: '#faad14' }} />
                  </div>
                ) 
              },
              { 
                key: 'exchange', 
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 'normal' }}>
                    <span>고객 교환 요청 내역 및 처리</span>
                    <Badge count={pendingExchangesTabCount} style={{ backgroundColor: '#52c41a' }} />
                  </div>
                ) 
              }
            ]}
          />
        </div>

        {userInfo?.orgType === 'HEADQUARTER' && branchOrganizations.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Radio.Group value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} buttonStyle="solid">
              <Radio.Button value="all">
                전체 보기 ({activeTab === 'refund' ? refundRequests.filter(req => {
                  const u = users.find(x => Number(x.user_id) === Number(req.buyer_user_id));
                  return Number(u ? u.org_id : null) !== 1;
                }).length : exchangeRequests.filter(req => {
                  const u = users.find(x => Number(x.user_id) === Number(req.buyer_user_id));
                  return Number(u ? u.org_id : null) !== 1;
                }).length})
              </Radio.Button>
              {branchOrganizations.map(org => {
                const count = activeTab === 'refund' ? refundRequests.filter(req => {
                  const u = users.find(x => Number(x.user_id) === Number(req.buyer_user_id));
                  return Number(u ? u.org_id : null) === Number(org.org_id);
                }).length : exchangeRequests.filter(req => {
                  const u = users.find(x => Number(x.user_id) === Number(req.buyer_user_id));
                  return Number(u ? u.org_id : null) === Number(org.org_id);
                }).length;

                return (
                  <Radio.Button key={org.org_id} value={org.org_id}>
                    {org.org_name} ({count})
                  </Radio.Button>
                );
              })}
            </Radio.Group>
          </div>
        )}

        {activeTab === 'refund' ? (
          <Table columns={refundRequestColumns} dataSource={filteredRefundRequests || []} rowKey="refund_request_id" loading={loading} pagination={{ pageSize: 5 }} size="middle" scroll={{ x: 1000 }} />
        ) : (
          <Table columns={exchangeRequestColumns} dataSource={filteredExchangeRequests || []} rowKey="exchange_request_id" loading={loading} pagination={{ pageSize: 5 }} size="middle" scroll={{ x: 1000 }} />
        )}
      </Card>
    </>
  );
}
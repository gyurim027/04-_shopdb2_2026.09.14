import React, { useState } from 'react';
import { Table, Tag, Button, Space, Typography, Card, Radio } from 'antd';

const { Text } = Typography;

export default function RefundTable({ refundPolicies, refundRequests, users, organizations = [], userInfo, onApprove, onReject, loading }) {
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  // 본사(1번)를 제외한 지사 목록만 필터링 탭에 사용
  const branchOrganizations = organizations ? organizations.filter(org => Number(org.org_id) !== 1) : [];

  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  // 환불 요청 내역 필터링 (본사 제외 및 선택된 지사별 분류)
  const filteredRequests = (userInfo?.orgType === 'HEADQUARTER')
    ? refundRequests.filter(req => {
        const user = users.find(u => Number(u.user_id) === Number(req.buyer_user_id));
        const orgId = user ? user.org_id : null;

        // 본사(1번) 데이터는 항상 제외
        if (Number(orgId) === 1) return false;

        // 특정 지사 탭을 선택했을 경우
        if (selectedOrgId !== 'all') {
          return Number(orgId) === Number(selectedOrgId);
        }

        return true;
      })
    : refundRequests;

  const policyColumns = [
    { title: '정책 ID', dataIndex: 'refund_policy_id', width: 90, align: 'center' },
    { title: '정책명', dataIndex: 'policy_name', width: 180, render: t => <Text strong>{t || '-'}</Text> },
    { title: '환불 허용일', width: 150, render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>수령 후 {r.allowed_days}일 이내</span> },
    { title: '시행일', dataIndex: 'effective_from', width: 110, align: 'center', render: d => d || '-' },
    { title: '마감일', dataIndex: 'effective_to', width: 110, align: 'center', render: d => d ? d : <Text type="secondary">상시 적용</Text> },
    { title: '택배비 부담', dataIndex: 'shipping_fee_payer', width: 120, align: 'center', render: t => t || '-' },
    { title: '활성 여부', dataIndex: 'active_yn', width: 100, align: 'center', render: s => <Tag color={s === 'Y' ? 'success' : 'default'}>{s === 'Y' ? '활성' : '비활성'}</Tag> },
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
        title={<span style={{ color: '#37352F', fontWeight: 600, fontSize: '15px' }}>고객 환불 요청 내역 및 처리</span>} 
        variant="borderless" 
        style={{ borderRadius: 12, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 0 0 1px #E9E8E4' }}
      >
        {/* 본사(1번)를 제외한 지사들만 탭으로 노출 */}
        {userInfo?.orgType === 'HEADQUARTER' && branchOrganizations.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <Radio.Group value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} buttonStyle="solid">
              <Radio.Button value="all">
                전체 보기 ({refundRequests.filter(req => {
                  const u = users.find(x => Number(x.user_id) === Number(req.buyer_user_id));
                  return Number(u ? u.org_id : null) !== 1;
                }).length})
              </Radio.Button>
              {branchOrganizations.map(org => {
                const count = refundRequests.filter(req => {
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

        <Table columns={requestColumns} dataSource={filteredRequests || []} rowKey="refund_request_id" loading={loading} pagination={{ pageSize: 5 }} size="middle" scroll={{ x: 1000 }} />
      </Card>
    </>
  );
}
import React, { useState } from 'react';
import { Table, Tag, Typography, Radio } from 'antd';

const { Text } = Typography;

export default function OrderTable({ orders, users, organizations = [], userInfo, loading }) {
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  const filteredOrders = (userInfo?.orgType === 'HEADQUARTER' && selectedOrgId !== 'all')
    ? orders.filter(order => Number(order.org_id) === Number(selectedOrgId))
    : orders;

  const getUserName = (userId) => {
    const found = users.find(u => Number(u.user_id) === Number(userId));
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  const getOrgDisplay = (orgId, buyerUserId) => {
    let targetOrgId = orgId;
    if (!targetOrgId && buyerUserId) {
      const buyer = users.find(u => Number(u.user_id) === Number(buyerUserId));
      if (buyer) targetOrgId = buyer.org_id;
    }

    const org = organizations && organizations.find(o => Number(o.org_id) === Number(targetOrgId));
    if (org) {
      return `${org.org_name} (ID: ${targetOrgId})`;
    }

    if (Number(targetOrgId) === 1) return `스마트쇼핑 본사 (ID: 1)`;
    if (Number(targetOrgId) === 2) return `스마트쇼핑 전주지사 (ID: 2)`;
    if (Number(targetOrgId) === 3) return `스마트쇼핑 부산지사 (ID: 3)`;
    if (Number(targetOrgId) === 4) return `스마트쇼핑 제주지사 (ID: 4)`;

    return targetOrgId ? `지사 ID: ${targetOrgId}` : '본사/미지정';
  };

  const columns = [
    { title: '주문 ID', dataIndex: 'order_id', width: 90, align: 'center' },
    { title: '주문 번호', dataIndex: 'order_no', width: 220, render: t => <Text strong>{t}</Text> },
    { title: '구매자', width: 160, render: (_, r) => getUserName(r.buyer_user_id) },
    { 
      title: '담당 지사', 
      dataIndex: 'org_id', 
      width: 260, 
      render: (orgId, r) => (
        <span style={{ whiteSpace: 'nowrap' }}>
          {getOrgDisplay(orgId, r.buyer_user_id)}
        </span>
      )
    },
    { title: '총 결제금액', dataIndex: 'total_amount', width: 130, align: 'right', render: amt => `${Number(amt || 0).toLocaleString()} 원` },
    { title: '수령인', dataIndex: 'receiver_name', width: 110 },
    { 
      title: '주문 상태', 
      dataIndex: 'order_status', 
      width: 120, 
      align: 'center', 
      render: s => <Tag color={s === 'PAID' ? 'success' : s === 'DELIVERED' ? 'blue' : 'warning'}>{s}</Tag> 
    },
  ];

  return (
    <div>
      {/* 💡 최고관리자(본사)일 때 1번 본사를 제외한 지사들만 필터 탭으로 노출 */}
      {userInfo?.orgType === 'HEADQUARTER' && organizations && organizations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Radio.Group value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} buttonStyle="solid">
            <Radio.Button value="all">전체 보기 ({orders.length})</Radio.Button>
            {organizations
              .filter(org => Number(org.org_id) !== 1) // 본사(1번) 제외
              .map(org => {
                const count = orders.filter(o => Number(o.org_id) === Number(org.org_id)).length;
                return (
                  <Radio.Button key={org.org_id} value={org.org_id}>
                    {org.org_name} ({count})
                  </Radio.Button>
                );
              })
            }
          </Radio.Group>
        </div>
      )}

      <Table 
        columns={columns} 
        dataSource={filteredOrders} 
        rowKey="order_id" 
        loading={loading} 
        pagination={{ pageSize: 10 }} 
        size="middle" 
        scroll={{ x: 1100 }} 
      />
    </div>
  );
}
import React from 'react';
import { Table, Tag, Button, Typography } from 'antd';

const { Text } = Typography;

export default function OrderTable({ orders, users, onStatusChange, loading }) {
  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  const columns = [
    { title: '주문 ID', dataIndex: 'order_id', width: 90, align: 'center', render: (_, r) => r.order_id || r.id },
    { title: '회원명 (번호)', width: 180, render: (_, r) => <Text strong style={{ whiteSpace: 'nowrap' }}>{getUserName(r.user_id || r.buyer_user_id)}</Text> },
    { title: '주문 상태', dataIndex: 'status', width: 120, align: 'center', render: (_, r) => {
        const s = r.status || r.order_status;
        return <Tag color={s === 'COMPLETED' ? 'green' : s === 'PAID' ? 'blue' : 'orange'}>{s}</Tag>;
    }},
    { title: '총 금액', width: 140, align: 'right', render: (_, r) => <span style={{ whiteSpace: 'nowrap' }}>{Number(r.total_amount || r.total_price || 0).toLocaleString()} 원</span> },
    { title: '작업', width: 110, align: 'center', render: (_, r) => <Button size="small" type="primary" onClick={() => onStatusChange(r.order_id || r.id, r.status || r.order_status)}>상태 변경</Button> },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={orders} 
      rowKey={(record) => record.order_id || record.id || Math.random()}
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 700 }}
    />
  );
}
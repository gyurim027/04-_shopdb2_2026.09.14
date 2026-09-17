import React from 'react';
import { Table, Tag, Button, Typography } from 'antd';

const { Text } = Typography;

export default function SupportTable({ inquiries, users, onAnswer, loading }) {
  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  const columns = [
    { title: '문의 ID', dataIndex: 'inquiry_id', width: 90, align: 'center' },
    { title: '회원명 (번호)', width: 160, render: (_, r) => <Text strong style={{ whiteSpace: 'nowrap' }}>{getUserName(r.user_id)}</Text> },
    { title: '카테고리', dataIndex: 'category_code', width: 110, align: 'center' },
    { title: '제목 / 내용', width: 300, render: (t, r) => <div><Text strong>{r.title || '-'}</Text><br/><Text type="secondary" style={{fontSize: 12}}>{r.content || '-'}</Text></div> },
    { title: '상태', dataIndex: 'inquiry_status', width: 110, align: 'center', render: s => <Tag color={s === 'ANSWERED' ? 'green' : 'warning'}>{s}</Tag> },
    { title: '답변 내용', dataIndex: 'answer_content', width: 220, render: t => t || '-' },
    { title: '작업', width: 110, align: 'center', render: (_, r) => <Button size="small" type="primary" style={{ backgroundColor: '#722ed1', border: 'none' }} onClick={() => onAnswer(r.inquiry_id, r.answer_content)}>답변 작성</Button> },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={inquiries} 
      rowKey="inquiry_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 1050 }}
    />
  );
}
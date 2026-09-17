import React from 'react';
import { Table, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function PolicyTable({ companyPolicies, loading }) {
  const columns = [
    { title: '정책 ID', dataIndex: 'policy_id', width: 90, align: 'center' },
    { title: '코드', dataIndex: 'policy_code', width: 130, align: 'center' },
    { title: '정책명', dataIndex: 'policy_name', width: 220, render: t => <Text strong style={{ whiteSpace: 'nowrap' }}>{t}</Text> },
    { title: '버전', dataIndex: 'policy_version', width: 100, align: 'center' },
    { title: '시행일', dataIndex: 'effective_from', width: 140, align: 'center' },
    { title: '상태', dataIndex: 'active_yn', width: 110, align: 'center', render: s => <Tag color={s === 'Y' ? 'success' : 'error'}>{s === 'Y' ? '활성' : '비활성'}</Tag> },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={companyPolicies} 
      rowKey="policy_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 800 }}
    />
  );
}
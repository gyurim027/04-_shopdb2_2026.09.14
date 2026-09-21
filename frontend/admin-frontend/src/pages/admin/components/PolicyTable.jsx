import React from 'react';
import { Table, Tag, Typography } from 'antd';

const { Text } = Typography;

export default function PolicyTable({ companyPolicies, loading }) {
  const columns = [
    { title: '정책 ID', dataIndex: 'policy_id', width: 90, align: 'center' },
    { title: '코드', dataIndex: 'policy_code', width: 120, align: 'center' },
    { title: '정책명', dataIndex: 'policy_name', width: 200, render: t => <Text strong>{t}</Text> },
    { title: '버전', dataIndex: 'policy_version', width: 90, align: 'center' },
    { title: '시행일', dataIndex: 'effective_from', width: 120, align: 'center' },
    // 💡 [추가] 효력 마감일 컬럼
    { title: '마감일', dataIndex: 'effective_to', width: 120, align: 'center', render: d => d ? d : <Text type="secondary">상시 적용</Text> },
    { title: '상태', dataIndex: 'active_yn', width: 100, align: 'center', render: s => <Tag color={s === 'Y' ? 'success' : 'error'}>{s === 'Y' ? '활성' : '비활성'}</Tag> },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={companyPolicies} 
      rowKey="policy_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 900 }}
      expandable={{
        expandedRowRender: (record) => (
          <div style={{ margin: 0, padding: '12px 24px', background: '#FAFAF9', borderRadius: '8px', border: '1px solid #EAE8E4' }}>
            <Text strong style={{ display: 'block', marginBottom: 4, color: '#37352F' }}>[정책 상세 내용]</Text>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#555', lineHeight: '1.6' }}>
              {record.policy_content || '등록된 상세 내용이 없습니다.'}
            </p>
          </div>
        ),
        rowExpandable: (record) => !!record.policy_content,
      }}
    />
  );
}
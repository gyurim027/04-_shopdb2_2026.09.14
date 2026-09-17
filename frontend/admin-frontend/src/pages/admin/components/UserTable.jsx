import React from 'react';
import { Table, Tag, Button, Typography, Space } from 'antd';

const { Text } = Typography;

export default function UserTable({ users, organizations, onStatusChange, onDelete, loading }) {
  const columns = [
    { 
      title: '회원 번호', 
      dataIndex: 'user_id',
      width: 90,
      align: 'center'
    },
    { 
      title: '조직명 (ID)', 
      dataIndex: 'org_id', 
      width: 160,
      render: (orgId) => {
        const matchedOrg = organizations.find(o => o.org_id === orgId);
        return <span style={{ whiteSpace: 'nowrap' }}>{matchedOrg ? `${matchedOrg.org_name} (${orgId})` : '-'}</span>;
      }
    },
    { 
      title: '아이디', 
      dataIndex: 'login_id',
      width: 130,
      render: t => <span style={{ whiteSpace: 'nowrap' }}>{t}</span>
    },
    { 
      title: '이름', 
      dataIndex: 'user_name', 
      width: 110,
      render: t => <Text strong style={{ whiteSpace: 'nowrap' }}>{t}</Text> 
    },
    { 
      title: '이메일', 
      dataIndex: 'email',
      width: 220, // 💡 이메일이 잘리지 않도록 충분한 너비 부여
      render: t => <span style={{ whiteSpace: 'nowrap' }}>{t}</span>
    },
    { 
      title: '연락처', 
      dataIndex: 'phone', 
      width: 130,
      render: t => <span style={{ whiteSpace: 'nowrap' }}>{t || '-'}</span> 
    },
    { 
      title: '상태', 
      dataIndex: 'user_status', 
      width: 100,
      align: 'center',
      render: s => {
        let color = 'default';
        if (s === 'ACTIVE') color = 'success';
        else if (s === 'SUSPENDED') color = 'warning';
        else if (s === 'WITHDRAWN') color = 'error';
        return <Tag color={color}>{s || 'ACTIVE'}</Tag>;
      }
    },
    { 
      title: '작업', 
      width: 160,
      align: 'center',
      render: (_, r) => (
        <Space size="small">
          <Button size="small" type="primary" ghost onClick={() => onStatusChange(r.user_id, r.user_status || 'ACTIVE')}>상태 변경</Button>
          {r.user_status !== 'WITHDRAWN' && (
            <Button size="small" danger onClick={() => onDelete(r.user_id)}>삭제</Button>
          )}
        </Space>
      )
    },
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={users} 
      rowKey="user_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 1100 }} // 💡 전체 스크롤 폭도 넉넉히 확장
    />
  );
}
import React, { useState } from 'react';
import { Table, Tag, Button, Typography, Space, Radio } from 'antd';

const { Text } = Typography;

export default function UserTable({ users, organizations, onStatusChange, onDelete, loading, userInfo }) {
  // 선택된 지사 ID 상태 (기본값: 'all' - 전체 보기)
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  // 본사 관리자이면서 조직(지사) 목록이 있을 때 필터링 처리
  const filteredUsers = (userInfo?.orgType === 'HEADQUARTER' && selectedOrgId !== 'all')
    ? users.filter(user => Number(user.org_id) === Number(selectedOrgId))
    : users;

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
      width: 220,
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
      render: (_, r) => {
        let canDelete = false;

        if (userInfo) {
          if (userInfo.orgType === 'HEADQUARTER') {
            canDelete = true;
          } else if (userInfo.orgType === 'BRANCH') {
            const isMe = Number(r.user_id) === Number(userInfo.userId);
            const isSameOrg = Number(r.org_id) === Number(userInfo.orgId);
            canDelete = !isMe && isSameOrg;
          }
        }

        return (
          <Space size="small">
            <Button size="small" type="primary" ghost onClick={() => onStatusChange(r.user_id, r.user_status || 'ACTIVE')}>상태 변경</Button>
            
            {canDelete && r.user_status !== 'WITHDRAWN' && (
              <Button size="small" danger onClick={() => onDelete(r.user_id)}>삭제</Button>
            )}
          </Space>
        );
      }
    },
  ];

  return (
    <div>
      {/* 💡 [추가] 최고관리자(본사)일 때만 지사별 탭(Radio 버튼 그룹) 노출 */}
      {userInfo?.orgType === 'HEADQUARTER' && (
        <div style={{ marginBottom: '20px' }}>
          <Radio.Group 
            value={selectedOrgId} 
            onChange={(e) => setSelectedOrgId(e.target.value)} 
            buttonStyle="solid"
          >
            <Radio.Button value="all">
              전체 보기 ({users.length})
            </Radio.Button>
            {organizations.map(org => {
              const count = users.filter(u => Number(u.org_id) === Number(org.org_id)).length;
              return (
                <Radio.Button key={org.org_id} value={org.org_id}>
                  {org.org_name} ({count})
                </Radio.Button>
              );
            })}
          </Radio.Group>
        </div>
      )}

      <Table 
        columns={columns} 
        dataSource={filteredUsers} 
        rowKey="user_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
        scroll={{ x: 1100 }}
      />
    </div>
  );
}
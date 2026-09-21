import React, { useState } from 'react';
import { Table, Tag, Button, Typography, Radio } from 'antd';

const { Text } = Typography;

export default function SupportTable({ inquiries, users, organizations = [], userInfo, onAnswer, loading }) {
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  // 본사(1번)를 제외한 지사 목록만 필터링 탭에 사용
  const branchOrganizations = organizations ? organizations.filter(org => Number(org.org_id) !== 1) : [];

  const getUserName = (userId) => {
    const found = users.find(u => u.user_id === userId);
    return found ? `${found.user_name} (ID: ${userId})` : `회원 번호: ${userId}`;
  };

  // 탭 선택에 따른 문의 내역 필터링 (본사 제외 및 선택된 지사별 분류)
  const filteredInquiries = (userInfo?.orgType === 'HEADQUARTER')
    ? inquiries.filter(inq => {
        const user = users.find(u => Number(u.user_id) === Number(inq.user_id));
        const orgId = inq.org_id || (user ? user.org_id : null);
        
        // 본사(1번) 데이터는 항상 제외
        if (Number(orgId) === 1) return false;

        // 특정 지사 탭을 선택했을 경우
        if (selectedOrgId !== 'all') {
          return Number(orgId) === Number(selectedOrgId);
        }

        return true; // 전체 보기일 때는 본사 제외한 지사 전체 출력
      })
    : inquiries;

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
    <div>
      {/* 본사(1번)를 제외한 지사들만 탭으로 노출 */}
      {userInfo?.orgType === 'HEADQUARTER' && branchOrganizations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Radio.Group value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} buttonStyle="solid">
            <Radio.Button value="all">
              전체 보기 ({inquiries.filter(inq => {
                const u = users.find(x => Number(x.user_id) === Number(inq.user_id));
                return Number(inq.org_id || (u ? u.org_id : null)) !== 1;
              }).length})
            </Radio.Button>
            {branchOrganizations.map(org => {
              const count = inquiries.filter(inq => {
                const u = users.find(x => Number(x.user_id) === Number(inq.user_id));
                const orgId = inq.org_id || (u ? u.org_id : null);
                return Number(orgId) === Number(org.org_id);
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

      <Table 
        columns={columns} 
        dataSource={filteredInquiries} 
        rowKey="inquiry_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
        scroll={{ x: 1050 }}
      />
    </div>
  );
}
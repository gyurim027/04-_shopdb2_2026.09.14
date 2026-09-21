import React, { useState } from 'react';
import { Table, Tag, Button, Typography, Space, Radio } from 'antd';

const { Text } = Typography;

export default function InventoryTable({ inventories, products, organizations, userInfo, onAdjustStock, onAdjustPrice, loading }) {
  const [selectedOrgId, setSelectedOrgId] = useState('all');

  // 💡 본사(1번)를 제외한 지사 목록만 필터링 탭에 사용
  const branchOrganizations = organizations ? organizations.filter(org => Number(org.org_id) !== 1) : [];

  // 💡 선택된 탭에 따라 재고 데이터 필터링
  const filteredInventories = (userInfo?.orgType === 'HEADQUARTER' && selectedOrgId !== 'all')
    ? inventories.filter(inv => Number(inv.org_id) === Number(selectedOrgId))
    : (userInfo?.orgType === 'HEADQUARTER' 
        ? inventories.filter(inv => Number(inv.org_id) !== 1) // 전체 보기일 때도 본사 제외하고 지사들만 모아서 보여줌
        : inventories);

  const columns = [
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>재고 ID</span>, 
      dataIndex: 'inventory_id', 
      width: 90, 
      align: 'center' 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>지점명 (조직)</span>, 
      dataIndex: 'org_id', 
      width: 150, 
      render: (orgId) => {
        const matchedOrg = organizations.find(o => Number(o.org_id) === Number(orgId));
        return <span style={{ whiteSpace: 'nowrap' }}>{matchedOrg ? `${matchedOrg.org_name} (ID: ${orgId})` : `지점 ID: ${orgId}`}</span>;
      }
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>상품명 (옵션/SKU)</span>, 
      width: 380, 
      render: (_, r) => {
        const variantData = r.variant || {};
        const productData = variantData.product || r.product || products[0] || {};
        
        const productName = productData.product_name || `상품 ID: ${r.variant_id}`;
        
        const opt1Name = variantData.option_name1 || '구매옵션';
        const opt1Val = variantData.option_value1 || '기본 상품';
        const opt2Name = variantData.option_name2;
        const opt2Val = variantData.option_value2;

        let optionText = `${opt1Name}: ${opt1Val}`;
        if (opt2Name && opt2Val) {
          optionText += `, ${opt2Name}: ${opt2Val}`;
        }

        return (
          <Text strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '360px' }}>
            {productName} <Text type="secondary">({optionText})</Text>
          </Text>
        );
      } 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>정가</span>, 
      width: 110, 
      align: 'right', 
      render: (_, r) => {
        const productData = (r.variant && r.variant.product) || r.product || products[0] || {};
        return <Text delete type="secondary" style={{ whiteSpace: 'nowrap' }}>{Number(productData.regular_price || 19000).toLocaleString()} 원</Text>;
      } 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>세일가</span>, 
      width: 110, 
      align: 'right', 
      render: (_, r) => {
        const productData = (r.variant && r.variant.product) || r.product || products[0] || {};
        return <Text type="danger" strong style={{ whiteSpace: 'nowrap' }}>{Number(productData.sale_price || 7220).toLocaleString()} 원</Text>;
      } 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>세일 상태</span>, 
      width: 120, 
      align: 'center', 
      render: (_, r) => {
        const productData = (r.variant && r.variant.product) || r.product || products[0] || {};
        const status = productData.product_status || 'SALE';
        const isSale = status === 'SALE';
        return <Tag color={isSale ? 'success' : 'error'} style={{ whiteSpace: 'nowrap' }}>{isSale ? `세일중 (${status})` : status}</Tag>;
      } 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>가용 재고 수량</span>, 
      dataIndex: 'stock_quantity', 
      width: 120, 
      align: 'center', 
      render: t => <Text type="success" strong style={{ whiteSpace: 'nowrap' }}>{t ?? 0} 개</Text> 
    },
    { 
      title: <span style={{ whiteSpace: 'nowrap' }}>관리 작업</span>, 
      width: 160, 
      align: 'center', 
      render: (_, r) => {
        const productData = (r.variant && r.variant.product) || r.product || products[0] || {};
        const pId = productData.product_id || 1;
        const pName = productData.product_name || '상품';
        const sPrice = productData.sale_price || 7220;
        return (
          <Space size="small">
            <Button size="small" style={{ backgroundColor: '#fa8c16', color: 'white', border: 'none' }} onClick={() => onAdjustStock(r.inventory_id, r.stock_quantity)}>재고 조정</Button>
            {userInfo.orgType === 'HEADQUARTER' && (
              <Button size="small" style={{ backgroundColor: '#722ed1', color: 'white', border: 'none' }} onClick={() => onAdjustPrice(pId, sPrice, pName)}>가격 변경</Button>
            )}
          </Space>
        );
      } 
    },
  ];

  return (
    <div>
      {/* 💡 주문 탭처럼 본사(1번)를 제외한 지사들만 탭으로 노출 */}
      {userInfo?.orgType === 'HEADQUARTER' && branchOrganizations.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <Radio.Group value={selectedOrgId} onChange={(e) => setSelectedOrgId(e.target.value)} buttonStyle="solid">
            <Radio.Button value="all">
              전체 보기 ({inventories.filter(inv => Number(inv.org_id) !== 1).length})
            </Radio.Button>
            {branchOrganizations.map(org => {
              const count = inventories.filter(inv => Number(inv.org_id) === Number(org.org_id)).length;
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
        dataSource={filteredInventories} 
        rowKey="inventory_id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="middle"
        scroll={{ x: 1250 }}
      />
    </div>
  );
}
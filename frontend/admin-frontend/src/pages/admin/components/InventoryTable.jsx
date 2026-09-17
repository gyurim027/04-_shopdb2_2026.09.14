import React from 'react';
import { Table, Tag, Button, Typography, Space } from 'antd';

const { Text } = Typography;

export default function InventoryTable({ inventories, products, organizations, userInfo, onAdjustStock, onAdjustPrice, loading }) {
  const getProductInfo = (variantId) => {
    let pId = 1;
    if (variantId === 1 || variantId === 2) pId = 1;
    else if (variantId === 3) pId = 2;
    else if (variantId === 4 || variantId === 5) pId = 3;
    else if (variantId === 6) pId = 4;
    else if (variantId === 7 || variantId === 8) pId = 5;
    else if (variantId === 9) pId = 6;
    
    const p = products.find(x => x.product_id === pId) || {};
    
    let variantLabel = ` (V: ${variantId})`;
    if (variantId === 1) variantLabel = ' (SKU-NOTE-16)';
    else if (variantId === 2) variantLabel = ' (SKU-NOTE-32)';
    else if (variantId === 3) variantLabel = ' (SKU-PHONE-BLK)';
    else if (variantId === 4) variantLabel = ' (SKU-HOOD-L)';
    else if (variantId === 5) variantLabel = ' (SKU-HOOD-XL)';
    else if (variantId === 6) variantLabel = ' (SKU-RUN-270)';
    else if (variantId === 7) variantLabel = ' (SKU-AI-32)';
    else if (variantId === 8) variantLabel = ' (SKU-AI-64)';

    return {
      id: pId,
      name: p.product_name || `상품 ID: ${pId}`,
      variantLabel,
      regularPrice: p.regular_price || 100000,
      salePrice: p.sale_price || 90000,
      status: p.product_status || 'SALE'
    };
  };

  const columns = [
    { title: '재고 ID', dataIndex: 'inventory_id', width: 90, align: 'center' },
    { title: '지점명 (조직)', dataIndex: 'org_id', width: 160, render: (orgId) => {
        const matchedOrg = organizations.find(o => o.org_id === orgId);
        return <span style={{ whiteSpace: 'nowrap' }}>{matchedOrg ? matchedOrg.org_name : `지점 ID: ${orgId}`}</span>;
    }},
    { title: '상품명 (옵션/SKU)', width: 220, render: (_, r) => {
        const info = getProductInfo(r.variant_id);
        return <Text strong style={{ whiteSpace: 'nowrap' }}>{info.name} <Text type="secondary">{info.variantLabel}</Text></Text>;
    }},
    { title: '정가', width: 120, align: 'right', render: (_, r) => <Text delete type="secondary" style={{ whiteSpace: 'nowrap' }}>{Number(getProductInfo(r.variant_id).regularPrice).toLocaleString()} 원</Text> },
    { title: '세일가', width: 120, align: 'right', render: (_, r) => <Text type="danger" strong style={{ whiteSpace: 'nowrap' }}>{Number(getProductInfo(r.variant_id).salePrice).toLocaleString()} 원</Text> },
    { title: '세일 상태', width: 130, align: 'center', render: (_, r) => {
        const info = getProductInfo(r.variant_id);
        const isSale = info.status === 'SALE';
        return <Tag color={isSale ? 'success' : 'error'}>{isSale ? `세일중 (${info.status})` : info.status}</Tag>;
    }},
    { title: '가용 재고 수량', dataIndex: 'stock_quantity', width: 110, align: 'center', render: t => <Text type="success" strong>{t} 개</Text> },
    { title: '관리 작업', width: 170, align: 'center', render: (_, r) => {
        const info = getProductInfo(r.variant_id);
        return (
          <Space size="small">
            <Button size="small" style={{ backgroundColor: '#fa8c16', color: 'white', border: 'none' }} onClick={() => onAdjustStock(r.inventory_id, r.stock_quantity)}>재고 조정</Button>
            {userInfo.orgType === 'HEADQUARTER' && (
              <Button size="small" style={{ backgroundColor: '#722ed1', color: 'white', border: 'none' }} onClick={() => onAdjustPrice(info.id, info.salePrice, info.name)}>가격 변경</Button>
            )}
          </Space>
        );
    }},
  ];

  return (
    <Table 
      columns={columns} 
      dataSource={inventories} 
      rowKey="inventory_id"
      loading={loading}
      pagination={{ pageSize: 10 }}
      size="middle"
      scroll={{ x: 1100 }}
    />
  );
}
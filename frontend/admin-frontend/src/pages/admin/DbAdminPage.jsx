import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DbAdminPage = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('org_units');
  const [tableData, setTableData] = useState({ columns: [], data: [], primary_keys: [] });
  const [tableSearchTerm, setTableSearchTerm] = useState('');

  const [page, setPage] = useState(1);
  const limit = 50; 

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMode, setCurrentMode] = useState(''); 
  const [formData, setFormData] = useState({});

  const token = localStorage.getItem('access_token');
  const fetchOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  useEffect(() => {
    fetch('http://localhost:8000/admin/db/tables', fetchOptions)
      .then(res => res.json())
      .then(data => { if (data.tables) setTables(data.tables); });
  }, []);

  const loadTableData = () => {
    if (selectedTable) {
      const skip = (page - 1) * limit;
      fetch(`http://localhost:8000/admin/db/tables/${selectedTable}?skip=${skip}&limit=${limit}`, fetchOptions)
        .then(res => res.json())
        .then(data => { if (data.columns) setTableData(data); });
    }
  };

  useEffect(() => { loadTableData(); }, [selectedTable, page]);

  const handleTableChange = (tableName) => {
    setSelectedTable(tableName);
    setPage(1);
  };

  const openModal = (mode, row = {}) => {
    setCurrentMode(mode);
    setFormData(row);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    const pkColumn = tableData.primary_keys[0];
    try {
      if (currentMode === 'add') {
        await fetch(`http://localhost:8000/admin/db/tables/${selectedTable}`, {
          method: 'POST', ...fetchOptions, body: JSON.stringify(formData)
        });
        alert('추가되었습니다.');
      } else if (currentMode === 'edit') {
        const pkValue = formData[pkColumn];
        await fetch(`http://localhost:8000/admin/db/tables/${selectedTable}/${pkColumn}/${pkValue}`, {
          method: 'PUT', ...fetchOptions, body: JSON.stringify(formData)
        });
        alert('수정되었습니다.');
      }
      setIsModalOpen(false);
      loadTableData();
    } catch (err) {
      alert('오류가 발생했습니다.');
    }
  };

  const handleDelete = async (row) => {
    const pkColumn = tableData.primary_keys[0];
    if (!pkColumn) return alert("기본키가 없습니다.");
    
    if (window.confirm("정말 삭제하시겠습니까?")) {
      await fetch(`http://localhost:8000/admin/db/tables/${selectedTable}/${pkColumn}/${row[pkColumn]}`, {
        method: 'DELETE', ...fetchOptions
      });
      alert('삭제 완료!');
      loadTableData();
    }
  };

  const filteredTables = tables.filter(t => t.name.includes(tableSearchTerm));

  return (
    // 여백(padding)을 32px에서 20px로 줄이고, 간격(gap)을 24px에서 16px로 줄여 공간 확보
    <div style={{ display: 'flex', gap: '16px', padding: '20px', backgroundColor: '#FAFAF9', minHeight: '100vh' }}>
      
      {/* 왼쪽 사이드바: 가로폭을 280px에서 220px로 축소 */}
      <div style={{ width: '220px', flexShrink: 0, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAE8E4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, color: '#37352F', fontSize: '16px' }}>Allowed tables</h3>
          <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#00A86B' }}>{tables.length}</span>
        </div>
        <input 
          type="text" placeholder="Filter table names" value={tableSearchTerm} onChange={(e) => setTableSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', margin: '16px 0', border: '1px solid #E5E4E0', borderRadius: '6px', outline: 'none', fontSize: '13px' }}
        />
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: '75vh', overflowY: 'auto' }}>
          {filteredTables.map(table => (
            <li key={table.name} onClick={() => handleTableChange(table.name)}
              style={{ 
                padding: '10px 12px', border: '1px solid #F4F3F1', marginBottom: '6px', cursor: 'pointer', borderRadius: '8px',
                backgroundColor: selectedTable === table.name ? '#00A86B' : 'white',
                color: selectedTable === table.name ? 'white' : '#37352F',
                transition: 'all 0.2s ease',
                wordBreak: 'break-all'
              }}
            >
              <strong style={{ fontSize: '13px' }}>{table.name}</strong><br/>
              <small style={{ color: selectedTable === table.name ? '#E6F8F0' : '#888', fontSize: '11px' }}>{table.row_count} 행</small>
            </li>
          ))}
        </ul>
      </div>

      {/* 오른쪽 메인 콘텐츠 */}
      <div style={{ flex: 1, minWidth: 0, backgroundColor: 'white', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', border: '1px solid #EAE8E4' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h4 style={{ color: '#00A86B', margin: '0 0 8px 0', fontWeight: 600 }}>테이블 작업 영역</h4>
            <h2 style={{ margin: '0 0 8px 0', color: '#37352F' }}>{selectedTable}</h2>
            <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>기본키: {tableData.primary_keys.join(', ') || '없음'}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
             <button onClick={() => navigate('/admin/dashboard')} style={{ padding: '8px 16px', cursor: 'pointer', border: '1px solid #EAE8E4', backgroundColor: 'white', borderRadius: '6px', color: '#37352F', fontWeight: 500 }}>대시보드로 돌아가기</button>
             <button onClick={() => openModal('add')} style={{ padding: '8px 16px', backgroundColor: '#37352F', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>+ 새로운 행 추가</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto', border: '1px solid #EAE8E4', borderRadius: '8px', marginTop: '24px', minHeight: '500px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead style={{ backgroundColor: '#F4F3F1' }}>
              <tr style={{ borderBottom: '1px solid #EAE8E4', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', width: '120px', color: '#37352F', position: 'sticky', left: 0, backgroundColor: '#F4F3F1', zIndex: 1, borderRight: '1px solid #EAE8E4' }}>작업</th>
                {tableData.columns.map(col => <th key={col} style={{ padding: '12px 16px', color: '#37352F', whiteSpace: 'nowrap' }}>{col}</th>)}
              </tr>
            </thead>
            <tbody>
              {tableData.data.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #F4F3F1' }}>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: 'white', zIndex: 1, borderRight: '1px solid #EAE8E4' }}>
                    <button 
                      onClick={() => openModal('edit', row)} 
                      style={{ 
                        padding: '6px 12px', backgroundColor: '#E6F7FF', color: '#1677FF', border: '1px solid #91CAFF', 
                        borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '12px', marginRight: '6px' 
                      }}>
                      수정
                    </button>
                    <button 
                      onClick={() => handleDelete(row)} 
                      style={{ 
                        padding: '6px 12px', backgroundColor: '#FFF2F0', color: '#FF4D4F', border: '1px solid #FFCCC7', 
                        borderRadius: '6px', cursor: 'pointer', fontWeight: 500, fontSize: '12px' 
                      }}>
                      삭제
                    </button>
                  </td>
                  {tableData.columns.map(col => (
                    <td key={col} style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#555' }}>
                      {row[col] !== null ? String(row[col]) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이징 버튼 */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '24px', gap: '20px' }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))} 
            disabled={page === 1}
            style={{ padding: '8px 16px', cursor: page === 1 ? 'not-allowed' : 'pointer', border: '1px solid #EAE8E4', borderRadius: '6px', backgroundColor: 'white', color: page === 1 ? '#ccc' : '#37352F' }}
          >이전 페이지</button>
          
          <span style={{ fontWeight: 'bold', color: '#37352F' }}>{page} 페이지</span>
          
          <button 
            onClick={() => setPage(p => p + 1)} 
            disabled={tableData.data.length < limit}
            style={{ padding: '8px 16px', cursor: tableData.data.length < limit ? 'not-allowed' : 'pointer', border: '1px solid #EAE8E4', borderRadius: '6px', backgroundColor: 'white', color: tableData.data.length < limit ? '#ccc' : '#37352F' }}
          >다음 페이지</button>
        </div>
      </div>

      {/* 팝업창(모달) */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '12px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
            <h2 style={{ marginTop: 0, color: '#37352F', marginBottom: '24px' }}>{currentMode === 'add' ? '새로운 데이터 추가' : '데이터 수정'}</h2>
            
            {tableData.columns.map(col => {
              const isPk = tableData.primary_keys.includes(col);
              if (currentMode === 'add' && isPk) return null; 
              
              return (
                <div key={col} style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#37352F', fontSize: '13px' }}>
                    {col} {isPk && <span style={{ color: '#FF4D4F', fontSize: '12px', marginLeft: '5px', fontWeight: 'normal' }}>(수정불가)</span>}
                  </label>
                  <input 
                    type="text" 
                    value={formData[col] || ''} 
                    onChange={e => setFormData({ ...formData, [col]: e.target.value })}
                    readOnly={currentMode === 'edit' && isPk}
                    style={{ 
                      width: '100%', padding: '10px 12px', border: '1px solid #E5E4E0', borderRadius: '6px', outline: 'none',
                      backgroundColor: (currentMode === 'edit' && isPk) ? '#F4F3F1' : 'white',
                      cursor: (currentMode === 'edit' && isPk) ? 'not-allowed' : 'text',
                      color: (currentMode === 'edit' && isPk) ? '#888' : '#37352F',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              );
            })}

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', cursor: 'pointer', border: '1px solid #EAE8E4', backgroundColor: 'white', borderRadius: '6px', fontWeight: 500 }}>취소</button>
              <button onClick={handleSave} style={{ backgroundColor: '#00A86B', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DbAdminPage;
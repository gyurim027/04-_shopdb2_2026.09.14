import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const useNavigateInstance = useNavigate();

  // 기존 handleLogin 로직을 Ant Design의 onFinish 폼 제출 이벤트에 맞게 이관
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login_id: values.username, // Form.Item의 name="username"에서 받아온 값
          password: values.password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // 1. 통행증(JWT 토큰) 저장
        localStorage.setItem('access_token', data.access_token);
        
        // 2. 사용자 정보(조직 유형, 조직 ID 등) 함께 저장해서 권한 구분용으로 사용
        if (data.user) {
          localStorage.setItem('org_type', data.user.org_type || '');
          localStorage.setItem('org_id', data.user.org_id || '');
          localStorage.setItem('user_name', data.user.user_name || '관리자');
        }
        
        // alert 대신 Antd의 깔끔한 message 알림창 사용
        message.success('로그인 성공!');
        
        // 3. 대시보드로 이동
        useNavigateInstance('/admin/dashboard'); 
      } else {
        const errorData = await response.json();
        message.error(errorData.detail || '로그인에 실패했습니다.');
      }
    } catch (error) {
      message.error('서버와 연결할 수 없습니다. 백엔드 서버를 확인해주세요.');
    } finally {
      // 성공/실패 여부에 상관없이 로딩 상태 해제
      setLoading(false);
    }
  };

  // 🚀 시연/테스트용 계정 자동 입력 및 로그인 헬퍼 함수
  const handleQuickLogin = (username, password) => {
    form.setFieldsValue({ username, password });
    onFinish({ username, password });
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      background: '#e6f7ff' // 어드민 페이지 느낌을 주는 은은한 블루톤 배경
    }}>
      <Card 
        style={{ width: 380, padding: '10px' }} 
        styles={{ body: { padding: '24px' } }}
        bordered={false} // 카드 테두리를 없애서 더 모던한 느낌 부여
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#0050b3' }}>
            SHOP ADMIN
          </Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            최고 관리자 및 지점장 로그인
          </Text>
        </div>

        <Form
          form={form}
          name="admin_login_form"
          onFinish={onFinish}
          size="large"
          layout="vertical" // 라벨을 인풋창 위에 배치하여 가독성 향상
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '아이디를 입력해주세요.' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: '#bfbfbf' }}/>} 
              placeholder="관리자 아이디" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '비밀번호를 입력해주세요.' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: '#bfbfbf' }}/>} 
              placeholder="비밀번호" 
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ height: '40px' }}>
              로그인
            </Button>
          </Form.Item>
        </Form>

        {/* --- 💡 권한별 빠른 테스트 버튼 영역 --- */}
        <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 24, paddingTop: 16, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: 10 }}>
            시연/테스트용 빠른 권한 로그인
          </Text>
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Button 
              size="small" 
              ghost 
              type="primary" 
              style={{ color: '#0050b3', borderColor: '#91d5ff', width: '100%' }}
              onClick={() => handleQuickLogin('admin01', 'admin')}
            >
              👑 최고관리자 권한 로그인
            </Button>
            <Button 
              size="small" 
              style={{ width: '100%' }}
              onClick={() => handleQuickLogin('manager_jeonju', 'password123')}
            >
              🏢 전주지점장 권한 로그인
            </Button>
            <Button 
              size="small" 
              style={{ width: '100%' }}
              onClick={() => handleQuickLogin('manager_busan', 'password123')}
            >
              🏢 부산지점장 권한 로그인
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
}
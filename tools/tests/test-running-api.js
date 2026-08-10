const http = require('http');

const API_BASE = 'http://localhost:8080';

// 测试校园跑API
async function testRunningAPI() {
  console.log('🧪 测试校园跑API...\n');

  // 测试1: 记录一次校园跑
  console.log('1️⃣ 测试记录校园跑...');
  try {
    const recordData = JSON.stringify({
      characterId: 1,
      semester: 1,
      distance: 1000,
      duration: 300,
      status: 'completed'
    });

    const recordResponse = await fetch(`${API_BASE}/api/running/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: recordData
    });

    const recordResult = await recordResponse.json();
    console.log('✅ 记录成功:', recordResult);
  } catch (error) {
    console.error('❌ 记录失败:', error.message);
  }

  console.log('\n2️⃣ 测试获取校园跑记录...');
  try {
    const recordsResponse = await fetch(`${API_BASE}/api/running/1?year=2024&semester=1`);
    const recordsResult = await recordsResponse.json();
    console.log('✅ 获取记录成功，共', recordsResult.length, '条记录');
    console.log('记录详情:', recordsResult);
  } catch (error) {
    console.error('❌ 获取记录失败:', error.message);
  }

  console.log('\n3️⃣ 测试获取统计信息...');
  try {
    const statsResponse = await fetch(`${API_BASE}/api/running/1/stats?year=2024&semester=1`);
    const statsResult = await statsResponse.json();
    console.log('✅ 获取统计成功:', statsResult);
  } catch (error) {
    console.error('❌ 获取统计失败:', error.message);
  }

  console.log('\n✨ 测试完成！');
}

testRunningAPI().catch(console.error);

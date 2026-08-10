const mysql = require('mysql2/promise');
require('dotenv').config();

console.log('🔍 开始测试数据库连接...');
console.log('📋 配置信息:');
console.log('   - 主机:', process.env.DB_HOST || 'localhost');
console.log('   - 用户:', process.env.DB_USER || 'root');
console.log('   - 数据库:', process.env.DB_NAME || 'hust_world');
console.log('');

async function testDatabase() {
  try {
    console.log('1️⃣ 尝试连接 MySQL 服务器...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456'
    });
    console.log('✅ MySQL 服务器连接成功！');

    console.log('');
    console.log('2️⃣ 检查数据库是否存在...');
    const dbName = process.env.DB_NAME || 'hust_world';
    const [databases] = await connection.execute('SHOW DATABASES LIKE ?', [dbName]);
    
    if (databases.length > 0) {
      console.log('✅ 数据库已存在:', dbName);
    } else {
      console.log('⚠️  数据库不存在，正在创建...');
      await connection.execute(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ 数据库创建成功:', dbName);
    }

    console.log('');
    console.log('3️⃣ 连接到目标数据库...');
    await connection.changeUser({ database: dbName });
    console.log('✅ 已连接到数据库:', dbName);

    console.log('');
    console.log('4️⃣ 检查表结构...');
    const [tables] = await connection.execute('SHOW TABLES');
    const tableCount = tables.length;
    
    if (tableCount > 0) {
      console.log('✅ 找到', tableCount, '张表:');
      tables.forEach(t => console.log('   -', Object.values(t)[0]));
    } else {
      console.log('⚠️  暂无数据表，启动服务器后会自动创建');
    }

    console.log('');
    console.log('🎉 数据库测试通过！');
    console.log('');
    console.log('📌 下一步:');
    console.log('   1. 运行 "npm install" 安装依赖');
    console.log('   2. 运行 "npm start" 启动服务器');
    console.log('   3. 或者直接双击 "start.bat" 自动启动');
    console.log('');

    await connection.end();
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('❌ 数据库测试失败！');
    console.error('');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 错误: 无法连接到 MySQL 服务器');
      console.error('💡 请检查:');
      console.error('   - MySQL 服务是否已启动？');
      console.error('   - 端口号是否正确？（默认 3306）');
      console.error('   - 防火墙是否阻止了连接？');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('🔴 错误: 用户名或密码错误');
      console.error('💡 请检查 .env 文件中的 DB_USER 和 DB_PASSWORD');
    } else {
      console.error('🔴 错误详情:', error.message);
    }
    
    console.error('');
    console.error('📌 解决方法:');
    console.error('   1. 确保 MySQL 已安装并启动');
    console.error('   2. 检查 .env 文件中的数据库配置');
    console.error('   3. 请检查 .env 中的数据库连接配置');
    console.error('');
    
    process.exit(1);
  }
}

testDatabase();

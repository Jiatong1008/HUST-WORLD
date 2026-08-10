require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const { pool } = require('../../config/db');

function placeholders(count) {
  return new Array(count).fill('?').join(',');
}

async function cleanupUsersByPrefix(prefix) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [users] = await connection.execute(
      'SELECT user_id FROM users WHERE username LIKE ?',
      [`${prefix}%`]
    );

    if (users.length === 0) {
      console.log(`未发现 ${prefix} 前缀的测试用户。`);
      await connection.commit();
      return 0;
    }

    const userIds = users.map(u => u.user_id);
    const userPh = placeholders(userIds.length);

    const [characters] = await connection.execute(
      `SELECT character_id FROM characters WHERE user_id IN (${userPh})`,
      userIds
    );
    const characterIds = characters.map(c => c.character_id);

    console.log(`发现 ${userIds.length} 个 ${prefix} 测试用户，${characterIds.length} 个测试角色，准备清理...`);

    if (characterIds.length > 0) {
      const charPh = placeholders(characterIds.length);
      await connection.execute(`DELETE FROM campus_runs WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_clubs WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_club_tasks WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_elective_courses WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_explorations WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_innovation_projects WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_items WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_skills WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_sports_classes WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM character_tasks WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM routines WHERE character_id IN (${charPh})`, characterIds);
      await connection.execute(`DELETE FROM battle_records WHERE character_id IN (${charPh})`, characterIds);
    }

    await connection.execute(`DELETE FROM characters WHERE user_id IN (${userPh})`, userIds);
    await connection.execute(`DELETE FROM users WHERE user_id IN (${userPh})`, userIds);
    await connection.commit();

    console.log(`已安全清理 ${userIds.length} 个 ${prefix} 测试用户及其关联数据。`);
    return userIds.length;
  } catch (error) {
    await connection.rollback();
    console.error(`清理 ${prefix} 测试数据失败:`, error.message);
    throw error;
  } finally {
    connection.release();
  }
}

async function cleanupSmokeData() {
  console.log('开始清理测试数据...');
  const prefixes = ['smoke_user_', 'verify_user_', 'test_user_', 'service_user_', 'e2e_user_'];
  let total = 0;
  try {
    for (const prefix of prefixes) {
      const count = await cleanupUsersByPrefix(prefix);
      total += count;
    }
    console.log(`\n清理完成：共清理 ${total} 个测试用户。`);
  } catch (error) {
    console.error('清理测试数据失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupSmokeData().catch((error) => {
  console.error('cleanup-smoke-data 执行异常:', error);
  process.exit(1);
});

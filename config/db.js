const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

const dbPort = Number(process.env.DB_PORT || 3306);

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: dbPort,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'hust_world',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDatabase = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: dbPort,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456'
  });

  await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'hust_world'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.end();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS characters (
      character_id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      character_name VARCHAR(50) NOT NULL,
      gender ENUM('male', 'female') NOT NULL,
      college VARCHAR(50) NOT NULL,
      grade INT DEFAULT 1,
      semester INT DEFAULT 1,
      week INT DEFAULT 1,
      level INT DEFAULT 1,
      experience INT DEFAULT 0,
      money INT DEFAULT 1000,
      physical INT DEFAULT 50,
      social INT DEFAULT 50,
      knowledge INT DEFAULT 50,
      game_progress JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(user_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tasks (
      task_id INT PRIMARY KEY AUTO_INCREMENT,
      task_name VARCHAR(100) NOT NULL,
      task_type ENUM('main', 'side', 'required', 'internship') NOT NULL,
      description TEXT NOT NULL,
      requirements JSON NULL,
      reward JSON NULL,
      difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_tasks (
      character_task_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      task_id INT NOT NULL,
      status ENUM('accepted', 'in_progress', 'completed', 'failed') DEFAULT 'accepted',
      progress JSON NULL,
      accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (task_id) REFERENCES tasks(task_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS maps (
      map_id INT PRIMARY KEY AUTO_INCREMENT,
      map_name VARCHAR(100) NOT NULL,
      map_type ENUM('dormitory', 'canteen', 'teaching_building', 'college', 'landmark', 'shop', 'hospital', 'playground') NOT NULL,
      description TEXT NULL,
      x_coordinate INT NOT NULL,
      y_coordinate INT NOT NULL,
      width INT DEFAULT 0,
      height INT DEFAULT 0,
      resource_path VARCHAR(255) NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS teleport_stations (
      teleport_id INT PRIMARY KEY AUTO_INCREMENT,
      map_id INT NULL,
      station_name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      x_coordinate INT NOT NULL,
      y_coordinate INT NOT NULL,
      width INT DEFAULT 0,
      height INT DEFAULT 0,
      teleport_fee INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (map_id) REFERENCES maps(map_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS npcs (
      npc_id INT PRIMARY KEY AUTO_INCREMENT,
      npc_name VARCHAR(50) NOT NULL,
      npc_type ENUM('teacher', 'senior', 'dormitory_guard', 'canteen_worker', 'other') NOT NULL,
      map_id INT NOT NULL,
      x_coordinate INT NOT NULL,
      y_coordinate INT NOT NULL,
      dialogue JSON NULL,
      npc_function VARCHAR(100) NULL,
      FOREIGN KEY (map_id) REFERENCES maps(map_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS items (
      item_id INT PRIMARY KEY AUTO_INCREMENT,
      item_name VARCHAR(100) NOT NULL,
      item_type ENUM('consumable', 'equipment', 'collectible') NOT NULL,
      description TEXT NULL,
      effect JSON NULL,
      price INT NOT NULL,
      stock INT DEFAULT 0
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_items (
      character_item_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      item_id INT NOT NULL,
      quantity INT DEFAULT 1,
      acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (item_id) REFERENCES items(item_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS skills (
      skill_id INT PRIMARY KEY AUTO_INCREMENT,
      skill_name VARCHAR(100) NOT NULL,
      skill_type ENUM('knowledge', 'combat', 'support') NOT NULL,
      description TEXT NULL,
      effect JSON NULL,
      required_level INT DEFAULT 1,
      course_related VARCHAR(100) NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_skills (
      character_skill_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      skill_id INT NOT NULL,
      level INT DEFAULT 1,
      acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS clubs (
      club_id INT PRIMARY KEY AUTO_INCREMENT,
      club_name VARCHAR(100) NOT NULL,
      club_type ENUM('music', 'sports', 'academic', 'art', 'other') NOT NULL,
      description TEXT NULL,
      max_members INT DEFAULT 50,
      requirements JSON NULL,
      club_icon VARCHAR(255) NULL,
      npc_id INT NULL,
      FOREIGN KEY (npc_id) REFERENCES npcs(npc_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS club_tasks (
      club_task_id INT PRIMARY KEY AUTO_INCREMENT,
      club_id INT NOT NULL,
      task_name VARCHAR(100) NOT NULL,
      task_type ENUM('daily', 'weekly', 'monthly', 'special') NOT NULL,
      description TEXT NULL,
      difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
      reward JSON NULL,
      grade_limit INT NULL,
      FOREIGN KEY (club_id) REFERENCES clubs(club_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_clubs (
      character_club_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      club_id INT NOT NULL,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'quit', 'forced_exit') DEFAULT 'active',
      quit_at TIMESTAMP NULL,
      exit_reason VARCHAR(255) NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (club_id) REFERENCES clubs(club_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_club_tasks (
      character_club_task_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      club_task_id INT NOT NULL,
      status ENUM('accepted', 'in_progress', 'completed') DEFAULT 'accepted',
      progress JSON NULL,
      accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (club_task_id) REFERENCES club_tasks(club_task_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS campus_exploration (
      exploration_id INT PRIMARY KEY AUTO_INCREMENT,
      map_id INT NOT NULL,
      exploration_type ENUM('photo', 'collection', 'hidden') NOT NULL,
      description TEXT NULL,
      reward JSON NULL,
      FOREIGN KEY (map_id) REFERENCES maps(map_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_explorations (
      character_exploration_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      exploration_id INT NOT NULL,
      status ENUM('pending', 'completed') DEFAULT 'pending',
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (exploration_id) REFERENCES campus_exploration(exploration_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS campus_runs (
      run_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      semester INT NOT NULL,
      run_date DATE NOT NULL,
      distance INT NOT NULL,
      duration INT NOT NULL,
      status ENUM('completed', 'failed') DEFAULT 'completed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(character_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS elective_courses (
      course_id INT PRIMARY KEY AUTO_INCREMENT,
      course_name VARCHAR(100) NOT NULL,
      course_type ENUM('humanities', 'science', 'art', 'sports', 'other') NOT NULL,
      description TEXT NULL,
      credit INT DEFAULT 2,
      max_students INT DEFAULT 50
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_elective_courses (
      character_course_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      course_id INT NOT NULL,
      semester INT NOT NULL,
      status ENUM('enrolled', 'passed', 'failed') DEFAULT 'enrolled',
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (course_id) REFERENCES elective_courses(course_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS sports_classes (
      class_id INT PRIMARY KEY AUTO_INCREMENT,
      class_name VARCHAR(100) NOT NULL,
      description TEXT NULL,
      total_sessions INT DEFAULT 16,
      max_absences INT DEFAULT 3
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_sports_classes (
      character_class_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      class_id INT NOT NULL,
      semester INT NOT NULL,
      attended_sessions INT DEFAULT 0,
      absent_sessions INT DEFAULT 0,
      status ENUM('in_progress', 'passed', 'failed') DEFAULT 'in_progress',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (class_id) REFERENCES sports_classes(class_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS innovation_projects (
      project_id INT PRIMARY KEY AUTO_INCREMENT,
      project_name VARCHAR(100) NOT NULL,
      project_type ENUM('research', 'innovation', 'entrepreneurship') NOT NULL,
      description TEXT NULL,
      required_members INT DEFAULT 4,
      duration_weeks INT DEFAULT 16,
      reward JSON NULL
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS character_innovation_projects (
      character_project_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      project_id INT NOT NULL,
      role ENUM('leader', 'member') DEFAULT 'member',
      progress INT DEFAULT 0,
      status ENUM('in_progress', 'completed', 'failed') DEFAULT 'in_progress',
      started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (character_id) REFERENCES characters(character_id),
      FOREIGN KEY (project_id) REFERENCES innovation_projects(project_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS battle_records (
      record_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      battle_type ENUM('homework', 'exam') NOT NULL,
      enemy_name VARCHAR(100) NOT NULL,
      result ENUM('win', 'lose') NOT NULL,
      damage_dealt INT NOT NULL,
      damage_taken INT NOT NULL,
      exp_gained INT NULL,
      gold_gained INT NULL,
      battle_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(character_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS routines (
      routine_id INT PRIMARY KEY AUTO_INCREMENT,
      character_id INT NOT NULL,
      routine_type VARCHAR(50) NOT NULL,
      description TEXT NULL,
      schedule JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (character_id) REFERENCES characters(character_id)
    )
  `);

  await runMigrations();

  logger.info('Database initialized successfully');
};

const runMigrations = async () => {
  const columnExists = async (table, column) => {
    const [rows] = await pool.execute(
      `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'hust_world', table, column]
    );
    return rows.length > 0;
  };

  const addColumn = async (table, column, def) => {
    const exists = await columnExists(table, column);
    if (!exists) {
      await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
      logger.info('Database migration applied', { table, column, action: 'add_column' });
    }
  };

  const npcFunctionExists = await columnExists('npcs', 'npc_function');
  const npcFunctionOldExists = await columnExists('npcs', 'npcfunction');

  if (!npcFunctionExists && npcFunctionOldExists) {
    await pool.execute(`ALTER TABLE npcs CHANGE COLUMN npcfunction npc_function VARCHAR(100) NULL`);
    logger.info('Database migration applied', { table: 'npcs', action: 'rename_column', from: 'npcfunction', to: 'npc_function' });
  } else if (!npcFunctionExists) {
    await pool.execute(`ALTER TABLE npcs ADD COLUMN npc_function VARCHAR(100) NULL`);
    logger.info('Database migration applied', { table: 'npcs', column: 'npc_function', action: 'add_column' });
  }

  const clubNpcIdExists = await columnExists('clubs', 'npc_id');
  if (!clubNpcIdExists) {
    await pool.execute(`ALTER TABLE clubs ADD COLUMN npc_id INT NULL`);
    logger.info('Database migration applied', { table: 'clubs', column: 'npc_id', action: 'add_column' });
  }

  await addColumn('characters', 'mood', 'INT DEFAULT 50');
  await addColumn('characters', 'current_map_id', 'INT NULL');
  await addColumn('characters', 'position_x', 'INT DEFAULT 0');
  await addColumn('characters', 'position_y', 'INT DEFAULT 0');
  await addColumn('characters', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
  await addColumn('characters', 'last_saved_at', 'TIMESTAMP NULL');
};

module.exports = { pool, initDatabase };

const mysql = require('mysql2/promise');
require('dotenv').config();

async function initClubTasks() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('Start initializing club tasks...');

    // Get all clubs
    const [clubs] = await connection.execute('SELECT club_id, club_name, club_type FROM clubs');
    console.log(`Found ${clubs.length} clubs`);

    // Create tasks for each club
    const clubTasks = [];

    // Music Club tasks
    const musicClub = clubs.find(c => c.club_type === 'music');
    if (musicClub) {
      clubTasks.push(
        {
          club_id: musicClub.club_id,
          task_name: 'Morning Practice',
          task_type: 'daily',
          description: 'Morning practice session.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, social: 5 }),
          grade_limit: null
        },
        {
          club_id: musicClub.club_id,
          task_name: 'Team Building',
          task_type: 'team_building',
          description: 'Team building activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, social: 15 }),
          grade_limit: null
        },
        {
          club_id: musicClub.club_id,
          task_name: 'Music Festival',
          task_type: 'performance',
          description: 'Campus music festival performance.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, social: 50 }),
          grade_limit: null
        },
        {
          club_id: musicClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Anime Club tasks
    const animeClub = clubs.find(c => c.club_type === 'art' && c.club_name.includes('动漫'));
    if (animeClub) {
      clubTasks.push(
        {
          club_id: animeClub.club_id,
          task_name: 'Daily Drawing',
          task_type: 'daily',
          description: 'Daily drawing practice.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, knowledge: 5 }),
          grade_limit: null
        },
        {
          club_id: animeClub.club_id,
          task_name: 'Team Building',
          task_type: 'team_building',
          description: 'Team building activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, social: 15 }),
          grade_limit: null
        },
        {
          club_id: animeClub.club_id,
          task_name: 'Anime Festival',
          task_type: 'performance',
          description: 'Campus anime festival.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, social: 50 }),
          grade_limit: null
        },
        {
          club_id: animeClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Basketball Club tasks
    const basketballClub = clubs.find(c => c.club_type === 'sports' && c.club_name.includes('篮球'));
    if (basketballClub) {
      clubTasks.push(
        {
          club_id: basketballClub.club_id,
          task_name: 'Daily Training',
          task_type: 'daily',
          description: 'Daily basketball training.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, physical: 5 }),
          grade_limit: null
        },
        {
          club_id: basketballClub.club_id,
          task_name: 'Team Building',
          task_type: 'team_building',
          description: 'Team building activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, physical: 15 }),
          grade_limit: null
        },
        {
          club_id: basketballClub.club_id,
          task_name: 'Basketball League',
          task_type: 'competition',
          description: 'Campus basketball league.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, physical: 50 }),
          grade_limit: null
        },
        {
          club_id: basketballClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Football Club tasks
    const footballClub = clubs.find(c => c.club_type === 'sports' && c.club_name.includes('足球'));
    if (footballClub) {
      clubTasks.push(
        {
          club_id: footballClub.club_id,
          task_name: 'Morning Running',
          task_type: 'daily',
          description: 'Morning running training.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, physical: 5 }),
          grade_limit: null
        },
        {
          club_id: footballClub.club_id,
          task_name: 'Team Building',
          task_type: 'team_building',
          description: 'Team building activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, physical: 15 }),
          grade_limit: null
        },
        {
          club_id: footballClub.club_id,
          task_name: 'Football League',
          task_type: 'competition',
          description: 'Campus football league.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, physical: 50 }),
          grade_limit: null
        },
        {
          club_id: footballClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Game Club tasks
    const gameClub = clubs.find(c => c.club_type === 'other' && c.club_name.includes('游戏'));
    if (gameClub) {
      clubTasks.push(
        {
          club_id: gameClub.club_id,
          task_name: 'Game Review',
          task_type: 'daily',
          description: 'Daily game review task.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, knowledge: 5 }),
          grade_limit: null
        },
        {
          club_id: gameClub.club_id,
          task_name: 'Game Night',
          task_type: 'team_building',
          description: 'Club game night activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, social: 15 }),
          grade_limit: null
        },
        {
          club_id: gameClub.club_id,
          task_name: 'E-sports Tournament',
          task_type: 'competition',
          description: 'Campus e-sports tournament.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, social: 50 }),
          grade_limit: null
        },
        {
          club_id: gameClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Dance Club tasks
    const danceClub = clubs.find(c => c.club_type === 'art' && c.club_name.includes('舞蹈'));
    if (danceClub) {
      clubTasks.push(
        {
          club_id: danceClub.club_id,
          task_name: 'Basic Training',
          task_type: 'daily',
          description: 'Daily dance basic training.',
          difficulty: 'easy',
          reward: JSON.stringify({ money: 50, experience: 30, physical: 5 }),
          grade_limit: null
        },
        {
          club_id: danceClub.club_id,
          task_name: 'Team Building',
          task_type: 'team_building',
          description: 'Team building activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 200, experience: 100, social: 15 }),
          grade_limit: null
        },
        {
          club_id: danceClub.club_id,
          task_name: 'Dance Competition',
          task_type: 'performance',
          description: 'Campus dance competition.',
          difficulty: 'hard',
          reward: JSON.stringify({ money: 1000, experience: 500, social: 50 }),
          grade_limit: null
        },
        {
          club_id: danceClub.club_id,
          task_name: 'Recruitment',
          task_type: 'recruitment',
          description: 'Club recruitment activity.',
          difficulty: 'medium',
          reward: JSON.stringify({ money: 300, experience: 150, social: 20 }),
          grade_limit: null
        }
      );
    }

    // Insert club tasks
    for (const task of clubTasks) {
      await connection.execute(
        'INSERT INTO club_tasks (club_id, task_name, task_type, description, difficulty, reward, grade_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [task.club_id, task.task_name, task.task_type, task.description, task.difficulty, task.reward, task.grade_limit]
      );
      console.log(`Added task: ${task.task_name}`);
    }

    console.log(`Total ${clubTasks.length} club tasks added!`);

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

initClubTasks();

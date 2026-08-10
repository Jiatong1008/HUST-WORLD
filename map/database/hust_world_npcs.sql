-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: hust_world
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `npcs`
--

DROP TABLE IF EXISTS `npcs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `npcs` (
  `npc_id` int NOT NULL AUTO_INCREMENT,
  `npc_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `npc_type` enum('teacher','senior','dormitory_guard','canteen_worker','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `map_id` int NOT NULL,
  `x_coordinate` int NOT NULL,
  `y_coordinate` int NOT NULL,
  `dialogue` json DEFAULT NULL,
  `npc_function` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`npc_id`),
  KEY `idx_npcs_map_id` (`map_id`),
  KEY `idx_npcs_npc_type` (`npc_type`),
  CONSTRAINT `npcs_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`map_id`)
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `npcs`
--

LOCK TABLES `npcs` WRITE;
/*!40000 ALTER TABLE `npcs` DISABLE KEYS */;
INSERT INTO `npcs` VALUES (232,'舞蹈社社长','senior',36,5055,1907,'{\"dialogues\": [{\"text\": \"你好！我是韵律舞蹈社的社长林雅婷。欢迎来到百团大战！\"}, {\"text\": \"我们社团每周都会举办舞蹈培训和演出活动，如果你热爱舞蹈，欢迎加入！\"}, {\"options\": [\"加入舞蹈社\", \"了解社团活动\", \"离开\"]}, {\"text\": \"太棒了！欢迎加入韵律舞蹈社！希望你能在这里找到跳舞的乐趣！\", \"action\": \"join_club\", \"clubId\": 7}], \"autoBubble\": \"? 舞蹈社招新中！\"}',NULL),(233,'音乐社社长','senior',36,5175,1907,'{\"dialogues\": [{\"text\": \"嘿！我是激扬音乐社社长张浩然。\"}, {\"text\": \"我们社团有乐队、合唱团等各种音乐活动，喜欢音乐的同学快来加入吧！\"}, {\"options\": [\"加入音乐社\", \"了解音乐活动\", \"离开\"]}, {\"text\": \"欢迎加入激扬音乐社！让我们一起用音乐打动人心！\", \"action\": \"join_club\", \"clubId\": 8}], \"autoBubble\": \"? 音乐社招新中！\"}',NULL),(234,'篮球社社长','senior',36,5055,1967,'{\"dialogues\": [{\"text\": \"嘿！我是篮球社社长李明阳。\"}, {\"text\": \"我们社团经常组织篮球训练和比赛，如果你喜欢篮球，就加入我们吧！\"}, {\"options\": [\"加入篮球社\", \"了解篮球比赛\", \"离开\"]}, {\"text\": \"欢迎加入篮球社！期待在球场上看到你的身影！\", \"action\": \"join_club\", \"clubId\": 9}], \"autoBubble\": \"? 篮球社招新中！\"}',NULL),(235,'足球社社长','senior',36,5175,1967,'{\"dialogues\": [{\"text\": \"你好！我是足球社社长王晨曦。\"}, {\"text\": \"我们社团定期举办足球训练和联赛，欢迎热爱足球的同学加入！\"}, {\"options\": [\"加入足球社\", \"了解足球联赛\", \"离开\"]}, {\"text\": \"欢迎加入足球社！绿茵场上见！\", \"action\": \"join_club\", \"clubId\": 10}], \"autoBubble\": \"⚽ 足球社招新中！\"}',NULL),(236,'动漫社社长','senior',36,5115,1887,'{\"dialogues\": [{\"text\": \"嗨！我是动漫社的成员小萌。\"}, {\"text\": \"我们社团涵盖cosplay、番剧观影、动漫讨论等多种活动，二次元的小伙伴快来！\"}, {\"options\": [\"加入动漫社\", \"了解cosplay活动\", \"离开\"]}, {\"text\": \"欢迎加入动漫社！让二次元的梦想照进现实！\", \"action\": \"join_club\", \"clubId\": 11}], \"autoBubble\": \"? 动漫社招新中！\"}',NULL),(237,'游戏社社长','senior',36,5115,1987,'{\"dialogues\": [{\"text\": \"你好！我是游戏社社长陈小游。\"}, {\"text\": \"我们社团组织电竞比赛、游戏交流活动，游戏爱好者不要错过！\"}, {\"options\": [\"加入游戏社\", \"了解电竞比赛\", \"离开\"]}, {\"text\": \"欢迎加入游戏社！游戏不只是娱乐，更是竞技艺术！\", \"action\": \"join_club\", \"clubId\": 12}], \"autoBubble\": \"? 游戏社招新中！\"}',NULL),(238,'李老师','teacher',11,4650,1750,'{\"dialogues\": [{\"text\": \"同学你好，东九教学楼很大，上课前记得确认教室号！\"}], \"autoBubble\": \"上课时间到了\"}',NULL),(239,'张老师','teacher',14,2850,1480,'{\"dialogues\": [{\"text\": \"管理学院注重实践能力培养，希望你能学有所成！\"}], \"autoBubble\": \"管理学院欢迎你\"}',NULL),(240,'王阿姨','canteen_worker',4,5740,1800,'{\"dialogues\": [{\"text\": \"同学你好！今天想吃点什么？我们的糖醋排骨很受欢迎！\"}], \"autoBubble\": \"东园食堂欢迎你\"}',NULL),(241,'陈阿姨','canteen_worker',5,5210,1630,'{\"dialogues\": [{\"text\": \"韵苑食堂的早餐很丰富，包子豆浆都有！\"}], \"autoBubble\": \"早餐准备好了\"}',NULL),(242,'刘阿姨','canteen_worker',6,5135,2140,'{\"dialogues\": [{\"text\": \"学一食堂历史悠久，很多老师也喜欢来这里吃饭。\"}], \"autoBubble\": \"学一食堂欢迎你\"}',NULL),(243,'赵保安','dormitory_guard',1,5250,1450,'{\"dialogues\": [{\"text\": \"同学好！韵苑宿舍晚上11点关门，记得早点回来。\"}], \"autoBubble\": \"晚上注意安全\"}',NULL),(244,'孙保安','dormitory_guard',2,3580,1600,'{\"dialogues\": [{\"text\": \"紫菘宿舍区环境不错，快递在前面快递站。\"}], \"autoBubble\": \"紫菘宿舍区\"}',NULL),(245,'周保安','dormitory_guard',3,1400,2050,'{\"dialogues\": [{\"text\": \"西边宿舍住着很多研究生学长学姐，学习氛围很好。\"}], \"autoBubble\": \"西边宿舍区\"}',NULL),(246,'吴学长','senior',36,5100,1870,'{\"dialogues\": [{\"text\": \"东操场是运动的好地方，篮球、足球都可以玩！\"}], \"autoBubble\": \"来运动吧\"}',NULL),(247,'郑学长','senior',21,2250,1900,'{\"dialogues\": [{\"text\": \"图书馆自习室在二楼三楼，期末的时候位置很抢手！\"}], \"autoBubble\": \"图书馆学习中\"}',NULL),(248,'冯学姐','senior',19,2040,1860,'{\"dialogues\": [{\"text\": \"青年园春天花开的时候最美，很多同学来这里拍照！\"}], \"autoBubble\": \"青年园真漂亮\"}',NULL),(249,'陈医生','other',29,2670,1130,'{\"dialogues\": [{\"text\": \"同学你好！有什么不舒服吗？校医院可以看常见病。\"}], \"autoBubble\": \"校医院\"}',NULL),(250,'林老板','other',30,2570,1260,'{\"dialogues\": [{\"text\": \"集贸市场什么都有，日用品、零食、水果都很齐全！\"}], \"autoBubble\": \"集贸市场\"}',NULL),(251,'司机张师傅','other',1,5250,1720,'{\"dialogues\": [{\"text\": \"韵苑到主校区的校车，5分钟一趟，很方便！\"}], \"autoBubble\": \"校车来了\"}',NULL),(252,'司机李师傅','other',2,1380,2110,'{\"dialogues\": [{\"text\": \"紫菘到东边的校车，刷卡就能坐，很方便！\"}], \"autoBubble\": \"紫菘校车\"}',NULL),(253,'许老师','teacher',23,4830,2700,'{\"dialogues\": [{\"text\": \"光电国家实验室是我们学校的骄傲，很多前沿研究在这里进行！\"}], \"autoBubble\": \"光电实验室\"}',NULL),(254,'何学姐','senior',22,2600,800,'{\"dialogues\": [{\"text\": \"喻家山是我们华科的后花园，傍晚爬爬山看看日落特别舒服！\"}], \"autoBubble\": \"喻家山\"}',NULL),(255,'吕教练','other',37,3300,2360,'{\"dialogues\": [{\"text\": \"中心操场是学校最大的运动场，运动会就在这里举办！\"}], \"autoBubble\": \"中心操场\"}',NULL),(256,'施老师','teacher',12,1580,2600,'{\"dialogues\": [{\"text\": \"西十二是亚洲第三大教学楼，教室很多，上课别走错了！\"}], \"autoBubble\": \"西十二教学楼\"}',NULL),(257,'张同学','senior',35,4760,1780,'{\"dialogues\": [{\"text\": \"东九草坪很适合学习和休息，阳光好的时候特别舒服！\"}], \"autoBubble\": \"东九草坪\"}',NULL),(258,'孔博士','teacher',26,2980,1020,'{\"dialogues\": [{\"text\": \"精密重力测量中心做的是前沿科学研究，很有挑战性！\"}], \"autoBubble\": \"引力中心\"}',NULL),(259,'曹老师','teacher',16,1620,2310,'{\"dialogues\": [{\"text\": \"电气学院是我们学校的王牌专业，就业前景非常好！\"}], \"autoBubble\": \"电气学院\"}',NULL),(260,'严老师','teacher',17,3320,1850,'{\"dialogues\": [{\"text\": \"机械学院历史悠久，实力雄厚，很多大国重器都有我们的贡献！\"}], \"autoBubble\": \"机械学院\"}',NULL),(261,'牛同学','senior',18,5780,1710,'{\"dialogues\": [{\"text\": \"爱因斯坦广场是学校的标志性地点，很多社团活动在这里举办！\"}], \"autoBubble\": \"爱因斯坦广场\"}',NULL),(262,'郝老板','other',34,5210,1700,'{\"dialogues\": [{\"text\": \"韵苑超市日常用品都有，零食饮料也很齐全！\"}], \"autoBubble\": \"韵苑超市\"}',NULL),(263,'金老板','other',32,1620,1620,'{\"dialogues\": [{\"text\": \"紫菘超市商品很全，水果也很新鲜！\"}], \"autoBubble\": \"紫菘超市\"}',NULL),(264,'魏老板','other',33,3530,2280,'{\"dialogues\": [{\"text\": \"喻园超市虽小，但东西很全，附近同学都喜欢来！\"}], \"autoBubble\": \"喻园超市\"}',NULL),(265,'陶学长','senior',38,1570,1900,'{\"dialogues\": [{\"text\": \"西操场离西边宿舍很近，晚上很多人来跑步！\"}], \"autoBubble\": \"西操场\"}',NULL),(266,'姜学姐','senior',25,2580,2610,'{\"dialogues\": [{\"text\": \"毛主席像是学校的标志性建筑，新生入学都会来这里拍照！\"}], \"autoBubble\": \"毛主席像\"}',NULL),(267,'谢保安','dormitory_guard',24,2580,2620,'{\"dialogues\": [{\"text\": \"南大门是学校的正门，很气派！进出记得带好学生证。\"}], \"autoBubble\": \"南大门\"}',NULL),(268,'韩学姐','senior',27,2010,1850,'{\"dialogues\": [{\"text\": \"建校纪念碑记录了学校的发展历史，有空可以来看看！\"}], \"autoBubble\": \"建校纪念碑\"}',NULL),(269,'杨老师','teacher',28,2870,1670,'{\"dialogues\": [{\"text\": \"梧桐语经常有学术讲座和交流活动，多来听听受益匪浅！\"}], \"autoBubble\": \"梧桐语问学中心\"}',NULL),(270,'朱老板','other',31,5170,2250,'{\"dialogues\": [{\"text\": \"东校区CBD好吃的很多，聚餐、奶茶、小吃都有！\"}], \"autoBubble\": \"东校区CBD\"}',NULL),(271,'秦学长','senior',9,3400,2180,'{\"dialogues\": [{\"text\": \"东一食堂虽然不大，但味道还不错，二楼的香锅很好吃！\"}], \"autoBubble\": \"东一食堂\"}',NULL),(272,'尤阿姨','canteen_worker',10,2730,1370,'{\"dialogues\": [{\"text\": \"喻园食堂虽然小，但味道很好，很多老师都喜欢来！\"}], \"autoBubble\": \"喻园食堂\"}',NULL),(273,'赵同学','senior',20,3100,2330,'{\"dialogues\": [{\"text\": \"醉晚亭晚上开灯之后特别漂亮，很适合约会！\"}], \"autoBubble\": \"醉晚亭\"}',NULL),(274,'周同学','senior',39,1650,1600,'{\"dialogues\": [{\"text\": \"菘邻里好吃的很多，西边同学的福音！\"}], \"autoBubble\": \"菘邻里\"}',NULL),(275,'周老师','teacher',13,4750,2280,'{\"dialogues\": [{\"text\": \"计算机学院是学校的热门学院，学习氛围很好！\"}], \"autoBubble\": \"计算机学院\"}',NULL),(276,'冯阿姨','canteen_worker',7,1700,1360,'{\"dialogues\": [{\"text\": \"百景园是学校最大的食堂，选择很多！\"}], \"autoBubble\": \"百景园食堂\"}',NULL),(277,'陈师傅','canteen_worker',8,1520,1610,'{\"dialogues\": [{\"text\": \"西一食堂离西边宿舍很近，吃饭很方便！\"}], \"autoBubble\": \"西一食堂\"}',NULL),(278,'王同学','senior',15,5750,1680,'{\"dialogues\": [{\"text\": \"爱因斯坦广场经常举办各种活动，记得关注海报！\"}], \"autoBubble\": \"爱因斯坦广场\"}',NULL);
/*!40000 ALTER TABLE `npcs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-28 10:51:17

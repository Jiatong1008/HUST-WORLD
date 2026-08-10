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
-- Table structure for table `club_tasks`
--

DROP TABLE IF EXISTS `club_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_tasks` (
  `club_task_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `task_name` varchar(100) NOT NULL,
  `description` text,
  `task_type` enum('team_building','performance','competition','recruitment','daily','exit_ceremony') DEFAULT 'daily',
  `difficulty` enum('easy','medium','hard') DEFAULT 'medium',
  `reward` json DEFAULT NULL,
  `grade_limit` int DEFAULT NULL COMMENT '年级限制：null表示无限制，2表示大二，3表示大三',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`club_task_id`),
  KEY `club_id` (`club_id`),
  CONSTRAINT `club_tasks_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `club_tasks`
--

LOCK TABLES `club_tasks` WRITE;
/*!40000 ALTER TABLE `club_tasks` DISABLE KEYS */;
INSERT INTO `club_tasks` VALUES (97,7,'新成员破冰晚会','参加社团破冰活动，认识新朋友','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(98,7,'日常舞蹈训练','参加每周三次的舞蹈训练','daily','medium','{\"exp\": 15, \"money\": 30, \"stamina\": 5}',1,'2026-05-28 01:51:13'),(99,7,'迎新晚会表演','参加迎新晚会舞蹈表演','performance','medium','{\"exp\": 50, \"money\": 100, \"social\": 20}',1,'2026-05-28 01:51:13'),(100,7,'校园舞蹈大赛','代表社团参加校园舞蹈大赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(101,7,'社团招新宣传','为百团大战准备招新材料','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(102,7,'招新面试','参与新生招新面试工作','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(103,7,'年度汇报演出','参加年度社团汇报演出','performance','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(104,7,'社团告别仪式','为即将毕业的学长学姐举办告别演出','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13'),(105,8,'乐队组建会议','参加乐队组建会议，确定演奏方向','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(106,8,'乐队排练','参加每周乐队排练','daily','medium','{\"exp\": 15, \"money\": 30, \"stamina\": 5}',1,'2026-05-28 01:51:13'),(107,8,'校园音乐节','参加校园音乐节演出','performance','medium','{\"exp\": 50, \"money\": 100, \"social\": 20}',1,'2026-05-28 01:51:13'),(108,8,'校园歌手大赛','参加校园歌手大赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(109,8,'招新海报设计','设计招新海报','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(110,8,'新生试音','负责新生试音选拔','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(111,8,'乐队专场演出','举办乐队专场演出','performance','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(112,8,'毕业音乐会','为毕业生举办告别音乐会','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13'),(113,9,'新成员见面会','参加篮球队新成员见面会','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(114,9,'日常训练','参加每周篮球训练','daily','medium','{\"exp\": 15, \"money\": 30, \"stamina\": 10}',1,'2026-05-28 01:51:13'),(115,9,'迎新友谊赛','参加迎新篮球友谊赛','competition','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',1,'2026-05-28 01:51:13'),(116,9,'校园篮球联赛','参加校园篮球联赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(117,9,'招新宣传','制作招新宣传视频','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(118,9,'新生选拔赛','组织新生选拔比赛','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(119,9,'校内对抗赛','与其他学院进行篮球对抗赛','competition','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(120,9,'毕业告别赛','为毕业生举办告别篮球赛','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13'),(121,10,'球队见面会','参加足球队新成员见面会','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(122,10,'日常训练','参加每周足球训练','daily','medium','{\"exp\": 15, \"money\": 30, \"stamina\": 10}',1,'2026-05-28 01:51:13'),(123,10,'新生杯足球赛','参加新生杯足球赛','competition','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',1,'2026-05-28 01:51:13'),(124,10,'校园足球联赛','参加校园足球联赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(125,10,'招新策划','策划招新活动','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(126,10,'新生试训','组织新生试训选拔','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(127,10,'校际友谊赛','与其他学校进行足球友谊赛','competition','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(128,10,'毕业告别赛','为毕业生举办告别足球赛','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13'),(129,11,'新成员茶话会','参加动漫社新成员茶话会','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(130,11,'番剧观影会','参加每周番剧观影活动','daily','medium','{\"exp\": 15, \"money\": 30, \"social\": 5}',1,'2026-05-28 01:51:13'),(131,11,'校园漫展','参加校园漫展cosplay表演','performance','medium','{\"exp\": 50, \"money\": 100, \"social\": 20}',1,'2026-05-28 01:51:13'),(132,11,'cosplay大赛','参加cosplay大赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(133,11,'招新摊位布置','布置百团大战招新摊位','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(134,11,'招新表演','准备招新cosplay表演','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(135,11,'动漫节活动','组织校园动漫节活动','performance','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(136,11,'毕业告别祭','为毕业生举办动漫主题告别祭','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13'),(137,12,'新成员见面会','参加游戏社新成员见面会','team_building','medium','{\"exp\": 20, \"money\": 50, \"social\": 10}',1,'2026-05-28 01:51:13'),(138,12,'游戏夜活动','参加每周游戏夜活动','daily','medium','{\"exp\": 15, \"money\": 30, \"social\": 5}',1,'2026-05-28 01:51:13'),(139,12,'电竞友谊赛','参加校内电竞友谊赛','competition','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',1,'2026-05-28 01:51:13'),(140,12,'校园电竞赛','参加校园电竞大赛','competition','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',1,'2026-05-28 01:51:13'),(141,12,'招新宣传','制作游戏社招新宣传','recruitment','medium','{\"exp\": 40, \"money\": 80, \"social\": 15}',2,'2026-05-28 01:51:13'),(142,12,'新生水友赛','组织新生水友赛','recruitment','medium','{\"exp\": 50, \"money\": 100, \"social\": 25}',2,'2026-05-28 01:51:13'),(143,12,'游戏嘉年华','组织校园游戏嘉年华活动','performance','medium','{\"exp\": 80, \"money\": 150, \"social\": 25}',1,'2026-05-28 01:51:13'),(144,12,'毕业告别赛','为毕业生举办告别电竞比赛','exit_ceremony','medium','{\"exp\": 100, \"money\": 200, \"social\": 30}',3,'2026-05-28 01:51:13');
/*!40000 ALTER TABLE `club_tasks` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-28 10:51:18

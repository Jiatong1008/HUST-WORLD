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
-- Table structure for table `maps`
--

DROP TABLE IF EXISTS `maps`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maps` (
  `map_id` int NOT NULL AUTO_INCREMENT,
  `map_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `map_type` enum('dormitory','canteen','teaching_building','college','landmark','shop','hospital','playground') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `x_coordinate` int NOT NULL,
  `y_coordinate` int NOT NULL,
  `width` int DEFAULT '0',
  `height` int DEFAULT '0',
  `resource_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`map_id`),
  KEY `idx_maps_map_type` (`map_type`),
  KEY `idx_maps_coordinates` (`x_coordinate`,`y_coordinate`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maps`
--

LOCK TABLES `maps` WRITE;
/*!40000 ALTER TABLE `maps` DISABLE KEYS */;
INSERT INTO `maps` VALUES (1,'韵苑宿舍','dormitory','本科生宿舍区之一',3417,1548,417,387,NULL),(2,'沁苑宿舍','dormitory','本科生宿舍区之一',788,2017,456,336,NULL),(3,'紫菘宿舍','dormitory','本科生宿舍区之一',5310,1341,218,385,NULL),(4,'东园食堂','canteen','东校区食堂',5748,1804,99,62,NULL),(5,'韵苑食堂','canteen','韵苑食堂',5164,1631,85,61,NULL),(6,'学一食堂','canteen','主校区食堂',5139,2144,88,54,NULL),(7,'百景园食堂','canteen','大型食堂',1670,1338,106,126,NULL),(8,'西一食堂','canteen','西校区食堂',1489,1591,115,49,NULL),(9,'东一食堂','canteen','东校区食堂',5350,2146,132,153,NULL),(10,'喻园食堂','canteen','喻园食堂',2696,1350,82,46,NULL),(11,'东九教学楼','teaching_building','亚州第一大楼',4409,1716,183,311,NULL),(12,'西十二教学楼','teaching_building','亚州第三大楼',1495,2539,271,116,NULL),(13,'东十二教学楼','teaching_building','东校区教学楼',5412,2024,170,82,NULL),(14,'管理学院','college','管理学院',2798,1452,312,132,NULL),(15,'计算机学院','college','计算机学院',4800,2260,301,231,NULL),(16,'电气学院','college','电气学院',1564,2273,90,77,NULL),(17,'机械学院','college','机械学院',3119,1792,245,145,NULL),(18,'爱因斯坦广场','landmark','爱广场',5722,1683,39,61,NULL),(19,'青年园','landmark','青年公园',1999,1837,111,249,NULL),(20,'醉晚亭','landmark','镜湖旁古亭',3056,2301,113,164,NULL),(21,'主图书馆','landmark','主图书馆',2191,1882,138,194,NULL),(22,'喻家山','landmark','校内山体',2381,630,2058,254,NULL),(23,'光电国家研究中心','landmark','国家级研究中心',5408,2677,158,418,NULL),(24,'南大门','landmark','学校主入口',2526,2773,0,0,NULL),(25,'毛主席像','landmark','毛主席雕像',2543,2583,0,0,NULL),(26,'精密重力测量中心','landmark','国家级研究中心',2841,996,314,95,NULL),(27,'建校纪念碑','landmark','建校纪念碑',1953,1826,24,25,NULL),(28,'梧桐语学习中心','landmark','梧桐语中心',2777,1628,192,119,NULL),(29,'校医院','hospital','校园医院',2635,1113,125,113,NULL),(30,'集贸市场','shop','集贸市场',2522,1254,136,114,NULL),(31,'东校区CBD','shop','东校区CBD',5135,2220,79,103,NULL),(32,'紫菘超市','shop','紫菘超市',5210,1697,38,20,NULL),(33,'沁苑超市','shop','沁苑超市',1605,1600,47,27,NULL),(34,'韵苑超市','shop','韵苑超市',3492,2244,86,67,NULL),(35,'东九草坪','playground','东九草坪',4688,1757,155,65,NULL),(36,'东操','playground','东操',5061,1831,107,212,NULL),(37,'中心操','playground','中心操',3219,2322,261,285,NULL),(38,'西操','playground','西操',1455,1842,234,268,NULL),(39,'沁园里','landmark','沁园里',1608,1572,35,15,NULL),(40,'引力实验室','landmark','引力实验室',2637,877,121,41,NULL);
/*!40000 ALTER TABLE `maps` ENABLE KEYS */;
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

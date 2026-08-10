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
-- Table structure for table `campus_exploration`
--

DROP TABLE IF EXISTS `campus_exploration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campus_exploration` (
  `exploration_id` int NOT NULL AUTO_INCREMENT,
  `map_id` int NOT NULL,
  `exploration_type` enum('photo','collection','hidden') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `reward` json DEFAULT NULL,
  PRIMARY KEY (`exploration_id`),
  KEY `map_id` (`map_id`),
  CONSTRAINT `campus_exploration_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`map_id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `campus_exploration`
--

LOCK TABLES `campus_exploration` WRITE;
/*!40000 ALTER TABLE `campus_exploration` DISABLE KEYS */;
INSERT INTO `campus_exploration` VALUES (1,18,'photo','在爱因斯坦广场拍照','{\"money\": 50}'),(2,19,'photo','在青年园拍照','{\"money\": 50}'),(3,20,'photo','在醉晚亭拍照','{\"money\": 50}'),(4,21,'photo','在建校纪念碑拍照','{\"money\": 50}'),(5,22,'photo','在光电国家研究中心拍照','{\"money\": 50}'),(6,23,'photo','在毛主席像拍照','{\"money\": 50}'),(7,24,'photo','在校史馆拍照','{\"money\": 50}'),(8,25,'photo','在喻家山拍照','{\"money\": 50}'),(9,26,'photo','在梧桐语文学中心拍照','{\"money\": 50}'),(10,27,'photo','在东九草坪拍照','{\"money\": 50}'),(11,28,'photo','在图书馆拍照','{\"money\": 50}'),(12,29,'photo','在菘邻里拍照','{\"money\": 50}'),(13,30,'photo','在韵活拍照','{\"money\": 50}'),(14,31,'photo','在紫活拍照','{\"money\": 50}'),(15,32,'photo','在脉冲强磁场科学中心拍照','{\"money\": 50}'),(16,33,'photo','在精密重力测量科学中心拍照','{\"money\": 50}'),(17,34,'photo','在数字化设计与制造创新中心拍照','{\"money\": 50}');
/*!40000 ALTER TABLE `campus_exploration` ENABLE KEYS */;
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

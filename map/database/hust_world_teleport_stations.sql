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
-- Table structure for table `teleport_stations`
--

DROP TABLE IF EXISTS `teleport_stations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teleport_stations` (
  `teleport_id` int NOT NULL AUTO_INCREMENT,
  `map_id` int DEFAULT NULL,
  `station_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `x_coordinate` int NOT NULL,
  `y_coordinate` int NOT NULL,
  `width` int DEFAULT '0',
  `height` int DEFAULT '0',
  `teleport_fee` int DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`teleport_id`),
  KEY `idx_teleport_stations_map_id` (`map_id`),
  KEY `idx_teleport_stations_coordinates` (`x_coordinate`,`y_coordinate`),
  CONSTRAINT `teleport_stations_ibfk_1` FOREIGN KEY (`map_id`) REFERENCES `maps` (`map_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teleport_stations`
--

LOCK TABLES `teleport_stations` WRITE;
/*!40000 ALTER TABLE `teleport_stations` DISABLE KEYS */;
INSERT INTO `teleport_stations` VALUES (1,NULL,'紫菘公交站','巴士站',5250,1723,22,20,10,1),(2,NULL,'沁苑公交站','巴士站',1381,2114,0,0,10,1),(3,NULL,'韵苑公交站','巴士站',3629,1991,0,0,10,1),(4,NULL,'图书馆公交站','巴士站',2405,2001,0,0,10,1),(5,NULL,'南大门公交站','巴士站',2364,2541,0,0,10,1),(6,NULL,'西十二公交站','巴士站',1803,2574,0,0,10,1),(7,NULL,'东九公交站','巴士站',4526,1629,18,13,10,1),(8,NULL,'集贸公交站','巴士站',2777,1403,17,15,10,1);
/*!40000 ALTER TABLE `teleport_stations` ENABLE KEYS */;
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

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
-- Table structure for table `character_explorations`
--

DROP TABLE IF EXISTS `character_explorations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `character_explorations` (
  `character_exploration_id` int NOT NULL AUTO_INCREMENT,
  `character_id` int NOT NULL,
  `exploration_id` int NOT NULL,
  `status` enum('pending','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`character_exploration_id`),
  KEY `idx_character_explorations_character_id` (`character_id`),
  KEY `idx_character_explorations_exploration_id` (`exploration_id`),
  KEY `idx_character_explorations_status` (`status`),
  CONSTRAINT `character_explorations_ibfk_1` FOREIGN KEY (`character_id`) REFERENCES `characters` (`character_id`),
  CONSTRAINT `character_explorations_ibfk_2` FOREIGN KEY (`exploration_id`) REFERENCES `campus_exploration` (`exploration_id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `character_explorations`
--

LOCK TABLES `character_explorations` WRITE;
/*!40000 ALTER TABLE `character_explorations` DISABLE KEYS */;
INSERT INTO `character_explorations` VALUES (3,1,3,'completed','2026-05-16 07:42:07'),(4,1,4,'completed','2026-05-16 03:50:58'),(5,1,1,'completed','2026-05-16 07:42:54'),(6,1,7,'completed','2026-05-16 07:43:02'),(7,1,8,'completed','2026-05-20 08:17:46'),(8,1,10,'completed','2026-05-16 07:44:00'),(9,1,2,'completed','2026-05-16 07:44:06'),(10,1,11,'completed','2026-05-20 08:18:00');
/*!40000 ALTER TABLE `character_explorations` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-28 10:51:16

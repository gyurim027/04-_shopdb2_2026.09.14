-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        8.0.29 - MySQL Community Server - GPL
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  12.21.0.7344
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- shopdb2 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `shopdb2` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `shopdb2`;

-- 테이블 shopdb2.ai_providers 구조 내보내기
CREATE TABLE IF NOT EXISTS `ai_providers` (
  `provider_id` bigint NOT NULL AUTO_INCREMENT,
  `provider_code` varchar(50) NOT NULL,
  `provider_name` varchar(100) NOT NULL,
  `provider_type` enum('CLOUD','LOCAL') NOT NULL,
  `base_url` varchar(1000) DEFAULT NULL,
  `chat_model` varchar(200) DEFAULT NULL,
  `embedding_model` varchar(200) DEFAULT NULL,
  `active_yn` char(1) DEFAULT 'Y',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`provider_id`),
  UNIQUE KEY `provider_code` (`provider_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.ai_providers:~3 rows (대략적) 내보내기
DELETE FROM `ai_providers`;
INSERT INTO `ai_providers` (`provider_id`, `provider_code`, `provider_name`, `provider_type`, `base_url`, `chat_model`, `embedding_model`, `active_yn`, `created_at`) VALUES
	(1, 'OPENAI', 'OpenAI API', 'CLOUD', 'https://api.openai.com', 'OPENAI_CHAT_MODEL', 'text-embedding-3-small', 'Y', '2026-09-09 16:22:31'),
	(2, 'GEMINI', 'Google Gemini API', 'CLOUD', 'https://generativelanguage.googleapis.com', 'GEMINI_CHAT_MODEL', 'GEMINI_EMBEDDING_MODEL', 'Y', '2026-09-09 16:22:31'),
	(3, 'OLLAMA', 'Local Ollama', 'LOCAL', 'http://localhost:11434', 'LOCAL_LLM', 'nomic-embed-text', 'Y', '2026-09-09 16:22:31');

-- 테이블 shopdb2.buyer_inquiries 구조 내보내기
CREATE TABLE IF NOT EXISTS `buyer_inquiries` (
  `inquiry_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `org_id` bigint DEFAULT NULL,
  `category_code` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `inquiry_status` varchar(30) NOT NULL,
  `secret_yn` varchar(1) NOT NULL,
  `answer_content` text,
  `answered_by_user_id` bigint DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT (now()),
  `answered_at` datetime DEFAULT NULL,
  PRIMARY KEY (`inquiry_id`),
  KEY `user_id` (`user_id`),
  KEY `org_id` (`org_id`),
  KEY `answered_by_user_id` (`answered_by_user_id`),
  CONSTRAINT `buyer_inquiries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `buyer_inquiries_ibfk_2` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`),
  CONSTRAINT `buyer_inquiries_ibfk_3` FOREIGN KEY (`answered_by_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.buyer_inquiries:~0 rows (대략적) 내보내기
DELETE FROM `buyer_inquiries`;

-- 테이블 shopdb2.categories 구조 내보내기
CREATE TABLE IF NOT EXISTS `categories` (
  `category_id` bigint NOT NULL AUTO_INCREMENT,
  `parent_category_id` bigint DEFAULT NULL,
  `category_name` varchar(100) NOT NULL,
  `category_level` int DEFAULT '1',
  `display_order` int DEFAULT '0',
  `active_yn` char(1) DEFAULT 'Y',
  PRIMARY KEY (`category_id`),
  KEY `fk_category_parent` (`parent_category_id`),
  CONSTRAINT `fk_category_parent` FOREIGN KEY (`parent_category_id`) REFERENCES `categories` (`category_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.categories:~6 rows (대략적) 내보내기
DELETE FROM `categories`;
INSERT INTO `categories` (`category_id`, `parent_category_id`, `category_name`, `category_level`, `display_order`, `active_yn`) VALUES
	(1, NULL, '전자제품', 1, 1, 'Y'),
	(2, NULL, '패션', 1, 2, 'Y'),
	(3, 1, '노트북', 2, 1, 'Y'),
	(4, 1, '스마트폰', 2, 2, 'Y'),
	(5, 2, '상의', 2, 1, 'Y'),
	(6, 2, '신발', 2, 2, 'Y');

-- 테이블 shopdb2.company_policies 구조 내보내기
CREATE TABLE IF NOT EXISTS `company_policies` (
  `policy_id` bigint NOT NULL AUTO_INCREMENT,
  `org_id` bigint DEFAULT NULL,
  `policy_code` varchar(50) NOT NULL,
  `policy_name` varchar(200) NOT NULL,
  `policy_version` varchar(30) NOT NULL,
  `policy_type` varchar(50) DEFAULT NULL,
  `policy_content` longtext,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `active_yn` char(1) DEFAULT 'Y',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`policy_id`),
  UNIQUE KEY `uk_policy_version` (`policy_code`,`policy_version`),
  KEY `fk_company_policy_org` (`org_id`),
  CONSTRAINT `fk_company_policy_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.company_policies:~3 rows (대략적) 내보내기
DELETE FROM `company_policies`;
INSERT INTO `company_policies` (`policy_id`, `org_id`, `policy_code`, `policy_name`, `policy_version`, `policy_type`, `policy_content`, `effective_from`, `effective_to`, `active_yn`, `created_at`) VALUES
	(1, 1, 'TERMS', '쇼핑몰 이용약관', '2024.1', 'TERMS', '2024년 스마트쇼핑 이용약관입니다.', '2024-01-01', '2024-12-31', 'Y', '2026-09-09 16:22:31'),
	(2, 1, 'TERMS', '쇼핑몰 이용약관', '2025.1', 'TERMS', '2025년 스마트쇼핑 이용약관입니다.', '2025-01-01', '2025-12-31', 'Y', '2026-09-09 16:22:31'),
	(3, 1, 'TERMS', '쇼핑몰 이용약관', '2026.1', 'TERMS', '2026년 스마트쇼핑 이용약관입니다.', '2026-01-01', NULL, 'Y', '2026-09-09 16:22:31');

-- 테이블 shopdb2.file_assets 구조 내보내기
CREATE TABLE IF NOT EXISTS `file_assets` (
  `file_id` bigint NOT NULL AUTO_INCREMENT,
  `org_id` bigint DEFAULT NULL,
  `file_type` enum('IMAGE','PDF','DOCUMENT','VIDEO','AUDIO','ETC') NOT NULL,
  `storage_type` enum('LOCAL','S3','GCS','NAS','URL') NOT NULL,
  `original_file_name` varchar(500) DEFAULT NULL,
  `stored_file_name` varchar(500) DEFAULT NULL,
  `file_extension` varchar(30) DEFAULT NULL,
  `mime_type` varchar(100) DEFAULT NULL,
  `file_size` bigint DEFAULT '0',
  `storage_path` varchar(1000) DEFAULT NULL,
  `public_url` varchar(2000) DEFAULT NULL,
  `thumbnail_url` varchar(2000) DEFAULT NULL,
  `checksum_sha256` varchar(64) DEFAULT NULL,
  `active_yn` char(1) DEFAULT 'Y',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  KEY `fk_file_org` (`org_id`),
  KEY `idx_file_public_url` (`public_url`(255)),
  CONSTRAINT `fk_file_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.file_assets:~7 rows (대략적) 내보내기
DELETE FROM `file_assets`;
INSERT INTO `file_assets` (`file_id`, `org_id`, `file_type`, `storage_type`, `original_file_name`, `stored_file_name`, `file_extension`, `mime_type`, `file_size`, `storage_path`, `public_url`, `thumbnail_url`, `checksum_sha256`, `active_yn`, `created_at`) VALUES
	(1, 1, 'IMAGE', 'URL', 'notebook_2024.jpg', NULL, 'jpg', 'image/jpeg', 0, NULL, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', NULL, 'Y', '2024-01-10 10:00:00'),
	(2, 1, 'IMAGE', 'URL', 'smartphone_2024.jpg', NULL, 'jpg', 'image/jpeg', 0, NULL, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400', NULL, 'Y', '2024-05-01 10:00:00'),
	(3, 2, 'IMAGE', 'URL', 'hoodie_2025.jpg', NULL, 'jpg', 'image/jpeg', 0, NULL, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7', 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', NULL, 'Y', '2025-02-01 10:00:00'),
	(4, 3, 'IMAGE', 'URL', 'running_2025.jpg', NULL, 'jpg', 'image/jpeg', 0, NULL, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff', 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', NULL, 'Y', '2025-06-01 10:00:00'),
	(5, 1, 'IMAGE', 'URL', 'ai_laptop_2026.jpg', NULL, 'jpg', 'image/jpeg', 0, NULL, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400', NULL, 'Y', '2026-01-05 10:00:00'),
	(6, 1, 'PDF', 'LOCAL', 'ai_notebook_manual.pdf', '2024_ai_notebook_manual.pdf', 'pdf', 'application/pdf', 0, '/uploads/products/2024/ai_notebook_manual.pdf', 'https://shop.example.com/uploads/products/2024/ai_notebook_manual.pdf', NULL, NULL, 'Y', '2024-01-10 11:00:00'),
	(7, 1, 'PDF', 'S3', 'ai_workstation_manual.pdf', '2026_ai_workstation_manual.pdf', 'pdf', 'application/pdf', 0, 'products/2026/ai_workstation_manual.pdf', 'https://cdn.example.com/products/2026/ai_workstation_manual.pdf', NULL, NULL, 'Y', '2026-01-05 11:00:00');

-- 테이블 shopdb2.inquiry_files 구조 내보내기
CREATE TABLE IF NOT EXISTS `inquiry_files` (
  `inquiry_file_id` bigint NOT NULL AUTO_INCREMENT,
  `inquiry_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`inquiry_file_id`),
  KEY `inquiry_id` (`inquiry_id`),
  KEY `file_id` (`file_id`),
  CONSTRAINT `inquiry_files_ibfk_1` FOREIGN KEY (`inquiry_id`) REFERENCES `buyer_inquiries` (`inquiry_id`),
  CONSTRAINT `inquiry_files_ibfk_2` FOREIGN KEY (`file_id`) REFERENCES `file_assets` (`file_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.inquiry_files:~0 rows (대략적) 내보내기
DELETE FROM `inquiry_files`;

-- 테이블 shopdb2.inventories 구조 내보내기
CREATE TABLE IF NOT EXISTS `inventories` (
  `inventory_id` bigint NOT NULL AUTO_INCREMENT,
  `org_id` bigint NOT NULL,
  `variant_id` bigint NOT NULL,
  `stock_quantity` int NOT NULL DEFAULT '0',
  `reserved_quantity` int NOT NULL DEFAULT '0',
  `safety_stock` int NOT NULL DEFAULT '0',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`inventory_id`),
  UNIQUE KEY `uk_inventory_org_variant` (`org_id`,`variant_id`),
  KEY `fk_inventory_variant` (`variant_id`),
  CONSTRAINT `fk_inventory_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`),
  CONSTRAINT `fk_inventory_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.inventories:~8 rows (대략적) 내보내기
DELETE FROM `inventories`;
INSERT INTO `inventories` (`inventory_id`, `org_id`, `variant_id`, `stock_quantity`, `reserved_quantity`, `safety_stock`, `updated_at`) VALUES
	(1, 1, 1, 29, 2, 5, '2026-09-09 18:43:21'),
	(2, 1, 2, 20, 1, 5, '2026-09-09 16:22:31'),
	(3, 1, 3, 49, 3, 10, '2026-09-09 18:43:29'),
	(4, 2, 4, 100, 5, 20, '2026-09-09 16:22:31'),
	(5, 2, 5, 80, 3, 20, '2026-09-09 16:22:31'),
	(6, 3, 6, 60, 2, 10, '2026-09-09 16:22:31'),
	(7, 1, 7, 17, 1, 5, '2026-09-09 17:53:09'),
	(8, 1, 8, 10, 1, 3, '2026-09-09 16:22:31');

-- 테이블 shopdb2.order_items 구조 내보내기
CREATE TABLE IF NOT EXISTS `order_items` (
  `order_item_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `variant_id` bigint DEFAULT NULL,
  `product_name_snapshot` varchar(200) NOT NULL,
  `sku_snapshot` varchar(100) DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `item_amount` decimal(15,2) NOT NULL,
  `item_status` varchar(30) DEFAULT 'ORDERED',
  PRIMARY KEY (`order_item_id`),
  KEY `fk_order_item_order` (`order_id`),
  KEY `fk_order_item_product` (`product_id`),
  KEY `fk_order_item_variant` (`variant_id`),
  CONSTRAINT `fk_order_item_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `fk_order_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`),
  CONSTRAINT `fk_order_item_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`variant_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.order_items:~11 rows (대략적) 내보내기
DELETE FROM `order_items`;
INSERT INTO `order_items` (`order_item_id`, `order_id`, `product_id`, `variant_id`, `product_name_snapshot`, `sku_snapshot`, `quantity`, `unit_price`, `item_amount`, `item_status`) VALUES
	(1, 1, 1, 1, 'AI 개발용 노트북', 'SKU-NOTE-16', 1, 1690000.00, 1690000.00, 'COMPLETED'),
	(2, 2, 2, 3, '스마트폰 Pro', 'SKU-PHONE-BLK', 1, 1100000.00, 1100000.00, 'COMPLETED'),
	(3, 3, 3, 4, '스마트 후드티', 'SKU-HOOD-L', 2, 69000.00, 138000.00, 'COMPLETED'),
	(4, 4, 4, 6, '스마트 러닝화', 'SKU-RUN-270', 1, 129000.00, 129000.00, 'COMPLETED'),
	(5, 5, 5, 7, 'AI Workstation Laptop', 'SKU-AI-32', 1, 2290000.00, 2290000.00, 'PAID'),
	(6, 6, 3, 5, '스마트 후드티', 'SKU-HOOD-XL', 1, 69000.00, 69000.00, 'PAID'),
	(7, 7, 5, 7, 'AI Workstation Laptop', 'SKU-AI-32', 1, 2290000.00, 2290000.00, 'ORDERED'),
	(8, 8, 5, 7, 'AI Workstation Laptop', 'SKU-AI-32', 1, 2290000.00, 2290000.00, 'ORDERED'),
	(9, 9, 5, 7, 'AI Workstation Laptop', 'SKU-AI-32', 1, 2290000.00, 2290000.00, 'ORDERED'),
	(10, 10, 1, 1, 'AI 개발용 노트북', 'SKU-NOTE-16', 1, 1690000.00, 1690000.00, 'ORDERED'),
	(11, 11, 2, 3, '스마트폰 Pro', 'SKU-PHONE-BLK', 1, 1100000.00, 1100000.00, 'ORDERED');

-- 테이블 shopdb2.orders 구조 내보내기
CREATE TABLE IF NOT EXISTS `orders` (
  `order_id` bigint NOT NULL AUTO_INCREMENT,
  `order_no` varchar(64) NOT NULL,
  `buyer_user_id` bigint NOT NULL,
  `org_id` bigint NOT NULL,
  `order_status` enum('ORDERED','PAYMENT_PENDING','PAID','PREPARING','SHIPPING','DELIVERED','COMPLETED','CANCELLED','REFUNDED') DEFAULT 'ORDERED',
  `product_amount` decimal(15,2) NOT NULL,
  `discount_amount` decimal(15,2) DEFAULT '0.00',
  `shipping_amount` decimal(15,2) DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL,
  `receiver_name` varchar(100) DEFAULT NULL,
  `receiver_phone` varchar(30) DEFAULT NULL,
  `zipcode` varchar(20) DEFAULT NULL,
  `shipping_address1` varchar(300) DEFAULT NULL,
  `shipping_address2` varchar(300) DEFAULT NULL,
  `ordered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`),
  UNIQUE KEY `order_no` (`order_no`),
  KEY `idx_orders_date` (`ordered_at`),
  KEY `idx_orders_user` (`buyer_user_id`),
  KEY `idx_orders_org` (`org_id`),
  CONSTRAINT `fk_orders_buyer` FOREIGN KEY (`buyer_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `fk_orders_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.orders:~11 rows (대략적) 내보내기
DELETE FROM `orders`;
INSERT INTO `orders` (`order_id`, `order_no`, `buyer_user_id`, `org_id`, `order_status`, `product_amount`, `discount_amount`, `shipping_amount`, `total_amount`, `receiver_name`, `receiver_phone`, `zipcode`, `shipping_address1`, `shipping_address2`, `ordered_at`, `updated_at`) VALUES
	(1, 'ORD-2024-0001', 4, 1, 'COMPLETED', 1690000.00, 100000.00, 0.00, 1590000.00, '구매자김', '010-4444-4444', NULL, '전북특별자치도 전주시', '101동 101호', '2024-03-15 10:10:00', '2026-09-09 16:22:31'),
	(2, 'ORD-2024-0002', 4, 1, 'COMPLETED', 1100000.00, 50000.00, 0.00, 1050000.00, '구매자김', '010-4444-4444', NULL, '전북특별자치도 전주시', '101동 101호', '2024-11-20 14:30:00', '2026-09-09 16:22:31'),
	(3, 'ORD-2025-0001', 5, 2, 'COMPLETED', 138000.00, 0.00, 3000.00, 141000.00, '구매자이', '010-5555-5555', NULL, '부산광역시 해운대구', '202동 202호', '2025-03-10 11:00:00', '2026-09-09 16:22:31'),
	(4, 'ORD-2025-0002', 5, 3, 'COMPLETED', 129000.00, 10000.00, 3000.00, 122000.00, '구매자이', '010-5555-5555', NULL, '부산광역시 해운대구', '202동 202호', '2025-09-05 13:00:00', '2026-09-09 16:22:31'),
	(5, 'ORD-2026-0001', 6, 1, 'PAID', 2290000.00, 200000.00, 0.00, 2090000.00, '구매자박', '010-6666-6666', NULL, '서울특별시 강남구', '스마트빌딩 3층', '2026-01-20 09:30:00', '2026-09-09 16:22:31'),
	(6, 'ORD-2026-0002', 4, 2, 'PAID', 69000.00, 0.00, 3000.00, 72000.00, '구매자김', '010-4444-4444', NULL, '전북특별자치도 전주시', '101동 101호', '2026-08-15 15:30:00', '2026-09-09 16:22:31'),
	(7, 'ORD-20260909-01F67F9C', 7, 1, 'PAYMENT_PENDING', 2290000.00, 0.00, 0.00, 2290000.00, 'Buyer 96', '010-9696-9696', '06236', 'Seoul', 'Test', '2026-09-09 08:47:52', '2026-09-09 17:47:51'),
	(8, 'ORD-20260909-30B78244', 7, 1, 'PAYMENT_PENDING', 2290000.00, 0.00, 0.00, 2290000.00, 'Buyer 96', '010-9696-9696', '06236', 'Seoul', 'Test', '2026-09-09 08:52:42', '2026-09-09 17:52:42'),
	(9, 'ORD-20260909-5AAE3A81', 7, 1, 'PAID', 2290000.00, 0.00, 0.00, 2290000.00, 'Buyer 96', '010-9696-9696', '06236', 'Seoul', 'Test', '2026-09-09 08:53:10', '2026-09-09 08:53:10'),
	(10, 'ORD-20260909-D5381C18', 8, 1, 'PAID', 1690000.00, 0.00, 0.00, 1690000.00, '오길동', '010-5555-5555', '06000', '스마트쇼핑 본사', 'Online order address', '2026-09-09 09:43:21', '2026-09-09 09:47:41'),
	(11, 'ORD-20260909-09D77DAE', 8, 1, 'PAID', 1100000.00, 0.00, 0.00, 1100000.00, '오길동', '010-5555-5555', '06000', '스마트쇼핑 본사', 'Online order address', '2026-09-09 09:43:30', '2026-09-09 09:47:45');

-- 테이블 shopdb2.org_units 구조 내보내기
CREATE TABLE IF NOT EXISTS `org_units` (
  `org_id` bigint NOT NULL AUTO_INCREMENT,
  `parent_org_id` bigint DEFAULT NULL,
  `org_code` varchar(50) NOT NULL,
  `org_name` varchar(150) NOT NULL,
  `org_type` enum('HEADQUARTER','BRANCH','STORE','WAREHOUSE') NOT NULL,
  `business_number` varchar(30) DEFAULT NULL,
  `representative_name` varchar(100) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `zipcode` varchar(20) DEFAULT NULL,
  `address1` varchar(300) DEFAULT NULL,
  `address2` varchar(300) DEFAULT NULL,
  `active_yn` char(1) DEFAULT 'Y',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`org_id`),
  UNIQUE KEY `org_code` (`org_code`),
  KEY `fk_org_parent` (`parent_org_id`),
  CONSTRAINT `fk_org_parent` FOREIGN KEY (`parent_org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.org_units:~3 rows (대략적) 내보내기
DELETE FROM `org_units`;
INSERT INTO `org_units` (`org_id`, `parent_org_id`, `org_code`, `org_name`, `org_type`, `business_number`, `representative_name`, `phone`, `email`, `zipcode`, `address1`, `address2`, `active_yn`, `created_at`, `updated_at`) VALUES
	(1, NULL, 'HQ001', '스마트쇼핑 본사', 'HEADQUARTER', '111-11-11111', '홍길동', '02-1111-1111', 'hq@smartshop.co.kr', NULL, '서울특별시 강남구', NULL, 'Y', '2024-01-01 09:00:00', '2026-09-09 16:22:31'),
	(2, 1, 'BR001', '스마트쇼핑 전주지사', 'BRANCH', '111-11-11112', '김전주', '063-111-1111', 'jeonju@smartshop.co.kr', NULL, '전북특별자치도 전주시', NULL, 'Y', '2024-01-01 09:00:00', '2026-09-09 16:22:31'),
	(3, 1, 'BR002', '스마트쇼핑 부산지사', 'BRANCH', '111-11-11113', '이부산', '051-111-1111', 'busan@smartshop.co.kr', NULL, '부산광역시 해운대구', NULL, 'Y', '2025-01-01 09:00:00', '2026-09-09 16:22:31');

-- 테이블 shopdb2.payment_transactions 구조 내보내기
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `transaction_id` bigint NOT NULL AUTO_INCREMENT,
  `payment_id` bigint NOT NULL,
  `transaction_key` varchar(255) DEFAULT NULL,
  `transaction_type` enum('REQUEST','APPROVE','CANCEL','PARTIAL_CANCEL','REFUND') NOT NULL,
  `transaction_status` varchar(50) DEFAULT NULL,
  `transaction_amount` decimal(15,2) NOT NULL,
  `pg_transaction_id` varchar(255) DEFAULT NULL,
  `idempotency_key` varchar(255) DEFAULT NULL,
  `cancel_reason` varchar(500) DEFAULT NULL,
  `request_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `fk_transaction_payment` (`payment_id`),
  CONSTRAINT `fk_transaction_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.payment_transactions:~3 rows (대략적) 내보내기
DELETE FROM `payment_transactions`;
INSERT INTO `payment_transactions` (`transaction_id`, `payment_id`, `transaction_key`, `transaction_type`, `transaction_status`, `transaction_amount`, `pg_transaction_id`, `idempotency_key`, `cancel_reason`, `request_json`, `response_json`, `created_at`) VALUES
	(1, 1, 'TXKEY-2024-001', 'APPROVE', 'SUCCESS', 1590000.00, 'TOSS-TX-2024-001', 'IDEMP-2024-001', NULL, '{"amount": 1590000, "orderId": "ORD-2024-0001", "paymentKey": "toss_payment_2024_001"}', '{"status": "DONE"}', '2024-03-15 10:12:00'),
	(2, 3, 'TXKEY-2025-001', 'APPROVE', 'SUCCESS', 141000.00, 'TOSS-TX-2025-001', 'IDEMP-2025-001', NULL, '{"amount": 141000, "orderId": "ORD-2025-0001", "paymentKey": "toss_payment_2025_001"}', '{"status": "DONE"}', '2025-03-10 11:02:00'),
	(3, 5, 'TXKEY-2026-001', 'APPROVE', 'SUCCESS', 2090000.00, 'TOSS-TX-2026-001', 'IDEMP-2026-001', NULL, '{"amount": 2090000, "orderId": "ORD-2026-0001", "paymentKey": "toss_payment_2026_001"}', '{"status": "DONE"}', '2026-01-20 09:32:00');

-- 테이블 shopdb2.payment_webhook_events 구조 내보내기
CREATE TABLE IF NOT EXISTS `payment_webhook_events` (
  `webhook_id` bigint NOT NULL AUTO_INCREMENT,
  `payment_id` bigint DEFAULT NULL,
  `pg_provider` varchar(50) DEFAULT NULL,
  `event_type` varchar(100) DEFAULT NULL,
  `event_id` varchar(255) DEFAULT NULL,
  `payload_json` json DEFAULT NULL,
  `processed_yn` char(1) DEFAULT 'N',
  `error_message` text,
  `received_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`webhook_id`),
  KEY `fk_webhook_payment` (`payment_id`),
  CONSTRAINT `fk_webhook_payment` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`payment_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.payment_webhook_events:~2 rows (대략적) 내보내기
DELETE FROM `payment_webhook_events`;
INSERT INTO `payment_webhook_events` (`webhook_id`, `payment_id`, `pg_provider`, `event_type`, `event_id`, `payload_json`, `processed_yn`, `error_message`, `received_at`, `processed_at`) VALUES
	(1, 1, 'TOSS', 'PAYMENT_STATUS_CHANGED', 'WEBHOOK-2024-001', '{"status": "DONE", "paymentKey": "toss_payment_2024_001"}', 'Y', NULL, '2024-03-15 10:12:10', '2024-03-15 10:12:11'),
	(2, 5, 'TOSS', 'PAYMENT_STATUS_CHANGED', 'WEBHOOK-2026-001', '{"status": "DONE", "paymentKey": "toss_payment_2026_001"}', 'Y', NULL, '2026-01-20 09:32:10', '2026-01-20 09:32:11');

-- 테이블 shopdb2.payments 구조 내보내기
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `pg_provider` varchar(50) NOT NULL,
  `payment_key` varchar(255) DEFAULT NULL,
  `pg_order_id` varchar(255) DEFAULT NULL,
  `customer_key` varchar(255) DEFAULT NULL,
  `payment_type` varchar(50) DEFAULT NULL,
  `payment_method` varchar(100) DEFAULT NULL,
  `payment_status` varchar(50) DEFAULT NULL,
  `requested_amount` decimal(15,2) NOT NULL,
  `approved_amount` decimal(15,2) DEFAULT '0.00',
  `cancelled_amount` decimal(15,2) DEFAULT '0.00',
  `balance_amount` decimal(15,2) DEFAULT '0.00',
  `currency` varchar(10) DEFAULT 'KRW',
  `receipt_url` varchar(2000) DEFAULT NULL,
  `requested_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  UNIQUE KEY `uk_payment_key` (`payment_key`),
  KEY `idx_payments_order` (`order_id`),
  KEY `idx_payment_provider` (`pg_provider`),
  CONSTRAINT `fk_payment_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.payments:~11 rows (대략적) 내보내기
DELETE FROM `payments`;
INSERT INTO `payments` (`payment_id`, `order_id`, `pg_provider`, `payment_key`, `pg_order_id`, `customer_key`, `payment_type`, `payment_method`, `payment_status`, `requested_amount`, `approved_amount`, `cancelled_amount`, `balance_amount`, `currency`, `receipt_url`, `requested_at`, `approved_at`, `cancelled_at`, `created_at`) VALUES
	(1, 1, 'TOSS', 'toss_payment_2024_001', 'ORD-2024-0001', 'CUSTOMER-2024-001', 'NORMAL', 'CARD', 'DONE', 1590000.00, 1590000.00, 0.00, 1590000.00, 'KRW', NULL, '2024-03-15 10:11:00', '2024-03-15 10:12:00', NULL, '2026-09-09 16:22:31'),
	(2, 2, 'TOSS', 'toss_payment_2024_002', 'ORD-2024-0002', 'CUSTOMER-2024-001', 'NORMAL', 'CARD', 'DONE', 1050000.00, 1050000.00, 0.00, 1050000.00, 'KRW', NULL, '2024-11-20 14:31:00', '2024-11-20 14:32:00', NULL, '2026-09-09 16:22:31'),
	(3, 3, 'TOSS', 'toss_payment_2025_001', 'ORD-2025-0001', 'CUSTOMER-2025-001', 'NORMAL', 'CARD', 'DONE', 141000.00, 141000.00, 0.00, 141000.00, 'KRW', NULL, '2025-03-10 11:01:00', '2025-03-10 11:02:00', NULL, '2026-09-09 16:22:31'),
	(4, 4, 'KAKAOPAY', 'kakao_payment_2025_001', 'ORD-2025-0002', 'CUSTOMER-2025-001', 'NORMAL', 'EASY_PAY', 'DONE', 122000.00, 122000.00, 0.00, 122000.00, 'KRW', NULL, '2025-09-05 13:01:00', '2025-09-05 13:02:00', NULL, '2026-09-09 16:22:31'),
	(5, 5, 'TOSS', 'toss_payment_2026_001', 'ORD-2026-0001', 'CUSTOMER-2026-001', 'NORMAL', 'CARD', 'DONE', 2090000.00, 2090000.00, 0.00, 2090000.00, 'KRW', NULL, '2026-01-20 09:31:00', '2026-01-20 09:32:00', NULL, '2026-09-09 16:22:31'),
	(6, 6, 'TOSS', 'toss_payment_2026_002', 'ORD-2026-0002', 'CUSTOMER-2024-001', 'NORMAL', 'TRANSFER', 'DONE', 72000.00, 72000.00, 0.00, 72000.00, 'KRW', NULL, '2026-08-15 15:31:00', '2026-08-15 15:32:00', NULL, '2026-09-09 16:22:31'),
	(7, 7, 'TOSS', 'pending_a2f95d6b13874e62ace668aca232cef2', 'ORD-20260909-01F67F9C', 'user-7', 'NORMAL', 'CARD', 'READY', 2290000.00, 0.00, 0.00, 2290000.00, 'KRW', NULL, '2026-09-09 08:47:52', NULL, NULL, '2026-09-09 17:47:51'),
	(8, 8, 'TOSS', 'pending_0d46c1d855494529af924e4a7127bdcf', 'ORD-20260909-30B78244', 'user-7', 'NORMAL', 'CARD', 'READY', 2290000.00, 0.00, 0.00, 2290000.00, 'KRW', NULL, '2026-09-09 08:52:42', NULL, NULL, '2026-09-09 17:52:42'),
	(9, 9, 'TOSS', 'pending_ca6145649f9a430a80f00e3489273e11', 'ORD-20260909-5AAE3A81', 'user-7', 'NORMAL', 'CARD', 'DONE', 2290000.00, 2290000.00, 0.00, 0.00, 'KRW', NULL, '2026-09-09 08:53:10', '2026-09-09 08:53:10', NULL, '2026-09-09 17:53:09'),
	(10, 10, 'TOSS', 'pending_153928a8d1764aca8b0bf2f393ebd28a', 'ORD-20260909-D5381C18', 'user-8', 'NORMAL', 'CARD', 'DONE', 1690000.00, 1690000.00, 0.00, 0.00, 'KRW', NULL, '2026-09-09 09:43:21', '2026-09-09 09:47:41', NULL, '2026-09-09 18:43:21'),
	(11, 11, 'TOSS', 'pending_cb8361db85ba4949ad18f998223d9b7c', 'ORD-20260909-09D77DAE', 'user-8', 'NORMAL', 'CARD', 'DONE', 1100000.00, 1100000.00, 0.00, 0.00, 'KRW', NULL, '2026-09-09 09:43:30', '2026-09-09 09:47:45', NULL, '2026-09-09 18:43:29');

-- 테이블 shopdb2.policy_files 구조 내보내기
CREATE TABLE IF NOT EXISTS `policy_files` (
  `policy_file_id` bigint NOT NULL AUTO_INCREMENT,
  `policy_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `display_order` int DEFAULT '0',
  PRIMARY KEY (`policy_file_id`),
  KEY `fk_policy_file_policy` (`policy_id`),
  KEY `fk_policy_file_asset` (`file_id`),
  CONSTRAINT `fk_policy_file_asset` FOREIGN KEY (`file_id`) REFERENCES `file_assets` (`file_id`),
  CONSTRAINT `fk_policy_file_policy` FOREIGN KEY (`policy_id`) REFERENCES `company_policies` (`policy_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.policy_files:~0 rows (대략적) 내보내기
DELETE FROM `policy_files`;

-- 테이블 shopdb2.product_files 구조 내보내기
CREATE TABLE IF NOT EXISTS `product_files` (
  `product_file_id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `file_category` varchar(50) DEFAULT NULL,
  `file_description` varchar(500) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_file_id`),
  KEY `fk_product_file_product` (`product_id`),
  KEY `fk_product_file_asset` (`file_id`),
  CONSTRAINT `fk_product_file_asset` FOREIGN KEY (`file_id`) REFERENCES `file_assets` (`file_id`),
  CONSTRAINT `fk_product_file_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.product_files:~2 rows (대략적) 내보내기
DELETE FROM `product_files`;
INSERT INTO `product_files` (`product_file_id`, `product_id`, `file_id`, `file_category`, `file_description`, `display_order`, `created_at`) VALUES
	(1, 1, 6, 'MANUAL', 'AI 개발용 노트북 사용자 매뉴얼', 0, '2026-09-09 16:22:31'),
	(2, 5, 7, 'MANUAL', 'AI Workstation Laptop 사용자 매뉴얼', 0, '2026-09-09 16:22:31');

-- 테이블 shopdb2.product_images 구조 내보내기
CREATE TABLE IF NOT EXISTS `product_images` (
  `product_image_id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  `image_type` enum('MAIN','DETAIL','THUMBNAIL','OPTION') DEFAULT 'DETAIL',
  `alt_text` varchar(500) DEFAULT NULL,
  `display_order` int DEFAULT '0',
  `active_yn` char(1) DEFAULT 'Y',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_image_id`),
  KEY `fk_product_images_product` (`product_id`),
  KEY `fk_product_images_file` (`file_id`),
  CONSTRAINT `fk_product_images_file` FOREIGN KEY (`file_id`) REFERENCES `file_assets` (`file_id`),
  CONSTRAINT `fk_product_images_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.product_images:~5 rows (대략적) 내보내기
DELETE FROM `product_images`;
INSERT INTO `product_images` (`product_image_id`, `product_id`, `file_id`, `image_type`, `alt_text`, `display_order`, `active_yn`, `created_at`) VALUES
	(1, 1, 1, 'MAIN', 'AI 개발용 노트북 대표 이미지', 1, 'Y', '2026-09-09 16:22:31'),
	(2, 2, 2, 'MAIN', '스마트폰 Pro 대표 이미지', 1, 'Y', '2026-09-09 16:22:31'),
	(3, 3, 3, 'MAIN', '스마트 후드티 대표 이미지', 1, 'Y', '2026-09-09 16:22:31'),
	(4, 4, 4, 'MAIN', '스마트 러닝화 대표 이미지', 1, 'Y', '2026-09-09 16:22:31'),
	(5, 5, 5, 'MAIN', 'AI Workstation Laptop 대표 이미지', 1, 'Y', '2026-09-09 16:22:31');

-- 테이블 shopdb2.product_variants 구조 내보내기
CREATE TABLE IF NOT EXISTS `product_variants` (
  `variant_id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `sku_code` varchar(100) NOT NULL,
  `option_name1` varchar(100) DEFAULT NULL,
  `option_value1` varchar(100) DEFAULT NULL,
  `option_name2` varchar(100) DEFAULT NULL,
  `option_value2` varchar(100) DEFAULT NULL,
  `additional_price` decimal(15,2) DEFAULT '0.00',
  `active_yn` char(1) DEFAULT 'Y',
  PRIMARY KEY (`variant_id`),
  UNIQUE KEY `sku_code` (`sku_code`),
  KEY `fk_variant_product` (`product_id`),
  CONSTRAINT `fk_variant_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`product_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.product_variants:~8 rows (대략적) 내보내기
DELETE FROM `product_variants`;
INSERT INTO `product_variants` (`variant_id`, `product_id`, `sku_code`, `option_name1`, `option_value1`, `option_name2`, `option_value2`, `additional_price`, `active_yn`) VALUES
	(1, 1, 'SKU-NOTE-16', 'RAM', '16GB', 'SSD', '512GB', 0.00, 'Y'),
	(2, 1, 'SKU-NOTE-32', 'RAM', '32GB', 'SSD', '1TB', 300000.00, 'Y'),
	(3, 2, 'SKU-PHONE-BLK', '색상', 'Black', NULL, NULL, 0.00, 'Y'),
	(4, 3, 'SKU-HOOD-L', '사이즈', 'L', '색상', 'Brown', 0.00, 'Y'),
	(5, 3, 'SKU-HOOD-XL', '사이즈', 'XL', '색상', 'Brown', 0.00, 'Y'),
	(6, 4, 'SKU-RUN-270', '사이즈', '270', '색상', 'Black', 0.00, 'Y'),
	(7, 5, 'SKU-AI-32', 'RAM', '32GB', 'SSD', '1TB', 0.00, 'Y'),
	(8, 5, 'SKU-AI-64', 'RAM', '64GB', 'SSD', '2TB', 500000.00, 'Y');

-- 테이블 shopdb2.products 구조 내보내기
CREATE TABLE IF NOT EXISTS `products` (
  `product_id` bigint NOT NULL AUTO_INCREMENT,
  `seller_user_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `product_code` varchar(50) NOT NULL,
  `product_name` varchar(200) NOT NULL,
  `short_description` varchar(1000) DEFAULT NULL,
  `description` longtext,
  `regular_price` decimal(15,2) NOT NULL,
  `sale_price` decimal(15,2) NOT NULL,
  `product_status` enum('READY','SALE','SOLD_OUT','STOPPED','DELETED') DEFAULT 'READY',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`),
  UNIQUE KEY `product_code` (`product_code`),
  KEY `idx_products_name` (`product_name`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_seller` (`seller_user_id`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`category_id`),
  CONSTRAINT `fk_products_seller` FOREIGN KEY (`seller_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.products:~5 rows (대략적) 내보내기
DELETE FROM `products`;
INSERT INTO `products` (`product_id`, `seller_user_id`, `category_id`, `product_code`, `product_name`, `short_description`, `description`, `regular_price`, `sale_price`, `product_status`, `created_at`, `updated_at`) VALUES
	(1, 2, 3, 'P2024001', 'AI 개발용 노트북', 'Python 및 AI 개발용 고성능 노트북', '32GB RAM 확장 가능 AI 개발용 노트북입니다.', 1800000.00, 1690000.00, 'SALE', '2024-01-10 10:00:00', '2026-09-09 16:22:31'),
	(2, 2, 4, 'P2024002', '스마트폰 Pro', '고성능 스마트폰', '고성능 모바일 프로세서가 적용된 스마트폰입니다.', 1200000.00, 1100000.00, 'SALE', '2024-05-01 10:00:00', '2026-09-09 16:22:31'),
	(3, 3, 5, 'P2025001', '스마트 후드티', '오버핏 후드티', '편안한 오버핏 디자인의 후드티입니다.', 79000.00, 69000.00, 'SALE', '2025-02-01 10:00:00', '2026-09-09 16:22:31'),
	(4, 3, 6, 'P2025002', '스마트 러닝화', '데일리 러닝화', '일상과 러닝에 모두 사용할 수 있습니다.', 149000.00, 129000.00, 'SALE', '2025-06-01 10:00:00', '2026-09-09 16:22:31'),
	(5, 2, 3, 'P2026001', 'AI Workstation Laptop', '생성형 AI 개발용 워크스테이션', 'Local LLM 및 생성형 AI 개발에 적합한 노트북입니다.', 2500000.00, 2290000.00, 'SALE', '2026-01-05 10:00:00', '2026-09-09 16:22:31');

-- 테이블 shopdb2.rag_chunks 구조 내보내기
CREATE TABLE IF NOT EXISTS `rag_chunks` (
  `chunk_id` bigint NOT NULL AUTO_INCREMENT,
  `document_id` bigint NOT NULL,
  `chunk_no` int NOT NULL,
  `chunk_text` longtext NOT NULL,
  `token_count` int DEFAULT NULL,
  `metadata_json` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`chunk_id`),
  UNIQUE KEY `uk_document_chunk` (`document_id`,`chunk_no`),
  CONSTRAINT `fk_chunk_document` FOREIGN KEY (`document_id`) REFERENCES `rag_documents` (`document_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.rag_chunks:~3 rows (대략적) 내보내기
DELETE FROM `rag_chunks`;
INSERT INTO `rag_chunks` (`chunk_id`, `document_id`, `chunk_no`, `chunk_text`, `token_count`, `metadata_json`, `created_at`) VALUES
	(1, 1, 1, '2024년 환불정책은 상품 수령 후 7일 이내 미개봉 상품의 환불을 허용합니다.', 30, '{"type": "refund", "year": 2024}', '2026-09-09 16:22:32'),
	(2, 2, 1, '스마트 후드티는 오버핏 패션 상품이며 판매가격은 69,000원입니다.', 30, '{"type": "product", "year": 2025}', '2026-09-09 16:22:32'),
	(3, 3, 1, '2026년 환불정책은 상품 수령 후 14일 이내 미개봉 상품의 환불을 허용합니다.', 30, '{"type": "refund", "year": 2026}', '2026-09-09 16:22:32');

-- 테이블 shopdb2.rag_document_files 구조 내보내기
CREATE TABLE IF NOT EXISTS `rag_document_files` (
  `rag_document_file_id` bigint NOT NULL AUTO_INCREMENT,
  `document_id` bigint NOT NULL,
  `file_id` bigint NOT NULL,
  PRIMARY KEY (`rag_document_file_id`),
  KEY `fk_rag_document_file_document` (`document_id`),
  KEY `fk_rag_document_file_asset` (`file_id`),
  CONSTRAINT `fk_rag_document_file_asset` FOREIGN KEY (`file_id`) REFERENCES `file_assets` (`file_id`),
  CONSTRAINT `fk_rag_document_file_document` FOREIGN KEY (`document_id`) REFERENCES `rag_documents` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.rag_document_files:~0 rows (대략적) 내보내기
DELETE FROM `rag_document_files`;

-- 테이블 shopdb2.rag_documents 구조 내보내기
CREATE TABLE IF NOT EXISTS `rag_documents` (
  `document_id` bigint NOT NULL AUTO_INCREMENT,
  `provider_id` bigint DEFAULT NULL,
  `org_id` bigint DEFAULT NULL,
  `document_type` varchar(50) DEFAULT NULL,
  `document_name` varchar(255) NOT NULL,
  `source_type` enum('DATABASE','FILE','URL','API','MANUAL') DEFAULT NULL,
  `source_uri` varchar(2000) DEFAULT NULL,
  `content_text` longtext,
  `version` varchar(50) DEFAULT NULL,
  `document_status` enum('READY','PROCESSING','INDEXED','ERROR') DEFAULT 'READY',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`document_id`),
  KEY `fk_rag_provider` (`provider_id`),
  KEY `fk_rag_org` (`org_id`),
  KEY `idx_rag_document_type` (`document_type`),
  CONSTRAINT `fk_rag_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`),
  CONSTRAINT `fk_rag_provider` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers` (`provider_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.rag_documents:~3 rows (대략적) 내보내기
DELETE FROM `rag_documents`;
INSERT INTO `rag_documents` (`document_id`, `provider_id`, `org_id`, `document_type`, `document_name`, `source_type`, `source_uri`, `content_text`, `version`, `document_status`, `created_at`, `updated_at`) VALUES
	(1, 1, 1, 'REFUND_POLICY', '2024 환불정책', 'DATABASE', 'refund_policy:1', '상품 수령 후 7일 이내 미개봉 상품은 환불 가능합니다.', '2024.1', 'INDEXED', '2024-01-01 09:00:00', '2026-09-09 16:22:31'),
	(2, 1, 1, 'PRODUCT_GUIDE', '2025 상품안내', 'DATABASE', 'products', '스마트 후드티 및 스마트 러닝화 상품 안내입니다.', '2025.1', 'INDEXED', '2025-01-10 09:00:00', '2026-09-09 16:22:31'),
	(3, 1, 1, 'REFUND_POLICY', '2026 환불정책', 'DATABASE', 'refund_policy:3', '상품 수령 후 14일 이내 미개봉 상품은 환불 가능합니다.', '2026.1', 'INDEXED', '2026-01-01 09:00:00', '2026-09-09 16:22:31');

-- 테이블 shopdb2.rag_embeddings 구조 내보내기
CREATE TABLE IF NOT EXISTS `rag_embeddings` (
  `embedding_id` bigint NOT NULL AUTO_INCREMENT,
  `chunk_id` bigint NOT NULL,
  `embedding_provider` varchar(50) DEFAULT NULL,
  `embedding_model` varchar(200) DEFAULT NULL,
  `embedding_dimension` int DEFAULT NULL,
  `embedding_json` json DEFAULT NULL,
  `vector_db_type` varchar(50) DEFAULT NULL,
  `vector_collection` varchar(200) DEFAULT NULL,
  `vector_external_id` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`embedding_id`),
  KEY `fk_embedding_chunk` (`chunk_id`),
  CONSTRAINT `fk_embedding_chunk` FOREIGN KEY (`chunk_id`) REFERENCES `rag_chunks` (`chunk_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.rag_embeddings:~3 rows (대략적) 내보내기
DELETE FROM `rag_embeddings`;
INSERT INTO `rag_embeddings` (`embedding_id`, `chunk_id`, `embedding_provider`, `embedding_model`, `embedding_dimension`, `embedding_json`, `vector_db_type`, `vector_collection`, `vector_external_id`, `created_at`) VALUES
	(1, 1, 'OPENAI', 'text-embedding-3-small', 1536, NULL, 'QDRANT', 'shop_policy', 'refund-2024-001', '2026-09-09 16:22:32'),
	(2, 2, 'OPENAI', 'text-embedding-3-small', 1536, NULL, 'QDRANT', 'shop_product', 'product-2025-001', '2026-09-09 16:22:32'),
	(3, 3, 'OPENAI', 'text-embedding-3-small', 1536, NULL, 'QDRANT', 'shop_policy', 'refund-2026-001', '2026-09-09 16:22:32');

-- 테이블 shopdb2.rag_query_logs 구조 내보내기
CREATE TABLE IF NOT EXISTS `rag_query_logs` (
  `query_log_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `provider_id` bigint DEFAULT NULL,
  `question_text` text,
  `response_text` longtext,
  `retrieved_chunk_ids` json DEFAULT NULL,
  `prompt_tokens` int DEFAULT '0',
  `completion_tokens` int DEFAULT '0',
  `response_time_ms` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`query_log_id`),
  KEY `fk_query_user` (`user_id`),
  KEY `fk_query_provider` (`provider_id`),
  CONSTRAINT `fk_query_provider` FOREIGN KEY (`provider_id`) REFERENCES `ai_providers` (`provider_id`),
  CONSTRAINT `fk_query_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.rag_query_logs:~0 rows (대략적) 내보내기
DELETE FROM `rag_query_logs`;

-- 테이블 shopdb2.refund_items 구조 내보내기
CREATE TABLE IF NOT EXISTS `refund_items` (
  `refund_item_id` bigint NOT NULL AUTO_INCREMENT,
  `refund_request_id` bigint NOT NULL,
  `order_item_id` bigint NOT NULL,
  `refund_quantity` int NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL,
  PRIMARY KEY (`refund_item_id`),
  KEY `fk_refund_item_request` (`refund_request_id`),
  KEY `fk_refund_item_order_item` (`order_item_id`),
  CONSTRAINT `fk_refund_item_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`order_item_id`),
  CONSTRAINT `fk_refund_item_request` FOREIGN KEY (`refund_request_id`) REFERENCES `refund_requests` (`refund_request_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.refund_items:~0 rows (대략적) 내보내기
DELETE FROM `refund_items`;
INSERT INTO `refund_items` (`refund_item_id`, `refund_request_id`, `order_item_id`, `refund_quantity`, `refund_amount`) VALUES
	(1, 1, 2, 1, 1050000.00);

-- 테이블 shopdb2.refund_policies 구조 내보내기
CREATE TABLE IF NOT EXISTS `refund_policies` (
  `refund_policy_id` bigint NOT NULL AUTO_INCREMENT,
  `org_id` bigint DEFAULT NULL,
  `policy_name` varchar(200) NOT NULL,
  `allowed_days` int NOT NULL,
  `unopened_refund_yn` char(1) DEFAULT 'Y',
  `opened_refund_yn` char(1) DEFAULT 'N',
  `defective_refund_yn` char(1) DEFAULT 'Y',
  `shipping_fee_payer` enum('BUYER','SELLER','COMPANY') DEFAULT 'BUYER',
  `refund_policy_text` longtext,
  `policy_json` json DEFAULT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `active_yn` char(1) DEFAULT 'Y',
  PRIMARY KEY (`refund_policy_id`),
  KEY `fk_refund_policy_org` (`org_id`),
  CONSTRAINT `fk_refund_policy_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.refund_policies:~3 rows (대략적) 내보내기
DELETE FROM `refund_policies`;
INSERT INTO `refund_policies` (`refund_policy_id`, `org_id`, `policy_name`, `allowed_days`, `unopened_refund_yn`, `opened_refund_yn`, `defective_refund_yn`, `shipping_fee_payer`, `refund_policy_text`, `policy_json`, `effective_from`, `effective_to`, `active_yn`) VALUES
	(1, 1, '2024 기본 환불정책', 7, 'Y', 'N', 'Y', 'BUYER', '상품 수령 후 7일 이내 미개봉 상품은 환불 가능합니다.', '{"year": 2024, "allowedDays": 7}', '2024-01-01', '2024-12-31', 'Y'),
	(2, 1, '2025 기본 환불정책', 7, 'Y', 'N', 'Y', 'BUYER', '상품 수령 후 7일 이내 환불 가능합니다.', '{"year": 2025, "allowedDays": 7}', '2025-01-01', '2025-12-31', 'Y'),
	(3, 1, '2026 기본 환불정책', 14, 'Y', 'N', 'Y', 'BUYER', '상품 수령 후 14일 이내 미개봉 상품은 환불 가능합니다.', '{"year": 2026, "allowedDays": 14}', '2026-01-01', NULL, 'Y');

-- 테이블 shopdb2.refund_requests 구조 내보내기
CREATE TABLE IF NOT EXISTS `refund_requests` (
  `refund_request_id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `buyer_user_id` bigint NOT NULL,
  `refund_policy_id` bigint DEFAULT NULL,
  `refund_reason` varchar(500) DEFAULT NULL,
  `requested_amount` decimal(15,2) DEFAULT NULL,
  `approved_amount` decimal(15,2) DEFAULT NULL,
  `refund_status` enum('REQUESTED','REVIEWING','APPROVED','REJECTED','COMPLETED') DEFAULT 'REQUESTED',
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `approved_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`refund_request_id`),
  KEY `fk_refund_order` (`order_id`),
  KEY `fk_refund_user` (`buyer_user_id`),
  KEY `fk_refund_policy` (`refund_policy_id`),
  CONSTRAINT `fk_refund_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `fk_refund_policy` FOREIGN KEY (`refund_policy_id`) REFERENCES `refund_policies` (`refund_policy_id`),
  CONSTRAINT `fk_refund_user` FOREIGN KEY (`buyer_user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.refund_requests:~0 rows (대략적) 내보내기
DELETE FROM `refund_requests`;
INSERT INTO `refund_requests` (`refund_request_id`, `order_id`, `buyer_user_id`, `refund_policy_id`, `refund_reason`, `requested_amount`, `approved_amount`, `refund_status`, `requested_at`, `approved_at`, `completed_at`) VALUES
	(1, 2, 4, 1, '단순 변심', 1050000.00, 1050000.00, 'COMPLETED', '2024-11-22 10:00:00', '2024-11-22 13:00:00', '2024-11-23 09:00:00');

-- 테이블 shopdb2.roles 구조 내보내기
CREATE TABLE IF NOT EXISTS `roles` (
  `role_id` bigint NOT NULL AUTO_INCREMENT,
  `role_code` varchar(30) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`role_id`),
  UNIQUE KEY `role_code` (`role_code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.roles:~0 rows (대략적) 내보내기
DELETE FROM `roles`;
INSERT INTO `roles` (`role_id`, `role_code`, `role_name`, `description`) VALUES
	(1, 'BUYER', '구매자', '상품 구매 권한'),
	(2, 'SELLER', '판매자', '상품 등록 및 판매 권한'),
	(3, 'ADMIN', '관리자', '쇼핑몰 관리 권한');

-- 테이블 shopdb2.seller_profiles 구조 내보내기
CREATE TABLE IF NOT EXISTS `seller_profiles` (
  `seller_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_name` varchar(200) NOT NULL,
  `business_number` varchar(30) DEFAULT NULL,
  `representative_name` varchar(100) DEFAULT NULL,
  `settlement_bank` varchar(100) DEFAULT NULL,
  `settlement_account` varchar(100) DEFAULT NULL,
  `seller_status` varchar(30) DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`seller_id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_seller_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.seller_profiles:~0 rows (대략적) 내보내기
DELETE FROM `seller_profiles`;
INSERT INTO `seller_profiles` (`seller_id`, `user_id`, `company_name`, `business_number`, `representative_name`, `settlement_bank`, `settlement_account`, `seller_status`, `created_at`) VALUES
	(1, 2, '스마트전자', '222-11-11111', '전자판매자', '국민은행', '111111-11-111111', 'ACTIVE', '2026-09-09 16:22:31'),
	(2, 3, '스마트패션', '333-22-22222', '패션판매자', '신한은행', '222222-22-222222', 'ACTIVE', '2026-09-09 16:22:31');

-- 테이블 shopdb2.user_addresses 구조 내보내기
CREATE TABLE IF NOT EXISTS `user_addresses` (
  `address_id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `address_name` varchar(100) DEFAULT NULL,
  `receiver_name` varchar(100) DEFAULT NULL,
  `receiver_phone` varchar(30) DEFAULT NULL,
  `zipcode` varchar(20) DEFAULT NULL,
  `address1` varchar(300) DEFAULT NULL,
  `address2` varchar(300) DEFAULT NULL,
  `default_yn` char(1) DEFAULT 'N',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`address_id`),
  KEY `fk_address_user` (`user_id`),
  CONSTRAINT `fk_address_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.user_addresses:~0 rows (대략적) 내보내기
DELETE FROM `user_addresses`;
INSERT INTO `user_addresses` (`address_id`, `user_id`, `address_name`, `receiver_name`, `receiver_phone`, `zipcode`, `address1`, `address2`, `default_yn`, `created_at`) VALUES
	(1, 7, 'Default Address', 'Buyer 96', '010-9696-9696', '06236', 'Seoul', 'Test', 'Y', '2026-09-09 17:40:14'),
	(2, 8, 'Default Address', '010-5555-5555', '010-5555-5555', '5555', '주소1', '주소2', 'Y', '2026-09-09 17:41:35');

-- 테이블 shopdb2.user_roles 구조 내보내기
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `fk_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.user_roles:~0 rows (대략적) 내보내기
DELETE FROM `user_roles`;
INSERT INTO `user_roles` (`user_id`, `role_id`, `assigned_at`) VALUES
	(1, 3, '2026-09-09 16:22:31'),
	(2, 1, '2026-09-09 16:22:31'),
	(2, 2, '2026-09-09 16:22:31'),
	(3, 1, '2026-09-09 16:22:31'),
	(3, 2, '2026-09-09 16:22:31'),
	(4, 1, '2026-09-09 16:22:31'),
	(5, 1, '2026-09-09 16:22:31'),
	(6, 1, '2026-09-09 16:22:31'),
	(7, 1, '2026-09-09 17:40:14'),
	(8, 1, '2026-09-09 17:41:35');

-- 테이블 shopdb2.users 구조 내보내기
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` bigint NOT NULL AUTO_INCREMENT,
  `org_id` bigint DEFAULT NULL,
  `login_id` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `user_status` enum('ACTIVE','INACTIVE','SUSPENDED','WITHDRAWN') DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `login_id` (`login_id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_users_org` (`org_id`),
  CONSTRAINT `fk_users_org` FOREIGN KEY (`org_id`) REFERENCES `org_units` (`org_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 테이블 데이터 shopdb2.users:~8 rows (대략적) 내보내기
DELETE FROM `users`;
INSERT INTO `users` (`user_id`, `org_id`, `login_id`, `password_hash`, `user_name`, `email`, `phone`, `user_status`, `created_at`, `updated_at`) VALUES
	(1, 1, 'admin01', '$2b$admin', '쇼핑몰관리자', 'admin@smartshop.co.kr', '010-1111-1111', 'ACTIVE', '2024-01-05 10:00:00', '2026-09-09 16:22:31'),
	(2, 1, 'seller01', '$2b$seller01', '전자판매자', 'seller01@smartshop.co.kr', '010-2222-2222', 'ACTIVE', '2024-02-01 10:00:00', '2026-09-09 16:22:31'),
	(3, 2, 'seller02', '$2b$seller02', '패션판매자', 'seller02@smartshop.co.kr', '010-3333-3333', 'ACTIVE', '2025-01-10 10:00:00', '2026-09-09 16:22:31'),
	(4, 2, 'buyer01', '$2b$buyer01', '구매자김', 'buyer01@gmail.com', '010-4444-4444', 'ACTIVE', '2024-03-01 10:00:00', '2026-09-09 16:22:31'),
	(5, 3, 'buyer02', '$2b$buyer02', '구매자이', 'buyer02@gmail.com', '010-5555-5555', 'ACTIVE', '2025-05-01 10:00:00', '2026-09-09 16:22:31'),
	(6, 1, 'buyer03', '$2b$buyer03', '구매자박', 'buyer03@gmail.com', '010-6666-6666', 'ACTIVE', '2026-01-10 10:00:00', '2026-09-09 16:22:31'),
	(7, 1, 'buyer96', '$pbkdf2-sha256$29000$lDLm/L/33nsP4TxnTOk9Zw$ygaI2gmuoJbeUAUnb0uoQJEDOfuSgAKcty881EWhpTc', 'Buyer 96', 'buyer96@test.com', '010-9696-9696', 'ACTIVE', '2026-09-09 08:40:15', '2026-09-09 17:40:14'),
	(8, 1, 'buyer5', '$pbkdf2-sha256$29000$Q8i5NwZgTEkJQeg9JwQghA$BdDKhO3vknx64gUzdAX0tYJTgpeA7pp9m9yft1llim8', '오길동', 'test5@test.com', '010-5555-5555', 'ACTIVE', '2026-09-09 08:41:35', '2026-09-09 17:41:35');

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;

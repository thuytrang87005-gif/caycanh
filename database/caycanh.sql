-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 15, 2026 at 06:39 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
 create Database caycanh;
 use caycanh;
--

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `onchain_order_id` int(11) NOT NULL,
  `onchain_plant_id` int(11) NOT NULL,
  `buyer_address` varchar(42) NOT NULL,
  `seller_address` varchar(42) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `total_eth` decimal(18,8) NOT NULL,
  `receiver_name` varchar(100) NOT NULL,
  `receiver_phone` varchar(20) NOT NULL,
  `shipping_address` text NOT NULL,
  `note` text DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT 0,
  `order_hash` varchar(66) NOT NULL,
  `tx_hash` varchar(66) DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `onchain_order_id`, `onchain_plant_id`, `buyer_address`, `seller_address`, `quantity`, `total_eth`, `receiver_name`, `receiver_phone`, `shipping_address`, `note`, `status`, `order_hash`, `tx_hash`, `delivered_at`, `created_at`, `updated_at`) VALUES
(1, 1, 1, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', '0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 1, 0.01000000, 'Khách Web3', 'Chưa cập nhật', 'Đặt trực tiếp qua On-Chain/Remix', NULL, 4, '0xd5544b7ff259bb58a0d64d455a5b6a8c24bf266d0575a27b9c5db704334b90a0', '0x14ca9da0a1065fc35dc5b43bc108c7e40b9fc20216a080d709da7b0fc92d13ba', '2026-11-16 00:08:12', '2026-11-15 17:03:14', '2026-11-15 17:10:39'),
(4, 2, 1, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', '0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 1, 0.01000000, 'Khách Web3', 'Chưa cập nhật', 'Đặt trực tiếp qua On-Chain/Remix', NULL, 6, '0x80411b55055e33e3d52ca5d081e97bc625c930f55e761ff560a2612ced039714', '0xab06e4c5dd13189d76b5f0dcd69273496f6f5a6cb5fd8bd28b16c947d6e5a735', NULL, '2026-11-15 17:13:40', '2026-11-15 17:14:27'),
(6, 3, 1, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', '0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 1, 0.01000000, 'Khách Web3', 'Chưa cập nhật', 'Đặt trực tiếp qua On-Chain/Remix', NULL, 1, '0xbd9ac42dd9d3ef890f6403e706eaf0643c807bb7b44d0986424c8e842151a25f', '0xe9250005fc2d221a91ff7685faa0b4f2ec6124e9b509f2d2436e1e1456f295fa', '2026-11-16 00:25:48', '2026-11-15 17:21:26', '2026-11-15 17:25:51');

-- --------------------------------------------------------

--
-- Table structure for table `order_logs`
--

CREATE TABLE `order_logs` (
  `id` int(11) NOT NULL,
  `onchain_order_id` int(11) NOT NULL,
  `actor_address` varchar(42) NOT NULL,
  `action` varchar(50) NOT NULL,
  `tx_hash` varchar(66) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `order_logs`
--

INSERT INTO `order_logs` (`id`, `onchain_order_id`, `actor_address`, `action`, `tx_hash`, `created_at`) VALUES
(1, 1, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'PAID', '0xb29927d38bbda8ace4c6e0dde2e64d72cfcc0c0fc2d0ab8b769d8f0b525e3125', '2026-11-15 17:03:14'),
(2, 1, 'seller', 'DELIVERED', '0xff8369357b2aafdc23708401c94e037c01ccaef9e1336e2806e0a92a62c3afd9', '2026-11-15 17:08:17'),
(3, 1, '0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 'COMPLETED', '0x14ca9da0a1065fc35dc5b43bc108c7e40b9fc20216a080d709da7b0fc92d13ba', '2026-11-15 17:10:39'),
(4, 2, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'PAID', '0x8aa63f45afce4302d89697a12e0b277e548c28eba601b6dad71d218067c3190f', '2026-11-15 17:13:40'),
(5, 2, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'CANCELLED', '0xab06e4c5dd13189d76b5f0dcd69273496f6f5a6cb5fd8bd28b16c947d6e5a735', '2026-11-15 17:14:27'),
(6, 3, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'PAID', '0xbafd8fad3351d9af53ed0b66b1e643723490379c1eece03eaf1030c3f3afd64d', '2026-11-15 17:21:26'),
(7, 3, 'seller', 'DELIVERED', '0xe9250005fc2d221a91ff7685faa0b4f2ec6124e9b509f2d2436e1e1456f295fa', '2026-11-15 17:25:51');

-- --------------------------------------------------------

--
-- Table structure for table `plants`
--

CREATE TABLE `plants` (
  `id` int(11) NOT NULL,
  `onchain_plant_id` int(11) NOT NULL,
  `seller_address` varchar(42) NOT NULL,
  `name` varchar(255) NOT NULL,
  `image_url` text NOT NULL,
  `description` text DEFAULT NULL,
  `price_eth` decimal(18,8) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `sold_count` int(11) NOT NULL DEFAULT 0,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `data_hash` varchar(66) NOT NULL,
  `tx_hash` varchar(66) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `plants`
--

INSERT INTO `plants` (`id`, `onchain_plant_id`, `seller_address`, `name`, `image_url`, `description`, `price_eth`, `stock`, `sold_count`, `is_available`, `data_hash`, `tx_hash`, `created_at`, `updated_at`) VALUES
(1, 1, '0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 'Tùng La Hán', 'https://tse1.mm.bing.net/th/id/OIP.XitxPeBcDlTA4WaOSOB3WQHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', 'Cây dáng trực', 0.01000000, 2, 2, 1, '0x400943b7348f53dcf7826d6db66b5868b592b8639232fab2332472f825c0f459', '0x6bd31a49c76e6b020f03a49964f621017c6406e9d1c84272831176564408b879', '2026-11-15 16:57:52', '2026-11-15 17:21:26'),
(12, 2, '0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'Cẩm Tú Cầu', 'https://tse1.mm.bing.net/th/id/OIP.TMQ1V3MRYgYhGGObwf9w6QHaGu?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', 'Cẩm Tú Cầu luôn giữ một vị trí đặc biệt nhờ khả năng biến đổi màu sắc theo môi trường sống và ý nghĩa cảm xúc sâu sắc trong từng cánh hoa.', 0.01000000, 4, 0, 1, '0x6d7d3db5b8f3b668f80c4e4abd4fa5b1679f439cc00af48b9ab5340ddc1e2e89', '0x7b93126efda7a4f3172e85907360acfcdf86e567fdee179039d44d186c82e0d2', '2026-11-15 17:28:05', '2026-11-15 17:28:05');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `wallet_address` varchar(42) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `default_address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`wallet_address`, `display_name`, `phone`, `default_address`, `created_at`, `updated_at`) VALUES
('0xbfca2c5ec0a8593251cbaf3c94227d22c36fba83', 'Account 0xbfca', NULL, NULL, '2026-11-15 17:03:14', '2026-11-15 17:03:14'),
('0xf28b8c67e3c34960a8caf5c74c2156b4a8c7de5f', 'Account 0xf28b', NULL, NULL, '2026-11-15 16:57:52', '2026-11-15 16:57:52');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `onchain_order_id` (`onchain_order_id`),
  ADD KEY `idx_buyer` (`buyer_address`),
  ADD KEY `idx_seller` (`seller_address`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `fk_orders_plant` (`onchain_plant_id`);

--
-- Indexes for table `order_logs`
--
ALTER TABLE `order_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_id` (`onchain_order_id`);

--
-- Indexes for table `plants`
--
ALTER TABLE `plants`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `onchain_plant_id` (`onchain_plant_id`),
  ADD KEY `idx_seller` (`seller_address`),
  ADD KEY `idx_available` (`is_available`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`wallet_address`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `order_logs`
--
ALTER TABLE `order_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `plants`
--
ALTER TABLE `plants`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_plant` FOREIGN KEY (`onchain_plant_id`) REFERENCES `plants` (`onchain_plant_id`) ON UPDATE CASCADE;

--
-- Constraints for table `order_logs`
--
ALTER TABLE `order_logs`
  ADD CONSTRAINT `fk_logs_order` FOREIGN KEY (`onchain_order_id`) REFERENCES `orders` (`onchain_order_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

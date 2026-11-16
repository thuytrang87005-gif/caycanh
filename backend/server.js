const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 1. CẤU HÌNH KẾT NỐI MYSQL (XAMPP mặc định user: root, pass rỗng)
const db = mysql.createPool({
    host: "localhost",
    port: 3307,
    user: "root",
    password: "",
    database: "caycanh",
    waitForConnections: true,
    connectionLimit: 10
});

// 2. ĐỌC ĐỊA CHỈ CONTRACT & ABI TỪ THƯ MỤC DỰ ÁN
const envConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "../env.json"), "utf8"));
const abiRaw = JSON.parse(fs.readFileSync(path.join(__dirname, "../js/bonsai_marketplace.json"), "utf8"));
const CONTRACT_ADDRESS = envConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = abiRaw.abi ? abiRaw.abi : abiRaw;

// Kết nối mạng Sepolia qua RPC công khai ổn định
const RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

// Hàm tạo mã băm đối chiếu dữ liệu
function makeHash(rawText) {
    return ethers.keccak256(ethers.toUtf8Bytes(rawText));
}

// =======================================================
// 3. CÁC HÀM ĐỒNG BỘ TỪ SMART CONTRACT -> MYSQL
// =======================================================

async function syncPlantToDB(plantId, txHash = null) {
    try {
        const p = await contract.plants(plantId);
        const id = Number(p.id);
        if (id === 0) return;

        const seller = p.seller.toLowerCase();
        const name = p.name;
        const image = p.image;
        const desc = p.desc;
        const priceEth = ethers.formatEther(p.price);
        const stock = Number(p.stock);
        const soldCount = Number(p.soldCount);
        const isAvailable = p.isAvailable ? 1 : 0;

        const dataHash = makeHash(`${seller}|${name}|${image}|${desc}|${priceEth}`);

        // Đảm bảo ví người bán đã tồn tại trong bảng users
        await db.execute(
            `INSERT IGNORE INTO users (wallet_address, display_name) VALUES (?, ?)`,
            [seller, `Account ${seller.slice(0, 6)}`]
        );

        // Thêm mới hoặc cập nhật thông tin cây vào MySQL
        await db.execute(
            `INSERT INTO plants 
                (onchain_plant_id, seller_address, name, image_url, description, price_eth, stock, sold_count, is_available, data_hash, tx_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                image_url = VALUES(image_url),
                description = VALUES(description),
                price_eth = VALUES(price_eth),
                stock = VALUES(stock),
                sold_count = VALUES(sold_count),
                is_available = VALUES(is_available),
                data_hash = VALUES(data_hash),
                tx_hash = COALESCE(VALUES(tx_hash), tx_hash)`,
            [id, seller, name, image, desc, priceEth, stock, soldCount, isAvailable, dataHash, txHash]
        );

        console.log(`[MySQL Sync] Đã đồng bộ Cây #${id}: ${name}`);
    } catch (err) {
        console.error(`[Lỗi Sync Plant #${plantId}]:`, err.message);
    }
}

async function syncOrderToDB(orderId, actionName = "SYNC", actorAddress = null, txHash = null) {
    try {
        const o = await contract.orders(orderId);
        const id = Number(o.orderId);
        if (id === 0) return;

        const plantId = Number(o.plantId);
        const buyer = o.buyer.toLowerCase();
        const seller = o.seller.toLowerCase();
        const quantity = Number(o.quantity);
        const totalEth = ethers.formatEther(o.amount);
        const status = Number(o.status);
        const deliveredAt = Number(o.deliveredAt) > 0 ? new Date(Number(o.deliveredAt) * 1000) : null;

        // Đảm bảo cây và ví người mua/bán đã có trong DB trước khi lưu đơn
        await syncPlantToDB(plantId);
        await db.execute(
            `INSERT IGNORE INTO users (wallet_address, display_name) VALUES (?, ?), (?, ?)`,
            [buyer, `Account ${buyer.slice(0, 6)}`, seller, `Account ${seller.slice(0, 6)}`]
        );

        const defaultHash = makeHash(`${id}|${buyer}|${seller}|${plantId}|${quantity}|${totalEth}`);

        // Nếu đơn tạo từ Remix (chưa có địa chỉ giao hàng từ Web), tự điền thông tin mặc định
        await db.execute(
            `INSERT INTO orders 
                (onchain_order_id, onchain_plant_id, buyer_address, seller_address, quantity, total_eth, receiver_name, receiver_phone, shipping_address, status, order_hash, tx_hash, delivered_at)
             VALUES (?, ?, ?, ?, ?, ?, 'Khách Web3', 'Chưa cập nhật', 'Đặt trực tiếp qua On-Chain/Remix', ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                status = VALUES(status),
                delivered_at = COALESCE(VALUES(delivered_at), delivered_at),
                tx_hash = COALESCE(VALUES(tx_hash), tx_hash)`,
            [id, plantId, buyer, seller, quantity, totalEth, status, defaultHash, txHash, deliveredAt]
        );

        // Ghi log biến động trạng thái nếu có sự kiện mới
        if (txHash && actorAddress) {
            await db.execute(
                `INSERT INTO order_logs (onchain_order_id, actor_address, action, tx_hash) VALUES (?, ?, ?, ?)`,
                [id, actorAddress.toLowerCase(), actionName, txHash]
            );
        }

        console.log(`[MySQL Sync] Đã đồng bộ Đơn hàng #${id} (Trạng thái: ${status})`);
    } catch (err) {
        console.error(`[Lỗi Sync Order #${orderId}]:`, err.message);
    }
}

// Quét toàn bộ dữ liệu cũ trên Blockchain khi vừa bật Server
async function syncAllFromChain() {
    console.log("Đang đồng bộ toàn bộ dữ liệu từ Sepolia về MySQL...");
    const totalPlants = Number(await contract.plantCount());
    for (let i = 1; i <= totalPlants; i++) {
        await syncPlantToDB(i);
    }

    const totalOrders = Number(await contract.orderCount());
    for (let i = 1; i <= totalOrders; i++) {
        await syncOrderToDB(i);
    }
    console.log("Hoàn tất đồng bộ dữ liệu ban đầu!");
}

// =======================================================
// 4. LẮNG NGHE SỰ KIỆN REAL-TIME (TỰ ĐỘNG BẮT CẢ WEB & REMIX)
// =======================================================

function startBlockchainListeners() {
    // Sự kiện sản phẩm
    contract.on("PlantListed", (id, seller, name, price, stock, event) => {
        syncPlantToDB(Number(id), event.log.transactionHash);
    });

    contract.on("PlantUpdated", (id, event) => {
        syncPlantToDB(Number(id), event.log.transactionHash);
    });

    contract.on("PlantStatusToggled", (id, isAvailable, event) => {
        syncPlantToDB(Number(id), event.log.transactionHash);
    });

    // Sự kiện đơn hàng & ký quỹ
    contract.on("OrderCreated", (orderId, plantId, buyer, seller, qty, amount, event) => {
        syncOrderToDB(Number(orderId), "PAID", buyer, event.log.transactionHash);
    });

    contract.on("OrderDelivered", (orderId, event) => {
        syncOrderToDB(Number(orderId), "DELIVERED", "seller", event.log.transactionHash);
    });

    contract.on("PaymentReleased", (orderId, seller, amount, event) => {
        syncOrderToDB(Number(orderId), "COMPLETED", seller, event.log.transactionHash);
    });

    contract.on("OrderCancelled", (orderId, cancelledBy, buyer, amount, event) => {
        syncOrderToDB(Number(orderId), "CANCELLED", cancelledBy, event.log.transactionHash);
    });

    contract.on("ReturnRequested", (orderId, event) => {
        syncOrderToDB(Number(orderId), "RETURN_REQUESTED", "buyer", event.log.transactionHash);
    });

    contract.on("ReturnApproved", (orderId, event) => {
        syncOrderToDB(Number(orderId), "RETURN_APPROVED", "seller", event.log.transactionHash);
    });

    contract.on("ReturnRejected", (orderId, event) => {
        syncOrderToDB(Number(orderId), "RETURN_REJECTED", "seller", event.log.transactionHash);
    });

    contract.on("PaymentRefunded", (orderId, buyer, amount, event) => {
        syncOrderToDB(Number(orderId), "REFUNDED", "seller", event.log.transactionHash);
    });

    console.log("🎧 Đang lắng nghe mọi giao dịch trên Contract:", CONTRACT_ADDRESS);
}

// =======================================================
// 5. REST API CHO FRONTEND GỌI LÊN
// =======================================================

// Lấy danh sách cây từ MySQL (tải cực nhanh thay vì loop RPC)
app.get("/api/plants", async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM plants ORDER BY onchain_plant_id ASC");
    res.json(rows);
});

// Lấy danh sách đơn hàng (kèm địa chỉ giao hàng & lịch sử log) của 1 ví
app.get("/api/orders/:wallet", async (req, res) => {
    const wallet = req.params.wallet.toLowerCase();
    const [rows] = await db.execute(
        `SELECT o.*, p.name AS plant_name, p.image_url AS plant_image
         FROM orders o
         JOIN plants p ON o.onchain_plant_id = p.onchain_plant_id
         WHERE o.buyer_address = ? OR o.seller_address = ?
         ORDER BY o.onchain_order_id DESC`,
        [wallet, wallet]
    );
    res.json(rows);
});

// Web gửi thông tin giao nhận (Họ tên, SĐT, Địa chỉ) sau khi đặt hàng thành công
app.post("/api/orders/shipping", async (req, res) => {
    const { onchain_order_id, receiver_name, receiver_phone, shipping_address, note, order_hash, tx_hash } = req.body;
    await syncOrderToDB(onchain_order_id, "PAID", null, tx_hash);
    await db.execute(
        `UPDATE orders 
         SET receiver_name = ?, receiver_phone = ?, shipping_address = ?, note = ?, order_hash = ?
         WHERE onchain_order_id = ?`,
        [receiver_name, receiver_phone, shipping_address, note || "", order_hash, onchain_order_id]
    );
    res.json({ success: true });
});

// Lưu/cập nhật tên hiển thị của ví
app.post("/api/users", async (req, res) => {
    const { wallet_address, display_name } = req.body;
    const wallet = wallet_address.toLowerCase();
    await db.execute(
        `INSERT INTO users (wallet_address, display_name) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE display_name = VALUES(display_name)`,
        [wallet, display_name]
    );
    res.json({ success: true });
});

// Khởi chạy Server
app.listen(3000, async () => {
    console.log("Backend API đang chạy tại http://localhost:3000");
    await syncAllFromChain();
    startBlockchainListeners();
});
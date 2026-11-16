// SPDX-License-Identifier: MIT
// -> Khai báo giấy phép mã nguồn mở MIT cho phép sử dụng và chỉnh sửa tự do.

pragma solidity ^0.8.20;
// -> Chỉ định phiên bản trình biên dịch Solidity từ 0.8.20 đến dưới 0.9.0.

contract BonsaiMarketplace {
// -> Khởi tạo Smart Contract chính có tên BonsaiMarketplace.

    // ==================== 1. CẤU TRÚC DỮ LIỆU (STRUCT & ENUM) ====================

    struct Plant {
        uint256 id;              // Mã định danh duy nhất của chậu cây (1, 2, 3...)
        address payable seller;  // Địa chỉ ví người bán (payable để có thể nhận ETH)
        string name;             // Tên cây cảnh Bonsai
        string image;            // Đường dẫn URL hình ảnh của cây
        string desc;             // Mô tả chi tiết về cây
        uint256 price;           // Giá bán 1 chậu tính bằng đơn vị Wei 10000000000000000(1 ETH = 10^18 Wei)
        uint256 stock;           // Số lượng chậu cây hiện còn trong kho
        uint256 soldCount;       // Tổng số lượng chậu cây này đã được đặt mua
        bool isAvailable;        // Trạng thái hiển thị: true = đang mở bán, false = tạm ẩn
    }

    // Liệt kê các trạng thái vòng đời của một đơn hàng ký quỹ
    enum OrderStatus {
        PAID,               // 0: Người mua đã thanh toán, ETH đang khóa trong Smart Contract
        DELIVERED,          // 1: Người bán xác nhận đã giao hàng, bắt đầu tính thời gian 7 ngày
        RETURN_REQUESTED,   // 2: Người mua đã gửi yêu cầu trả hàng / hoàn tiền
        RETURN_APPROVED,    // 3: Người bán đồng ý cho trả hàng, chờ nhận lại cây
        COMPLETED,          // 4: Hoàn tất đơn hàng, ETH đã giải ngân cho người bán
        REFUNDED,           // 5: Đã nhận lại hàng trả và hoàn tiền ETH cho người mua
        CANCELLED           // 6: Đơn hàng bị hủy trước khi giao, đã hoàn tiền ETH cho người mua
    }

    struct Order {
        uint256 orderId;         // Mã định danh duy nhất của đơn hàng
        uint256 plantId;         // Mã ID của chậu cây được đặt mua
        address buyer;           // Địa chỉ ví người mua
        address payable seller;  // Địa chỉ ví người bán (payable để giải ngân ETH)
        uint256 quantity;        // Số lượng cây mua trong đơn này
        uint256 amount;          // Tổng số tiền ETH (tính bằng Wei) đang được giữ cho đơn này
        uint256 deliveredAt;     // Mốc thời gian (timestamp) lúc người bán bấm xác nhận đã giao
        OrderStatus status;      // Trạng thái hiện tại của đơn hàng (lấy từ enum OrderStatus)
        bool returnRequestUsed;  // Đánh dấu người mua đã dùng quyền yêu cầu trả hàng hay chưa (chỉ được 1 lần)
    }

    // ==================== 2. BIẾN TRẠNG THÁI & LƯU TRỮ (STATE VARIABLES) ====================

    uint256 public plantCount;   // Bộ đếm tổng số cây đã đăng bán (tự động tăng từ 0)
    uint256 public orderCount;   // Bộ đếm tổng số đơn hàng đã tạo (tự động tăng từ 0)

    // Hằng số thời gian chờ xác nhận: 7 ngày (Solidity tự quy đổi thành 604800 giây)
    uint256 public constant CONFIRMATION_PERIOD = 7 days;

    mapping(uint256 => Plant) public plants;  // Ánh xạ từ ID cây -> Thông tin chi tiết của cây đó
    mapping(uint256 => Order) public orders;  // Ánh xạ từ ID đơn hàng -> Thông tin chi tiết đơn hàng đó

    // Lưu mảng danh sách các mã đơn hàng theo từng địa chỉ ví (private: chỉ đọc qua hàm getter bên dưới)
    mapping(address => uint256[]) private buyerOrderIds;   // Danh sách mã đơn của người mua
    mapping(address => uint256[]) private sellerOrderIds;  // Danh sách mã đơn của người bán

    // Biến khóa phục vụ cơ chế chống tấn công rút tiền lặp (Reentrancy Guard)
    uint256 private locked = 1;

    // Bộ lọc bảo vệ: Khóa hàm trong lúc đang thực thi chuyển tiền ETH để tránh bị gọi lồng nhiều lần
    modifier nonReentrant() {
        require(locked == 1, "Transaction is locked"); // Kiểm tra hàm không bị khóa
        locked = 2;                                    // Khóa hàm lại trước khi chạy code bên trong
        _;                                             // Thực thi toàn bộ code của hàm được gắn modifier
        locked = 1;                                    // Mở khóa sau khi hàm chạy xong
    }

    // ==================== 3. SỰ KIỆN ON-CHAIN (EVENTS) ====================
    // Ghi log lên Blockchain để Frontend (Web3/Ethers.js) hoặc Etherscan dễ dàng theo dõi

    event PlantListed(
        uint256 indexed id,       // indexed giúp lọc nhanh log theo ID cây
        address indexed seller,   // indexed giúp lọc nhanh log theo địa chỉ người bán
        string name,
        uint256 price,
        uint256 stock
    );

    event PlantPurchased(
        uint256 indexed id,
        address indexed buyer,
        address indexed seller,
        uint256 quantity,
        uint256 totalPrice
    );

    event PlantUpdated(uint256 indexed id);                        // Phát ra khi người bán sửa thông tin cây
    event PlantStatusToggled(uint256 indexed id, bool isAvailable); // Phát ra khi người bán ẩn/hiện cây

    event OrderCreated(
        uint256 indexed orderId,
        uint256 indexed plantId,
        address indexed buyer,
        address seller,
        uint256 quantity,
        uint256 amount
    );

    event OrderDelivered(uint256 indexed orderId);                 // Phát ra khi người bán báo đã giao hàng

    event PaymentReleased(
        uint256 indexed orderId,
        address seller,
        uint256 amount
    ); // Phát ra khi Smart Contract giải ngân ETH cho người bán

    event OrderCancelled(
        uint256 indexed orderId,
        address indexed cancelledBy,
        address indexed buyer,
        uint256 amount
    ); // Phát ra khi đơn bị hủy và hoàn tiền

    event ReturnRequested(uint256 indexed orderId);                // Phát ra khi người mua xin trả hàng
    event ReturnApproved(uint256 indexed orderId);                 // Phát ra khi người bán đồng ý cho trả hàng
    event ReturnRejected(uint256 indexed orderId);                 // Phát ra khi người bán từ chối trả hàng

    event PaymentRefunded(
        uint256 indexed orderId,
        address buyer,
        uint256 amount
    ); // Phát ra khi hoàn trả ETH về cho người mua sau khi nhận lại hàng trả

    // =====================================
    // 1. QUAN LY SAN PHAM
    // =====================================

    // Hàm đăng bán một chậu cây mới (bất kỳ ví nào cũng có thể gọi)
    function listPlant(
        string memory _name,      // Tên cây truyền vào
        string memory _image,     // Link ảnh truyền vào
        string memory _desc,      // Mô tả truyền vào
        uint256 _priceInWei,      // Giá bán (Wei) truyền vào 10000000000000000
        uint256 _stock            // Số lượng kho truyền vào
    ) external {
        require(_priceInWei > 0, "Gia phai lon hon 0");     // Bắt buộc giá > 0
        require(_stock > 0, "So luong phai lon hon 0");     // Bắt buộc tồn kho > 0

        plantCount++; // Tăng ID cây lên 1 đơn vị

        // Lưu thông tin cây mới vào mapping plants tại vị trí plantCount
        plants[plantCount] = Plant({
            id: plantCount,
            seller: payable(msg.sender), // Gán ví người gọi hàm này làm người bán
            name: _name,
            image: _image,
            desc: _desc,
            price: _priceInWei,
            stock: _stock,
            soldCount: 0,
            isAvailable: true
        });

        // Phát sự kiện thông báo cây mới đã lên sàn
        emit PlantListed(
            plantCount,
            msg.sender,
            _name,
            _priceInWei,
            _stock
        );
    }

    // Hàm cập nhật thông tin cây đã đăng
    function updatePlant(
        uint256 _id,
        string memory _name,
        string memory _image,
        string memory _desc,
        uint256 _priceInWei,
        uint256 _stock
    ) external {
        require(_id > 0 && _id <= plantCount, "Cay khong ton tai"); // Kiểm tra ID hợp lệ

        Plant storage plant = plants[_id]; // Lấy tham chiếu trực tiếp đến dữ liệu cây trên Blockchain

        require(msg.sender == plant.seller, "Khong co quyen"); // Chỉ đúng người đăng cây mới được sửa
        require(_priceInWei > 0, "Gia phai lon hon 0");        // Giá mới phải > 0

        // Ghi đè các thông tin mới vào lưu trữ trên Blockchain
        plant.name = _name;
        plant.image = _image;
        plant.desc = _desc;
        plant.price = _priceInWei;
        plant.stock = _stock;

        emit PlantUpdated(_id); // Phát sự kiện đã cập nhật
    }

    // Hàm ẩn hoặc mở bán lại cây
    function togglePlantAvailability(uint256 _id) external {
        require(_id > 0 && _id <= plantCount, "Cay khong ton tai");

        Plant storage plant = plants[_id];

        require(msg.sender == plant.seller, "Khong co quyen"); // Chỉ chủ cây mới được ẩn/hiện

        plant.isAvailable = !plant.isAvailable; // Đảo ngược trạng thái true <-> false

        emit PlantStatusToggled(_id, plant.isAvailable);
    }

    // =====================================
    // 2. MUA HANG VA KY QUY
    // =====================================

    // Hàm đặt mua cây: ETH được gửi vào và giữ tạm trong Smart Contract (payable)
    function buyPlant(
        uint256 _id,
        uint256 _quantity
    ) external payable nonReentrant {

        require(_id > 0 && _id <= plantCount, "Cay khong ton tai"); // Kiểm tra cây tồn tại
        require(_quantity > 0, "So luong khong hop le");            // Số lượng mua phải >= 1

        Plant storage plant = plants[_id];

        require(plant.isAvailable, "San pham da ngung ban");        // Cây phải đang mở bán
        require(plant.stock >= _quantity, "Khong du hang");         // Kho phải đủ số lượng đặt
        require(msg.sender != plant.seller, "Khong the tu mua");    // Chặn người bán tự mua cây của mình

        uint256 totalPrice = plant.price * _quantity;               // Tính tổng tiền đơn hàng (Wei)

        require(msg.value == totalPrice, "Sai so tien thanh toan"); // Số ETH gửi kèm phải khớp chính xác tổng tiền

        // Trừ tồn kho và cộng lượt bán ngay khi đặt hàng
        plant.stock -= _quantity;
        plant.soldCount += _quantity;

        orderCount++; // Tăng mã đơn hàng lên 1

        // Tạo đơn hàng mới với trạng thái PAID (tiền đang nằm trong Contract, chưa chuyển cho người bán)
        orders[orderCount] = Order({
            orderId: orderCount,
            plantId: _id,
            buyer: msg.sender,
            seller: plant.seller,
            quantity: _quantity,
            amount: totalPrice,
            deliveredAt: 0,
            status: OrderStatus.PAID,
            returnRequestUsed: false
        });

        // Lưu mã đơn hàng vào danh sách lịch sử của cả người mua và người bán
        buyerOrderIds[msg.sender].push(orderCount);
        sellerOrderIds[plant.seller].push(orderCount);

        // Phát 2 sự kiện ghi nhận lượt mua và đơn hàng ký quỹ mới
        emit PlantPurchased(
            _id,
            msg.sender,
            plant.seller,
            _quantity,
            totalPrice
        );

        emit OrderCreated(
            orderCount,
            _id,
            msg.sender,
            plant.seller,
            _quantity,
            totalPrice
        );
    }

    // =====================================
    // 3. HUY DON HANG
    // =====================================

    // Hàm hủy đơn hàng (chỉ áp dụng khi đơn vừa thanh toán PAID và người bán chưa giao hàng)
    function cancelOrder(
        uint256 _orderId
    ) external nonReentrant {

        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        // Cho phép cả người mua hoặc người bán hủy đơn khi chưa giao
        require(
            msg.sender == order.buyer ||
            msg.sender == order.seller,
            "Khong co quyen huy don"
        );

        // Chỉ được hủy nếu trạng thái đang là PAID (chưa chuyển sang DELIVERED)
        require(
            order.status == OrderStatus.PAID,
            "Chi huy duoc don chua giao"
        );

        // Cập nhật trạng thái sang CANCELLED trước khi chuyển tiền (chuẩn bảo mật Checks-Effects-Interactions)
        order.status = OrderStatus.CANCELLED;

        // Hoàn trả lại số lượng cây về kho và trừ lại lượt đã bán
        Plant storage plant = plants[order.plantId];

        plant.stock += order.quantity;
        plant.soldCount -= order.quantity;

        // Smart Contract chuyển hoàn trả 100% số ETH đang giữ về lại ví người mua
        (bool success, ) = order.buyer.call{
            value: order.amount
        }("");

        require(success, "Hoan tien that bai"); // Đảm bảo giao dịch hoàn tiền thành công

        emit OrderCancelled(
            _orderId,
            msg.sender,
            order.buyer,
            order.amount
        );
    }

    // =====================================
    // 4. NGUOI BAN XAC NHAN GIAO HANG
    // =====================================

    // Người bán bấm xác nhận đã giao cây cho đơn vị vận chuyển / người mua
    function markDelivered(uint256 _orderId) external {
        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.seller, "Khong co quyen");           // Chỉ người bán được gọi
        require(order.status == OrderStatus.PAID, "Trang thai khong hop le"); // Đơn phải đang ở trạng thái PAID

        order.status = OrderStatus.DELIVERED; // Chuyển trạng thái sang Đã giao hàng
        order.deliveredAt = block.timestamp;  // Ghi lại mốc thời gian hiện tại của khối Blockchain để đếm 7 ngày

        emit OrderDelivered(_orderId);
    }

    // =====================================
    // 5. NGUOI MUA XAC NHAN NHAN HANG
    // =====================================

    // Người mua nhận cây ưng ý -> Bấm xác nhận để Smart Contract giải ngân tiền cho người bán
    function confirmReceived(
        uint256 _orderId
    ) external nonReentrant {

        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.buyer, "Khong co quyen");                 // Chỉ người mua được xác nhận
        require(order.status == OrderStatus.DELIVERED, "Trang thai khong hop le"); // Đơn phải ở trạng thái DELIVERED

        order.status = OrderStatus.COMPLETED; // Chốt đơn hàng hoàn tất

        // Giải ngân số ETH đang ký quỹ từ Smart Contract sang ví người bán
        (bool success, ) = order.seller.call{
            value: order.amount
        }("");

        require(success, "Chuyen tien that bai");

        emit PaymentReleased(_orderId, order.seller, order.amount);
    }

    // =====================================
    // 6. YEU CAU TRA HANG
    // =====================================

    // Người mua gửi yêu cầu trả hàng nếu cây bị lỗi/hỏng trong vòng 7 ngày kể từ lúc giao
    function requestReturn(uint256 _orderId) external {
        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.buyer, "Khong co quyen");                 // Chỉ người mua được khiếu nại trả hàng
        require(order.status == OrderStatus.DELIVERED, "Trang thai khong hop le"); // Chỉ trả hàng khi đã nhận giao

        // Kiểm tra thời gian hiện tại vẫn nằm trong vòng 7 ngày kể từ lúc deliveredAt
        require(
            block.timestamp < order.deliveredAt + CONFIRMATION_PERIOD,
            "Da het thoi han tra hang"
        );

        // Chặn việc gửi yêu cầu trả hàng nhiều lần trên cùng 1 đơn
        require(!order.returnRequestUsed, "Da yeu cau tra hang");

        order.returnRequestUsed = true;              // Đánh dấu đã sử dụng lượt yêu cầu trả hàng
        order.status = OrderStatus.RETURN_REQUESTED; // Chuyển sang trạng thái chờ người bán phản hồi

        emit ReturnRequested(_orderId);
    }

    // =====================================
    // 7. NGUOI BAN CHAP THUAN TRA HANG
    // =====================================

    // Người bán đồng ý với yêu cầu trả hàng của người mua
    function approveReturn(uint256 _orderId) external {
        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.seller, "Khong co quyen");                    // Chỉ người bán được duyệt
        require(order.status == OrderStatus.RETURN_REQUESTED, "Khong co yeu cau tra");

        order.status = OrderStatus.RETURN_APPROVED; // Chuyển sang trạng thái chờ người mua gửi trả cây về

        emit ReturnApproved(_orderId);
    }

    // =====================================
    // 8. NGUOI BAN TU CHOI TRA HANG
    // =====================================

    // Người bán không đồng ý lý do trả hàng -> Đưa đơn quay lại trạng thái DELIVERED
    function rejectReturn(uint256 _orderId) external {
        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.seller, "Khong co quyen");
        require(order.status == OrderStatus.RETURN_REQUESTED, "Khong co yeu cau tra");

        order.status = OrderStatus.DELIVERED; // Trả về trạng thái DELIVERED (người mua có thể bấm confirmReceived hoặc đợi hết 7 ngày để autoRelease)

        emit ReturnRejected(_orderId);
    }

    // =====================================
    // 9. XAC NHAN NHAN LAI HANG VA HOAN TIEN
    // =====================================

    // Sau khi người bán nhận lại được cây trả về -> Bấm xác nhận để Smart Contract hoàn tiền cho người mua
    function confirmReturned(
        uint256 _orderId
    ) external nonReentrant {

        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        require(msg.sender == order.seller, "Khong co quyen");                   // Chỉ người bán xác nhận đã nhận lại hàng
        require(order.status == OrderStatus.RETURN_APPROVED, "Chua duoc chap thuan");

        order.status = OrderStatus.REFUNDED; // Chốt trạng thái đã hoàn tiền

        // Cộng lại số lượng cây vào kho và trừ lượt bán
        Plant storage plant = plants[order.plantId];

        plant.stock += order.quantity;
        plant.soldCount -= order.quantity;

        // Hoàn trả toàn bộ số ETH đang giữ về lại ví người mua
        (bool success, ) = order.buyer.call{
            value: order.amount
        }("");

        require(success, "Hoan tien that bai");

        emit PaymentRefunded(_orderId, order.buyer, order.amount);
    }

    // =====================================
    // 10. GIAI NGAN SAU 7 NGAY
    // =====================================

    // Hàm bảo vệ người bán: Nếu sau 7 ngày giao hàng mà người mua không bấm xác nhận cũng không trả hàng,
    // bất kỳ ai (thường là người bán) cũng có thể gọi hàm này để giải ngân ETH về ví người bán.
    function autoRelease(
        uint256 _orderId
    ) external nonReentrant {

        require(
            _orderId > 0 && _orderId <= orderCount,
            "Don hang khong ton tai"
        );

        Order storage order = orders[_orderId];

        // Chỉ giải ngân tự động nếu đơn đang ở DELIVERED (nếu đang RETURN_REQUESTED sẽ không bị giải ngân nhầm)
        require(order.status == OrderStatus.DELIVERED, "Trang thai khong hop le");

        // Kiểm tra thời gian hiện tại đã vượt qua mốc giao hàng + 7 ngày
        require(
            block.timestamp >= order.deliveredAt + CONFIRMATION_PERIOD,
            "Chua het 7 ngay"
        );

        order.status = OrderStatus.COMPLETED; // Chốt đơn hoàn tất

        // Giải ngân ETH từ Smart Contract sang ví người bán
        (bool success, ) = order.seller.call{
            value: order.amount
        }("");

        require(success, "Chuyen tien that bai");

        emit PaymentReleased(_orderId, order.seller, order.amount);
    }

    // =====================================
    // 11. LAY DANH SACH DON HANG
    // =====================================

    // Trả về mảng tất cả mã đơn hàng (orderId) mà địa chỉ _buyer đã đặt mua
    function getBuyerOrders(
        address _buyer
    ) external view returns (uint256[] memory) {
        return buyerOrderIds[_buyer];
    }

    // Trả về mảng tất cả mã đơn hàng (orderId) mà địa chỉ _seller đã bán được
    function getSellerOrders(
        address _seller
    ) external view returns (uint256[] memory) {
        return sellerOrderIds[_seller];
    }
}
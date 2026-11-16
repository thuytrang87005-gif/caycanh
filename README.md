# 🌱 XANH GARDEN – Blockchain-based Plant Marketplace

## Giới thiệu

**XANH GARDEN** là website thương mại điện tử kinh doanh cây cảnh được phát triển theo mô hình C2C (Customer-to-Customer), cho phép người dùng đăng bán và mua cây cảnh trực tiếp với nhau.

Dự án ứng dụng công nghệ Blockchain và Smart Contract nhằm quản lý các giao dịch mua bán, thanh toán ký quỹ, xác nhận nhận hàng và hoàn tiền. Các giao dịch được thực hiện thông qua ví MetaMask trên mạng Ethereum Sepolia, góp phần tăng tính minh bạch và hạn chế sự can thiệp thủ công trong quá trình thanh toán.

## Chức năng chính

### 1. Quản lý người dùng
- Kết nối ví MetaMask để xác thực địa chỉ ví.
- Người dùng có thể vừa là người mua, vừa là người bán.
- Quản lý thông tin cá nhân và địa chỉ nhận hàng.

### 2. Quản lý sản phẩm
- Đăng bán cây cảnh trên nền tảng.
- Cập nhật thông tin, hình ảnh, giá bán và số lượng tồn kho.
- Quản lý trạng thái hiển thị sản phẩm.
- Theo dõi số lượng cây đã bán.

### 3. Giỏ hàng và đặt hàng
- Thêm sản phẩm vào giỏ hàng.
- Điều chỉnh số lượng sản phẩm.
- Đặt mua nhiều sản phẩm trong cùng một lần thanh toán.
- Tạo đơn hàng riêng biệt cho từng sản phẩm trên Smart Contract.
- Lưu thông tin người nhận và địa chỉ giao hàng.

### 4. Thanh toán bằng Blockchain
- Sử dụng MetaMask để xác nhận giao dịch.
- Thanh toán bằng ETH trên mạng Ethereum Sepolia.
- Smart Contract quản lý khoản thanh toán ký quỹ.
- Tiền được giữ trong Smart Contract cho đến khi đủ điều kiện giải ngân hoặc hoàn tiền.

### 5. Quản lý đơn hàng
- Theo dõi đơn hàng với vai trò người mua hoặc người bán.
- Người bán cập nhật trạng thái giao hàng.
- Người mua xác nhận đã nhận hàng.
- Người mua có thể hủy đơn khi đơn hàng chưa được xác nhận giao hàng.
- Lưu lại lịch sử các thao tác liên quan đến đơn hàng.

### 6. Cơ chế ký quỹ và hoàn tiền
- Sau khi người mua thanh toán, tiền được giữ trong Smart Contract.
- Người mua xác nhận nhận hàng để giải ngân tiền cho người bán.
- Người mua có thời hạn 7 ngày kể từ khi người bán xác nhận giao hàng để yêu cầu trả hàng.
- Người bán có thể chấp nhận hoặc từ chối yêu cầu trả hàng.
- Khi yêu cầu trả hàng được chấp nhận và người bán xác nhận đã nhận lại sản phẩm, Smart Contract thực hiện hoàn tiền cho người mua.
- Nếu hết thời hạn 7 ngày mà không có yêu cầu trả hàng, khoản thanh toán đủ điều kiện được giải ngân thông qua giao dịch gọi hàm tự động giải ngân.

### 7. Đồng bộ dữ liệu Blockchain và MySQL
- Smart Contract lưu trữ và quản lý trạng thái giao dịch trên Blockchain.
- MySQL lưu trữ thông tin người dùng, sản phẩm, đơn hàng và lịch sử hoạt động.
- Backend Node.js kết nối với Smart Contract để theo dõi sự kiện và đồng bộ dữ liệu từ Blockchain về MySQL.
- Frontend sử dụng API để trao đổi dữ liệu với Backend.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Blockchain | Ethereum Sepolia |
| Smart Contract | Solidity |
| Blockchain Library | Ethers.js |
| Wallet | MetaMask |
| Development Tools | Remix IDE, VS Code, XAMPP |

## Kiến trúc hệ thống

Hệ thống gồm ba thành phần chính:

- **Frontend:** Giao diện mua bán cây cảnh, quản lý giỏ hàng và đơn hàng.
- **Backend:** Xử lý API, kết nối MySQL và đồng bộ dữ liệu từ Blockchain.
- **Blockchain:** Smart Contract quản lý giao dịch, thanh toán ký quỹ, giải ngân và hoàn tiền.

## Mục tiêu dự án

- Xây dựng nền tảng thương mại điện tử kinh doanh cây cảnh theo mô hình C2C.
- Ứng dụng Smart Contract vào quản lý giao dịch mua bán.
- Tăng tính minh bạch trong quá trình thanh toán và xử lý đơn hàng.
- Kết hợp cơ sở dữ liệu truyền thống với công nghệ Blockchain.

## Môi trường triển khai

Dự án sử dụng mạng Ethereum Sepolia phục vụ thử nghiệm các giao dịch Blockchain. ETH sử dụng trong quá trình giao dịch là ETH thử nghiệm trên Testnet, không phải ETH có giá trị giao dịch thực tế.

---

**XANH GARDEN – Kết nối người yêu cây, minh bạch hóa giao dịch bằng Blockchain.**

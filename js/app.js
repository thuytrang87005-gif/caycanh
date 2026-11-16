
// Lấy mã đơn hàng từ sự kiện OrderCreated trong receipt
function getCreatedOrderId(receipt) {
    if (!Web3Manager.contract) {
        throw new Error("Chưa khởi tạo Smart Contract.");
    }

    const contractAddress = Web3Manager.contract.address.toLowerCase();

    for (const log of receipt.logs || []) {
        if (log.address.toLowerCase() !== contractAddress) continue;

        try {
            const parsed = Web3Manager.contract.interface.parseLog(log);

            if (parsed.name === "OrderCreated") {
                const orderId = parsed.args.orderId ?? parsed.args[0];
                return orderId.toString();
            }
        } catch (error) {
            // Bỏ qua log không thuộc sự kiện cần tìm
        }
    }

    return null;
}


// Tải lại dữ liệu cây từ Blockchain

async function refreshPlants() {
    try {
        const chainPlants = await Web3Manager.fetchPlantsFromChain();

        State.plants = chainPlants || [];
        State.savePlants();

        UI.renderPlants();

    } catch (error) {
        console.error("Lỗi tải danh sách cây:", error);
    }
}


// Tải lại lịch sử đơn hàng từ Blockchain

async function refreshOrders() {
    if (!State.userAddress) return;

    try {
        const result = await Web3Manager.getMyOrders();

        State.orders = [
            ...(result.buyerOrders || []),
            ...(result.sellerOrders || [])
        ];

        console.log("Đơn mua:", result.buyerOrders);
        console.log("Đơn bán:", result.sellerOrders);

    } catch (error) {
        console.error("Lỗi tải lịch sử đơn hàng:", error);
        State.orders = [];
    }
}



// Khởi tạo ứng dụng
document.addEventListener("DOMContentLoaded", async () => {

    // 1. Nạp cấu hình
    const configLoaded = await loadConfig();
    if (!configLoaded) return;

    // 2. Tải cây từ Smart Contract
    await refreshPlants();

    // 3. Khởi tạo giao diện
    UI.updateHeader();
    UI.renderCart();

    // Tìm kiếm sản phẩm
    document.getElementById("searchInput")?.addEventListener("input", (e) => {
        UI.renderPlants(e.target.value);
    });

    // Mở modal đăng nhập
    document.getElementById("btnConnect")?.addEventListener("click", () => {
        UI.openModal("loginModal");
    });

    // Kết nối MetaMask
    document.getElementById("btnLoginMetaMask")?.addEventListener("click", async () => {
        UI.closeModal("loginModal");

        const connected = await Web3Manager.connect();

        if (connected) {
            await refreshOrders();
            UI.updateHeader();
            UI.renderPlants();
        }
    });

    // Mở form đăng cây
    document.getElementById("btnOpenModal")?.addEventListener("click", () => {
        document.getElementById("modalPlantTitle").innerText =
            "Đăng Bán Cây Bonsai Mới";

        document.getElementById("plantForm").reset();
        document.getElementById("plantEditId").value = "";

        UI.openModal("addPlantModal");
    });

    // Mở giỏ hàng
    document.getElementById("btnOpenCart")?.addEventListener("click", () => {
        UI.openModal("cartModal");
    });

    // Mở lịch sử đơn hàng
    document.getElementById("btnOpenOrders")?.addEventListener("click", async () => {
        if (!State.userAddress) {
            alert("Vui lòng kết nối MetaMask trước!");
            return;
        }

        await refreshOrders();
        UI.renderOrders();
        UI.openModal("ordersModal");
    });


    // ==========================================
    // ĐĂNG BÁN / CHỈNH SỬA CÂY
    // ==========================================

    document.getElementById("plantForm")?.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (!State.signer) {
            alert("Vui lòng kết nối MetaMask trước!");
            return;
        }

        const editId = document.getElementById("plantEditId").value;
        const name = document.getElementById("plantName").value.trim();
        const price = document.getElementById("plantPrice").value;
        const stock = parseInt(
            document.getElementById("plantQuantity").value,
            10
        );
        const image = document.getElementById("plantImage").value;
        const desc = document.getElementById("plantDesc").value;

        if (!name || !price || !Number.isInteger(stock) || stock <= 0) {
            alert("Vui lòng kiểm tra tên, giá và số lượng sản phẩm.");
            return;
        }

        try {
            let tx;

            if (editId) {
                tx = await Web3Manager.updatePlantOnChain(
                    editId,
                    name,
                    image,
                    desc,
                    price,
                    stock
                );

                alert("Đã gửi giao dịch cập nhật cây. Đang chờ Blockchain xác nhận...");
            } else {
                tx = await Web3Manager.listPlantOnChain(
                    name,
                    image,
                    desc,
                    price,
                    stock
                );

                alert("Đã gửi giao dịch đăng cây. Đang chờ Blockchain xác nhận...");
            }

            await tx.wait();

            // Không tự tạo ID ở phía JavaScript.
            // Lấy dữ liệu mới nhất từ Smart Contract.
            await refreshPlants();

            UI.closeModal("addPlantModal");

            alert(
                editId
                    ? "Cập nhật cây thành công!"
                    : "Đăng bán cây thành công!"
            );

        } catch (error) {
            console.error("Lỗi đăng bán/chỉnh sửa cây:", error);

            alert(
                "Không thể thực hiện giao dịch: " +
                (error.reason || error.message)
            );
        }
    });


    // ==========================================
    // THANH TOÁN GIỎ HÀNG
    // Mỗi sản phẩm tạo một đơn hàng On-Chain
    // ==========================================

    document.getElementById("btnCheckout")?.addEventListener("click", async () => {

        if (!State.cart || State.cart.length === 0) {
            alert("Giỏ hàng đang trống!");
            return;
        }

        // Yêu cầu kết nối ví
        if (!State.signer) {
            alert("Vui lòng kết nối MetaMask trước khi thanh toán!");

            const connected = await Web3Manager.connect();
            if (!connected) return;

            UI.updateHeader();
            await refreshPlants();
        }

        // Không cho phép tự mua sản phẩm của mình
        const ownItem = State.cart.find(item =>
            State.isSeller(item.seller)
        );

        if (ownItem) {
            alert(
                `Sản phẩm "${ownItem.name}" là của bạn!\n` +
                "Bạn không thể tự mua sản phẩm của chính mình."
            );
            return;
        }

        // Tạo bản sao để tránh thay đổi danh sách đang duyệt
        const checkoutItems = [...State.cart];

        let successCount = 0;
        let failedItem = null;

        try {
            for (const item of checkoutItems) {

                try {
                    const quantity = parseInt(item.qty, 10);
                    const totalPrice = (
                        parseFloat(item.price) * quantity
                    ).toString();

                    if (!Number.isInteger(quantity) || quantity <= 0) {
                        throw new Error("Số lượng sản phẩm không hợp lệ.");
                    }

                    // Gửi giao dịch mua lên Smart Contract
                    const tx = await Web3Manager.buyPlantOnChain(
                        item.id,
                        quantity,
                        totalPrice
                    );

                    alert(
                        `Đã gửi giao dịch mua "${item.name}".\n` +
                        "Vui lòng xác nhận trên MetaMask và chờ Blockchain xử lý."
                    );

                    
                    const receipt = await tx.wait();

                    // Kiểm tra giao dịch đã được Blockchain xác nhận
                    if (receipt.status !== 1) {
                        throw new Error("Giao dịch chưa được xác nhận thành công.");
                    }

                    // Thử lấy mã đơn hàng từ sự kiện
                    const orderId = getCreatedOrderId(receipt);

                    if (orderId === null) {
                        console.warn(
                            "Giao dịch đã thành công nhưng chưa đọc được OrderCreated.",
                            receipt.transactionHash
                        );
                    } else {
                        console.log(
                            `Mua thành công: ${item.name} - Order ID: ${orderId}`
                        );
                    }

                    // Giao dịch đã thành công, không được báo mua thất bại
                    // chỉ vì không đọc được mã đơn hàng.
                    State.cart = State.cart.filter(cartItem =>
                        !(
                            String(cartItem.id) === String(item.id) &&
                            String(cartItem.seller).toLowerCase() ===
                            String(item.seller).toLowerCase()
                        )
                    );

                    State.saveCart();
                    successCount++;


                } catch (error) {
                    console.error(
                        `Lỗi mua sản phẩm ${item.name}:`,
                        error
                    );

                    failedItem = item;
                    break;
                }
            }

            // Đồng bộ lại dữ liệu từ Blockchain
            await refreshPlants();
            await refreshOrders();

            State.saveCart();

            UI.renderCart();
            UI.renderPlants();

            if (successCount > 0) {
                UI.renderOrders();
            }

            if (State.cart.length === 0) {
                UI.closeModal("cartModal");
            }

            if (failedItem) {
                alert(
                    `Đã mua thành công ${successCount} sản phẩm.\n` +
                    `Sản phẩm "${failedItem.name}" chưa mua được.\n` +
                    "Các sản phẩm chưa mua vẫn được giữ trong giỏ hàng.\n\n" +
                    "Lưu ý: Tiền của đơn hàng thành công đang được Smart Contract giữ, " +
                    "chưa chuyển trực tiếp cho người bán."
                );
            } else {
                alert(
                    `Thanh toán thành công ${successCount} sản phẩm!\n` +
                    "Mỗi sản phẩm đã được tạo thành một đơn hàng riêng trên Blockchain.\n" +
                    "Tiền thanh toán đang được Smart Contract giữ theo cơ chế ký quỹ."
                );
            }

        } catch (error) {
            console.error("Lỗi thanh toán:", error);

            alert(
                "Lỗi thanh toán: " +
                (error.reason || error.message)
            );
        }
    });

});

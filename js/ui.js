// URL ảnh Bonsai mặc định làm dự phòng khi link ảnh bị hỏng/lỗi
const DEFAULT_BONSAI_IMG = "https://images.unsplash.com/photo-1512428813834-c702c7702b78?w=500&q=80";

function generateOrderHash(buyer, items, totalEth) {
    const rawData = `${buyer.toLowerCase()}-${Date.now()}-${totalEth}-${JSON.stringify(items)}`;
    return ethers.utils.id(rawData);
}

// Tự động đặt tên Account 1, Account 2... và ghi nhớ tên riêng cho từng địa chỉ ví
function getWalletName(address) {
    if (!address) return "Kết nối ví";
    const addrLower = address.toLowerCase();

    let savedNames = JSON.parse(localStorage.getItem('xanh_wallet_names') || '{}');

    if (!savedNames[addrLower]) {
        const nextIndex = Object.keys(savedNames).length + 1;
        savedNames[addrLower] = `Account ${nextIndex}`;
        localStorage.setItem('xanh_wallet_names', JSON.stringify(savedNames));
    }

    return savedNames[addrLower];
}

const UI = {
    openModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.remove('hidden');
            el.classList.add('flex');
            // Tự động tải lại đơn hàng từ Blockchain mỗi khi mở Modal Quản Lý Đơn Hàng
            if (modalId === 'ordersModal') {
                this.renderOrders();
            }
        }
    },

    closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) { el.classList.add('hidden'); el.classList.remove('flex'); }
    },

    // 1. Quản lý Bật / Tắt Dropdown Menu của User Profile
    toggleUserDropdown() {
        const menu = document.getElementById('dropdownMenu');
        const arrow = document.getElementById('dropdownArrow');
        if (menu) {
            menu.classList.toggle('hidden');
            if (arrow) arrow.classList.toggle('rotate-180');
        }
    },

    // 2. Đóng Dropdown Menu
    closeUserDropdown() {
        const menu = document.getElementById('dropdownMenu');
        const arrow = document.getElementById('dropdownArrow');
        if (menu) {
            menu.classList.add('hidden');
            if (arrow) arrow.classList.remove('rotate-180');
        }
    },

    // 3. Ngắt kết nối ví / Đăng xuất
    disconnectWallet() {
        State.userAddress = null;
        State.signer = null;
        if (typeof Web3Manager !== 'undefined') Web3Manager.contract = null;
        this.closeUserDropdown();
        this.updateHeader();
        this.renderPlants();
        alert("Đã ngắt kết nối ví thành công!");
    },

    // Bật / tắt ô nhập tên ngay trong Dropdown
    toggleRenameInput(show) {
        const viewBox = document.getElementById('accountNameView');
        const editBox = document.getElementById('accountNameEdit');
        const input = document.getElementById('inputWalletName');

        if (show) {
            if (input && State.userAddress) input.value = getWalletName(State.userAddress);
            viewBox?.classList.add('hidden');
            editBox?.classList.remove('hidden');
            input?.focus();
        } else {
            editBox?.classList.add('hidden');
            viewBox?.classList.remove('hidden');
        }
    },

    // Lưu tên mới theo địa chỉ ví hiện tại
    saveWalletName() {
        if (!State.userAddress) return;
        const input = document.getElementById('inputWalletName');
        const newName = input?.value.trim();

        if (newName) {
            const addrLower = State.userAddress.toLowerCase();
            let savedNames = JSON.parse(localStorage.getItem('xanh_wallet_names') || '{}');
            savedNames[addrLower] = newName;
            localStorage.setItem('xanh_wallet_names', JSON.stringify(savedNames));
            this.updateHeader();
        }
        this.toggleRenameInput(false);
    },

    // 4. Cập nhật trạng thái hiển thị Header (Nút kết nối ví vs Dropdown Profile)
    async updateHeader(isInitialConnect = false) {
        const btnConnect = document.getElementById('btnConnect');
        const userProfileDropdown = document.getElementById('userProfileDropdown');
        const walletText = document.getElementById('walletText');
        const txtBalance = document.getElementById('txtBalance');
        const txtFullAddress = document.getElementById('txtFullAddress');
        const txtAccountName = document.getElementById('txtAccountName');

        if (State.userAddress) {
            if (btnConnect) btnConnect.classList.add('hidden');
            if (userProfileDropdown) userProfileDropdown.classList.remove('hidden');

            const addr = State.userAddress;
            const shortAddr = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
            const walletName = getWalletName(addr);

            if (walletText) walletText.innerText = walletName;
            if (txtAccountName) txtAccountName.innerText = walletName;
            if (txtFullAddress) txtFullAddress.innerText = shortAddr;

            if (Web3Manager.getBalance) {
                const balanceEth = await Web3Manager.getBalance();
                if (txtBalance) txtBalance.innerText = `${balanceEth} ETH`;
            }
        } else {
            if (btnConnect) btnConnect.classList.remove('hidden');
            if (userProfileDropdown) userProfileDropdown.classList.add('hidden');
        }
    },

    renderPlants(filterText = "") {
        const grid = document.getElementById('plantGrid');
        const counterTotal = document.getElementById('totalPlantsCount');
        const counterSold = document.getElementById('soldPlantsCount');

        if (!grid) return;

        const keyword = filterText.toLowerCase().trim();
        const filteredList = State.plants.filter(p => 
            p.name.toLowerCase().includes(keyword) || 
            (p.desc && p.desc.toLowerCase().includes(keyword))
        );

        const totalAvailable = State.plants.filter(p => p.stock > 0 && p.isAvailable !== false).length;
        if (counterTotal) counterTotal.innerText = totalAvailable;
        if (counterSold) counterSold.innerText = State.orders.length;

        if (filteredList.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <i class="fa-solid fa-magnifying-glass text-4xl text-gray-300 mb-3"></i>
                    <p class="text-gray-500 font-medium">Không tìm thấy chậu cây cảnh phù hợp.</p>
                </div>`;
            return;
        }

        grid.innerHTML = filteredList.map(item => {
            const isSeller = State.isSeller(item.seller);
            const isOutOfStock = item.stock <= 0;
            const isHidden = item.isAvailable === false;

            const plantImg = (item.image && typeof item.image === 'string' && item.image.startsWith('http') && !item.image.includes('example.com')) 
                ? item.image 
                : DEFAULT_BONSAI_IMG;

            let actionButtonsHtml = '';

            if (isSeller) {
                actionButtonsHtml = `
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="UI.openEditPlantModal(${item.id})" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-sm">
                            <i class="fa-solid fa-pen-to-square"></i> Sửa cây
                        </button>
                        <button onclick="UI.togglePlantStatus(${item.id})" class="${isHidden ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-sm">
                            <i class="fa-solid ${isHidden ? 'fa-eye' : 'fa-eye-slash'}"></i> ${isHidden ? 'Mở bán' : 'Ẩn cây'}
                        </button>
                    </div>
                `;
            } else {
                if (isHidden) {
                    actionButtonsHtml = `<button disabled class="w-full bg-gray-200 text-gray-400 text-xs font-bold py-2.5 rounded-xl cursor-not-allowed">Đã Tạm Tắt Bán</button>`;
                } else if (isOutOfStock) {
                    actionButtonsHtml = `<button disabled class="w-full bg-gray-200 text-gray-400 text-xs font-bold py-2.5 rounded-xl cursor-not-allowed">Hết Hàng</button>`;
                } else {
                    actionButtonsHtml = `
                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="UI.buyNow(${item.id})" class="bg-[#173e33] hover:bg-emerald-900 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-sm">
                                <i class="fa-solid fa-bolt"></i> Mua Ngay
                            </button>
                            <button onclick="UI.addToCart(${item.id})" class="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-1 shadow-sm">
                                <i class="fa-solid fa-cart-plus"></i> Giỏ Hàng
                            </button>
                        </div>
                    `;
                }
            }

            return `
                <div class="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative flex flex-col justify-between ${isHidden ? 'opacity-60 bg-gray-50' : ''}">
                    <div>
                        <div class="flex items-center gap-1 absolute top-3 right-3 z-10">
                            ${isSeller ? '<span class="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">CỦA BẠN</span>' : ''}
                            ${isHidden ? 
                                '<span class="bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ĐÃ ẨN</span>' : 
                                (isOutOfStock ? '<span class="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">HẾT HÀNG</span>' : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border">Kho: ${item.stock}</span>`)}
                        </div>
                        
                        <img src="${plantImg}" 
                             alt="${item.name}" 
                             onerror="this.onerror=null; this.src='${DEFAULT_BONSAI_IMG}';" 
                             class="w-full h-48 object-cover rounded-xl mb-3 ${isOutOfStock || isHidden ? 'grayscale' : ''}">
                        
                        <h4 class="font-bold text-gray-800 text-base mb-1">${item.name}</h4>
                        <p class="text-xs text-gray-400 mb-2 line-clamp-2">${item.desc || 'Chưa có mô tả chi tiết'}</p>
                    </div>

                    <div class="border-t pt-3 mt-2">
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] text-gray-400 block">Ví bán: ${item.seller ? item.seller.substring(0, 6) + '...' : 'System'}</span>
                            <span class="text-emerald-700 font-black text-lg">${item.price} ETH</span>
                        </div>

                        ${actionButtonsHtml}
                    </div>
                </div>
            `;
        }).join('');
    },

    async buyNow(plantId) {
        if (!State.signer) {
            alert("Vui lòng kết nối ví MetaMask trước khi mua!");

            const connected = await Web3Manager.connect();
            if (!connected) return;

            await this.updateHeader();
            this.renderPlants();
        }

        const plant = State.plants.find(
            p => String(p.id) === String(plantId)
        );

        if (!plant || plant.stock <= 0) {
            return alert("Sản phẩm không có sẵn!");
        }

        if (State.isSeller(plant.seller)) {
            return alert("Bạn không thể tự mua cây của chính mình!");
        }

        try {
            const tx = await Web3Manager.buyPlantOnChain(
                plant.id,
                1,
                plant.price
            );

            alert(
                `Đã gửi giao dịch mua "${plant.name}".\n` +
                `Mã giao dịch: ${tx.hash}\n` +
                "Vui lòng chờ Blockchain xác nhận."
            );

            const receipt = await tx.wait();

            let orderId = null;

            for (const log of receipt.logs || []) {
                if (
                    !Web3Manager.contract ||
                    log.address.toLowerCase() !==
                    Web3Manager.contract.address.toLowerCase()
                ) continue;

                try {
                    const parsed =
                        Web3Manager.contract.interface.parseLog(log);

                    if (parsed.name === "OrderCreated") {
                        orderId = (
                            parsed.args.orderId ?? parsed.args[0]
                        ).toString();
                        break;
                    }
                } catch (error) {
                    // Bỏ qua log không thuộc sự kiện cần tìm
                }
            }

            if (orderId === null) {
                alert(
                    "Giao dịch đã được xác nhận nhưng không tìm thấy mã đơn hàng. " +
                    "Vui lòng kiểm tra lịch sử giao dịch trước khi mua lại."
                );
            } else {
                console.log("Đơn hàng được tạo:", orderId);
                alert(
                    `Mua hàng thành công!\nMã đơn hàng: #${orderId}\n` +
                    "ETH hiện đang được Smart Contract giữ ký quỹ, chưa chuyển trực tiếp cho người bán."
                );
            }

            const plants = await Web3Manager.fetchPlantsFromChain();

            if (plants && plants.length > 0) {
                State.plants = plants;
                State.savePlants();
            }

            await this.renderOrders();
            await this.updateHeader();
            this.renderPlants();

        } catch (error) {
            console.error("Lỗi mua cây:", error);

            alert(
                "Thanh toán không thành công: " +
                (error.reason || error.message)
            );
        }
    },

    async addToCart(plantId) {
        const plant = State.plants.find(p => p.id === plantId);
        if (!plant || plant.stock <= 0) return alert("Sản phẩm không có sẵn!");

        if (State.userAddress && State.isSeller(plant.seller)) {
            return alert("BẠN KHÔNG THỂ THÊM CÂY CỦA CHÍNH MÌNH VÀO GIỎ HÀNG!");
        }

        const cartItem = State.cart.find(c => c.id === plantId);
        if (cartItem) {
            if (cartItem.qty >= plant.stock) return alert(`Kho chỉ còn lại ${plant.stock} chậu!`);
            cartItem.qty += 1;
        } else {
            State.cart.push({ 
                id: plant.id, 
                name: plant.name, 
                price: plant.price, 
                image: plant.image, 
                qty: 1, 
                seller: plant.seller 
            });
        }

        State.saveCart();
        this.renderCart();
    },

    updateCartQty(plantId, delta) {
        const cartItem = State.cart.find(c => c.id === plantId);
        const plant = State.plants.find(p => p.id === plantId);
        if (!cartItem) return;

        cartItem.qty += delta;
        if (plant && cartItem.qty > plant.stock) {
            alert(`Kho chỉ còn lại ${plant.stock} chậu!`);
            cartItem.qty = plant.stock;
        }

        if (cartItem.qty <= 0) {
            State.cart = State.cart.filter(c => c.id !== plantId);
        }

        State.saveCart();
        this.renderCart();
    },

    removeFromCart(plantId) {
        State.cart = State.cart.filter(c => c.id !== plantId);
        State.saveCart();
        this.renderCart();
    },

    renderCart() {
        const container = document.getElementById('cartItemsContainer');
        const badge = document.getElementById('cartBadge');
        const totalText = document.getElementById('cartTotalEth');

        const totalItems = State.cart.reduce((sum, item) => sum + item.qty, 0);
        const totalEth = State.cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.qty), 0);

        if (badge) badge.innerText = totalItems;
        if (totalText) totalText.innerText = totalEth.toFixed(4) + " ETH";
        if (!container) return;

        if (State.cart.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">Giỏ hàng trống.</p>`;
            return;
        }

        container.innerHTML = State.cart.map(item => {
            const itemImg = (item.image && typeof item.image === 'string' && item.image.startsWith('http') && !item.image.includes('example.com')) 
                ? item.image 
                : DEFAULT_BONSAI_IMG;

            return `
                <div class="flex items-center justify-between bg-gray-50 p-3 rounded-xl border">
                    <div class="flex items-center gap-3">
                        <img src="${itemImg}" onerror="this.onerror=null; this.src='${DEFAULT_BONSAI_IMG}';" class="w-12 h-12 object-cover rounded-lg">
                        <div>
                            <h5 class="font-bold text-xs text-gray-800 line-clamp-1">${item.name}</h5>
                            <span class="text-xs text-emerald-700 font-bold">${item.price} ETH</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="UI.updateCartQty(${item.id}, -1)" class="w-6 h-6 bg-gray-200 text-gray-700 font-bold rounded flex items-center justify-center text-xs">-</button>
                        <span class="text-xs font-bold px-1">${item.qty}</span>
                        <button onclick="UI.updateCartQty(${item.id}, 1)" class="w-6 h-6 bg-gray-200 text-gray-700 font-bold rounded flex items-center justify-center text-xs">+</button>
                        <button onclick="UI.removeFromCart(${item.id})" class="text-red-500 hover:text-red-700 ml-2 text-xs"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');
    },

    openEditPlantModal(plantId) {
        const plant = State.plants.find(p => p.id === plantId);
        if (!plant) return;

        document.getElementById('modalPlantTitle').innerText = "Chỉnh Sửa Thông Tin Cây";
        document.getElementById('plantEditId').value = plant.id;
        document.getElementById('plantName').value = plant.name;
        document.getElementById('plantPrice').value = plant.price;
        document.getElementById('plantQuantity').value = plant.stock;
        document.getElementById('plantImage').value = plant.image;
        document.getElementById('plantDesc').value = plant.desc || "";

        this.openModal('addPlantModal');
    },

    async togglePlantStatus(plantId) {
        const plant = State.plants.find(p => p.id === plantId);
        if (!plant) return;

        try {
            const tx = await Web3Manager.togglePlantAvailabilityOnChain(plant.id);
            alert(`Đang đổi trạng thái cây On-Chain...\nTx Hash: ${tx.hash}`);
            await tx.wait();

            plant.isAvailable = !plant.isAvailable;
            State.savePlants();
            this.renderPlants();
            alert("Đã cập nhật trạng thái niêm yết cây thành công!");
        } catch (err) {
            console.error(err);
            alert("Lỗi ẩn/hiện cây: " + (err.reason || err.message));
        }
    },

    async orderAction(action, orderId) {
        if (!State.signer) {
            const connected = await Web3Manager.connect();
            if (!connected) return;
        }

        const actions = {
            cancel: {
                method: "cancelOrderOnChain",
                message: "Bạn có chắc chắn muốn hủy đơn hàng?"
            },
            delivered: {
                method: "markDeliveredOnChain",
                message: "Xác nhận đơn hàng đã được giao?"
            },
            received: {
                method: "confirmReceivedOnChain",
                message: "Xác nhận bạn đã nhận được cây?"
            },
            requestReturn: {
                method: "requestReturnOnChain",
                message: "Bạn muốn gửi yêu cầu trả hàng?"
            },
            approveReturn: {
                method: "approveReturnOnChain",
                message: "Bạn có đồng ý yêu cầu trả hàng?"
            },
            rejectReturn: {
                method: "rejectReturnOnChain",
                message: "Bạn có chắc chắn từ chối yêu cầu trả hàng?"
            },
            confirmReturned: {
                method: "confirmReturnedOnChain",
                message: "Xác nhận đã nhận lại cây được trả?"
            },
            autoRelease: {
                method: "autoReleaseOnChain",
                message: "Xác nhận giải ngân khoản thanh toán cho người bán?"
            }
        };

        const selected = actions[action];

        if (!selected) {
            alert("Thao tác không hợp lệ!");
            return;
        }

        if (!confirm(selected.message)) return;

        try {
            const method = Web3Manager[selected.method];

            if (typeof method !== "function") {
                throw new Error(
                    `Không tìm thấy hàm ${selected.method} trong web3.js`
                );
            }

            const tx = await method.call(Web3Manager, orderId);

            alert(
                "Đã gửi giao dịch lên Blockchain.\n" +
                "Vui lòng chờ xác nhận..."
            );

            await tx.wait();

            alert("Cập nhật đơn hàng thành công!");

            await this.renderOrders();

            const plants = await Web3Manager.fetchPlantsFromChain();

            if (plants && plants.length > 0) {
                State.plants = plants;
                State.savePlants();
            }

            this.renderPlants();
            this.renderCart();
            await this.updateHeader();

        } catch (error) {
            console.error("Lỗi xử lý đơn hàng:", error);

            alert(
                "Không thể thực hiện thao tác: " +
                (error.reason || error.message)
            );
        }
    },

    // Tự tìm hoặc khởi tạo vùng chứa đơn hàng bên trong #ordersModal nếu index.html chưa có #ordersContainer
    ensureOrdersContainer() {
        let container = document.getElementById("ordersContainer");
        if (container) return container;

        const modal = document.getElementById("ordersModal");
        if (!modal) return null;

        const modalBox = modal.querySelector(".bg-white") || modal.firstElementChild;
        if (!modalBox) return null;

        const header = modalBox.firstElementChild;
        container = document.createElement("div");
        container.id = "ordersContainer";
        container.className = "max-h-[70vh] overflow-y-auto pr-1";

        modalBox.innerHTML = "";
        if (header) modalBox.appendChild(header);
        modalBox.appendChild(container);

        return container;
    },

    async renderOrders() {
        const container = this.ensureOrdersContainer();
        if (!container) return;

        if (!State.userAddress && window.ethereum?.selectedAddress) {
            State.userAddress = window.ethereum.selectedAddress.toLowerCase();
        }

        if (!State.userAddress) {
            container.innerHTML = `
                <p class="text-center text-gray-400 py-8">
                    Vui lòng kết nối ví MetaMask để xem đơn hàng.
                </p>`;
            return;
        }

        container.innerHTML = `
            <div class="flex gap-2 border-b pb-3 mb-4">
                <button id="btnBuyerOrders"
                    class="flex-1 py-2 rounded-lg bg-emerald-800 text-white font-bold text-sm">
                    Đơn hàng đã mua
                </button>

                <button id="btnSellerOrders"
                    class="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm">
                    Đơn hàng đã bán
                </button>
            </div>

            <div id="buyerOrdersSection">
                <div id="buyerOrdersContainer">
                    <p class="text-center text-gray-400 py-6">Đang tải đơn mua từ Blockchain...</p>
                </div>
            </div>

            <div id="sellerOrdersSection" class="hidden">
                <div id="sellerOrdersContainer">
                    <p class="text-center text-gray-400 py-6">Đang tải đơn bán từ Blockchain...</p>
                </div>
            </div>
        `;

        const buyerTab = document.getElementById("btnBuyerOrders");
        const sellerTab = document.getElementById("btnSellerOrders");
        const buyerSection = document.getElementById("buyerOrdersSection");
        const sellerSection = document.getElementById("sellerOrdersSection");

        buyerTab.onclick = () => {
            buyerSection.classList.remove("hidden");
            sellerSection.classList.add("hidden");

            buyerTab.className =
                "flex-1 py-2 rounded-lg bg-emerald-800 text-white font-bold text-sm";
            sellerTab.className =
                "flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm";
        };

        sellerTab.onclick = () => {
            sellerSection.classList.remove("hidden");
            buyerSection.classList.add("hidden");

            sellerTab.className =
                "flex-1 py-2 rounded-lg bg-emerald-800 text-white font-bold text-sm";
            buyerTab.className =
                "flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 font-bold text-sm";
        };

        try {
            const [buyerItems, sellerItems] = await Promise.all([
                Web3Manager.getBuyerOrders(State.userAddress),
                Web3Manager.getSellerOrders(State.userAddress)
            ]);

            const normalizeOrders = async (items) => {
                const result = [];
                for (const item of (items || [])) {
                    if (item && typeof item === "object" && item.buyer) {
                        result.push(item);
                    } else {
                        const id = item?.toString ? item.toString() : item;
                        const order = await Web3Manager.getOrderOnChain(id);
                        if (order) result.push(order);
                    }
                }
                return result;
            };

            const [buyerOrders, sellerOrders] = await Promise.all([
                normalizeOrders(buyerItems),
                normalizeOrders(sellerItems)
            ]);

            State.orders = [...buyerOrders, ...sellerOrders];

            const statusInfo = {
                0: {
                    label: "Đã thanh toán (Chờ giao)",
                    color: "bg-blue-100 text-blue-800"
                },
                1: {
                    label: "Đang giao hàng",
                    color: "bg-amber-100 text-amber-800"
                },
                2: {
                    label: "Đang yêu cầu trả hàng",
                    color: "bg-orange-100 text-orange-800"
                },
                3: {
                    label: "Đã duyệt trả hàng",
                    color: "bg-purple-100 text-purple-800"
                },
                4: {
                    label: "Hoàn thành",
                    color: "bg-emerald-100 text-emerald-800"
                },
                5: {
                    label: "Đã hoàn tiền",
                    color: "bg-gray-200 text-gray-700"
                },
                6: {
                    label: "Đã hủy",
                    color: "bg-red-100 text-red-800"
                }
            };

            const shortAddress = (address) => {
                if (!address) return "Không xác định";
                return address.slice(0, 6) + "..." + address.slice(-4);
            };

            const renderOrderList = (orders, isBuyer) => {
                if (!orders || orders.length === 0) {
                    return `
                        <p class="text-center text-gray-400 py-8 text-sm">
                            ${isBuyer
                                ? "Chưa có đơn hàng đã mua."
                                : "Chưa có đơn hàng đã bán."}
                        </p>`;
                }

                return orders.map(order => {
                    const id = String(
                        order.orderId ?? order.id ?? order[0]
                    );

                    const status = Number(
                        order.status ?? order[7]
                    );

                    const buyer = order.buyer ?? order[2] ?? "";
                    const seller = order.seller ?? order[3] ?? "";

                    const quantity = Number(
                        order.quantity ?? order.qty ?? order[4] ?? 1
                    );

                    const amount = order.amount ?? order.totalEth ?? order[5] ?? "0";

                    const plantName =
                        order.plantName ||
                        order.name ||
                        `Sản phẩm #${order.plantId ?? order[1]}`;

                    const plantImage =
                        (order.plantImage && order.plantImage.startsWith("http"))
                            ? order.plantImage
                            : DEFAULT_BONSAI_IMG;

                    const deliveredAt = Number(
                        order.deliveredAt ?? order[6] ?? 0
                    );

                    const statusData = statusInfo[status] || {
                        label: "Không xác định",
                        color: "bg-gray-100 text-gray-700"
                    };

                    const deadline = deliveredAt + 7 * 24 * 60 * 60;
                    const canAutoRelease =
                        status === 1 &&
                        deliveredAt > 0 &&
                        Math.floor(Date.now() / 1000) >= deadline;

                    const actionButtons = [];

                    if (status === 0) {
                        actionButtons.push(`
                            <button onclick="UI.orderAction('cancel', '${id}')"
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Hủy đơn hàng
                            </button>
                        `);

                        if (!isBuyer) {
                            actionButtons.push(`
                                <button onclick="UI.orderAction('delivered', '${id}')"
                                    class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                    Xác nhận giao hàng
                                </button>
                            `);
                        }
                    }

                    if (status === 1 && isBuyer) {
                        actionButtons.push(`
                            <button onclick="UI.orderAction('received', '${id}')"
                                class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Đã nhận cây
                            </button>

                            <button onclick="UI.orderAction('requestReturn', '${id}')"
                                class="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Yêu cầu trả hàng
                            </button>
                        `);
                    }

                    if (canAutoRelease) {
                        actionButtons.push(`
                            <button onclick="UI.orderAction('autoRelease', '${id}')"
                                class="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Giải ngân cho người bán
                            </button>
                        `);
                    }

                    if (status === 2 && !isBuyer) {
                        actionButtons.push(`
                            <button onclick="UI.orderAction('approveReturn', '${id}')"
                                class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Đồng ý trả hàng
                            </button>

                            <button onclick="UI.orderAction('rejectReturn', '${id}')"
                                class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Từ chối trả hàng
                            </button>
                        `);
                    }

                    if (status === 3 && !isBuyer) {
                        actionButtons.push(`
                            <button onclick="UI.orderAction('confirmReturned', '${id}')"
                                class="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                Xác nhận đã nhận lại cây
                            </button>
                        `);
                    }

                    const explorerUrl =
                        `https://sepolia.etherscan.io/address/${seller}`;

                    return `
                        <div class="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3 space-y-3">

                            <div class="flex justify-between items-start gap-2 border-b pb-3">
                                <div>
                                    <p class="font-bold text-emerald-900 text-sm">
                                        Đơn hàng #${id}
                                    </p>
                                    <p class="text-xs text-gray-400">
                                        ${isBuyer ? "Đơn mua" : "Đơn bán"}
                                    </p>
                                </div>

                                <span class="${statusData.color} px-2 py-1 rounded-lg text-[10px] font-bold">
                                    ${statusData.label}
                                </span>
                            </div>

                            <div class="flex gap-3 items-center">
                                <img src="${plantImage}"
                                    onerror="this.onerror=null;this.src='${DEFAULT_BONSAI_IMG}'"
                                    class="w-16 h-16 object-cover rounded-lg">

                                <div class="flex-1">
                                    <p class="font-bold text-sm text-gray-800">
                                        ${plantName}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        Số lượng: ${quantity}
                                    </p>
                                    <p class="font-bold text-emerald-700 text-sm">
                                        ${amount} ETH
                                    </p>
                                </div>
                            </div>

                            <div class="bg-white border rounded-lg p-3 text-xs space-y-2">
                                <p>
                                    <b>Người mua:</b>
                                    <span class="font-mono">${shortAddress(buyer)}</span>
                                </p>

                                <p>
                                    <b>Người bán:</b>
                                    <span class="font-mono">${shortAddress(seller)}</span>
                                </p>

                                ${status === 1 && deliveredAt > 0 ? `
                                    <p class="text-gray-500">
                                        Hạn xác nhận:
                                        ${new Date(deadline * 1000).toLocaleString("vi-VN")}
                                    </p>
                                ` : ""}
                            </div>

                            ${actionButtons.length > 0 ? `
                                <div class="flex flex-wrap gap-2 pt-1">
                                    ${actionButtons.join("")}
                                </div>
                            ` : ""}

                            <a href="${explorerUrl}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-emerald-700 underline text-xs inline-block">
                                Xem địa chỉ người bán trên Sepolia Etherscan
                            </a>
                        </div>
                    `;
                }).join("");
            };

            document.getElementById("buyerOrdersContainer").innerHTML =
                renderOrderList(buyerOrders, true);

            document.getElementById("sellerOrdersContainer").innerHTML =
                renderOrderList(sellerOrders, false);

        } catch (error) {
            console.error("Lỗi tải lịch sử đơn hàng:", error);

            const buyerContainer =
                document.getElementById("buyerOrdersContainer");

            if (buyerContainer) {
                buyerContainer.innerHTML = `
                    <p class="text-center text-red-500 py-6 text-sm">
                        Không thể tải lịch sử đơn hàng.
                        Vui lòng kiểm tra kết nối ví, ABI và Smart Contract.
                    </p>`;
            }
        }
    }
};
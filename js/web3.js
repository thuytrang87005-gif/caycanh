const Web3Manager = {
    contract: null,

    // =====================================
    // 1. HELPER
    // =====================================

    loadAbi() {
        return window.CONFIG?.CONTRACT_ABI || [];
    },

    getProvider() {
        if (!window.ethereum) {
            throw new Error("Chưa tìm thấy MetaMask!");
        }

        if (ethers.BrowserProvider) {
            return new ethers.BrowserProvider(window.ethereum);
        }

        return new ethers.providers.Web3Provider(window.ethereum);
    },

    parseEther(value) {
        return ethers.parseEther
            ? ethers.parseEther(String(value))
            : ethers.utils.parseEther(String(value));
    },

    formatEther(value) {
        return ethers.formatEther
            ? ethers.formatEther(value)
            : ethers.utils.formatEther(value);
    },

    toNumber(value) {
        return Number(value?.toString?.() ?? value ?? 0);
    },

    getField(tuple, name, index) {
        return tuple[name] !== undefined ? tuple[name] : tuple[index];
    },

    async waitTransaction(tx) {
        await tx.wait();
        return tx;
    },

    // =====================================
    // 2. KET NOI SMART CONTRACT
    // =====================================

    async connect() {
        if (!window.ethereum) {
            alert("Vui lòng cài đặt MetaMask!");
            return false;
        }

        try {
            if (typeof loadConfig === "function") {
                await loadConfig();
            }

            const address = window.CONFIG?.CONTRACT_ADDRESS;
            const abi = this.loadAbi();

            if (!address || !address.startsWith("0x") || address.length !== 42) {
                throw new Error("Địa chỉ Smart Contract không hợp lệ!");
            }

            if (!abi.length) {
                throw new Error("ABI chưa được tải!");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });

            if (!accounts.length) {
                throw new Error("Không tìm thấy tài khoản MetaMask!");
            }

            State.userAddress = accounts[0].toLowerCase();

            State.provider = this.getProvider();
            State.signer = await State.provider.getSigner();

            this.contract = new ethers.Contract(
                address,
                abi,
                State.signer
            );

            console.log("Đã kết nối Smart Contract:", address);
            console.log("Ví hiện tại:", State.userAddress);

            return true;

        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Lỗi kết nối: " + (error.reason || error.message));
            return false;
        }
    },

    async getReadContract() {
        if (this.contract) {
            return this.contract;
        }

        if (typeof loadConfig === "function") {
            await loadConfig();
        }

        const address = window.CONFIG?.CONTRACT_ADDRESS;
        const abi = this.loadAbi();

        if (!address || !abi.length) {
            throw new Error("Thiếu địa chỉ Contract hoặc ABI!");
        }

        const provider = this.getProvider();

        this.contract = new ethers.Contract(
            address,
            abi,
            provider
        );

        return this.contract;
    },

    getWriteContract() {
        if (!this.contract || !State.signer) {
            throw new Error("Vui lòng kết nối MetaMask trước!");
        }

        return this.contract;
    },

    // =====================================
    // 3. SO DU VI
    // =====================================

    async getBalance() {
        if (!State.provider || !State.userAddress) return "0";

        try {
            const balance = await State.provider.getBalance(
                State.userAddress
            );

            return Number(this.formatEther(balance)).toFixed(4);

        } catch (error) {
            console.error("Lỗi đọc số dư:", error);
            return "0";
        }
    },

    // =====================================
    // 4. QUAN LY SAN PHAM
    // =====================================

    async listPlantOnChain(name, image, desc, priceEth, stock) {
        const contract = this.getWriteContract();

        return await contract.listPlant(
            name,
            image,
            desc,
            this.parseEther(priceEth),
            stock
        );
    },

    async buyPlantOnChain(plantId, quantity, totalEth) {
        const contract = this.getWriteContract();

        return await contract.buyPlant(
            plantId,
            quantity,
            {
                value: this.parseEther(totalEth)
            }
        );
    },

    async updatePlantOnChain(
        plantId,
        name,
        image,
        desc,
        priceEth,
        stock
    ) {
        const contract = this.getWriteContract();

        return await contract.updatePlant(
            plantId,
            name,
            image,
            desc,
            this.parseEther(priceEth),
            stock
        );
    },

    async togglePlantAvailabilityOnChain(plantId) {
        const contract = this.getWriteContract();

        return await contract.togglePlantAvailability(plantId);
    },

    // =====================================
    // 5. LAY DANH SACH SAN PHAM
    // =====================================

    async fetchPlantsFromChain() {
        try {
            const contract = await this.getReadContract();

            const count = this.toNumber(
                await contract.plantCount()
            );

            const plants = [];

            for (let i = 1; i <= count; i++) {
                const p = await contract.plants(i);

                plants.push({
                    id: this.toNumber(this.getField(p, "id", 0)),
                    seller: this.getField(p, "seller", 1),
                    name: this.getField(p, "name", 2),
                    image: this.getField(p, "image", 3),
                    desc: this.getField(p, "desc", 4),
                    price: this.formatEther(
                        this.getField(p, "price", 5)
                    ),
                    stock: this.toNumber(
                        this.getField(p, "stock", 6)
                    ),
                    soldCount: this.toNumber(
                        this.getField(p, "soldCount", 7)
                    ),
                    isAvailable: this.getField(p, "isAvailable", 8)
                });
            }

            return plants;

        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
            return [];
        }
    },

    // =====================================
    // 6. LAY THONG TIN MOT DON HANG
    // =====================================

    async getOrderOnChain(orderId) {
        const contract = await this.getReadContract();

        const o = await contract.orders(orderId);

        const plantId = this.toNumber(
            this.getField(o, "plantId", 1)
        );

        const plant = await contract.plants(plantId);

        const statusNumber = this.toNumber(
            this.getField(o, "status", 7)
        );

        const statusNames = [
            "PAID",
            "DELIVERED",
            "RETURN_REQUESTED",
            "RETURN_APPROVED",
            "COMPLETED",
            "REFUNDED",
            "CANCELLED"
        ];

        return {
            orderId: this.toNumber(
                this.getField(o, "orderId", 0)
            ),

            plantId,

            buyer: this.getField(o, "buyer", 2),
            seller: this.getField(o, "seller", 3),

            quantity: this.toNumber(
                this.getField(o, "quantity", 4)
            ),

            amount: this.formatEther(
                this.getField(o, "amount", 5)
            ),

            deliveredAt: this.toNumber(
                this.getField(o, "deliveredAt", 6)
            ),

            status: statusNumber,
            statusName: statusNames[statusNumber] || "UNKNOWN",

            returnRequestUsed: this.getField(o, "returnRequestUsed", 8),

            plantName: this.getField(plant, "name", 2),
            plantImage: this.getField(plant, "image", 3)
        };
    },

    // Hàm dự phòng: quét toàn bộ đơn hàng trên Contract nếu ABI thiếu getBuyerOrders/getSellerOrders
    async scanAllOrdersForAddress(address, role) {
        const contract = await this.getReadContract();
        const total = this.toNumber(await contract.orderCount());
        const target = address.toLowerCase();
        const matched = [];

        for (let i = 1; i <= total; i++) {
            const order = await this.getOrderOnChain(i);
            const party = role === "buyer" ? order.buyer : order.seller;
            if (party && party.toLowerCase() === target) {
                matched.push(order);
            }
        }

        return matched.reverse();
    },

    // =====================================
    // 7. LAY DANH SACH DON MUA
    // =====================================

    async getBuyerOrders(address) {
        const contract = await this.getReadContract();

        try {
            const ids = await contract.getBuyerOrders(address);
            const orders = [];

            for (const id of ids) {
                const order = await this.getOrderOnChain(
                    this.toNumber(id)
                );
                orders.push(order);
            }

            return orders.reverse();
        } catch (err) {
            console.warn("Chuyển sang quét đơn mua trực tiếp từ orderCount:", err.message);
            return await this.scanAllOrdersForAddress(address, "buyer");
        }
    },

    // =====================================
    // 8. LAY DANH SACH DON BAN
    // =====================================

    async getSellerOrders(address) {
        const contract = await this.getReadContract();

        try {
            const ids = await contract.getSellerOrders(address);
            const orders = [];

            for (const id of ids) {
                const order = await this.getOrderOnChain(
                    this.toNumber(id)
                );
                orders.push(order);
            }

            return orders.reverse();
        } catch (err) {
            console.warn("Chuyển sang quét đơn bán trực tiếp từ orderCount:", err.message);
            return await this.scanAllOrdersForAddress(address, "seller");
        }
    },

    // =====================================
    // 9. LAY CA DON MUA VA DON BAN
    // =====================================

    async getMyOrders() {
        if (!State.userAddress) {
            throw new Error("Vui lòng kết nối ví!");
        }

        const address = State.userAddress;

        const [buyerOrders, sellerOrders] = await Promise.all([
            this.getBuyerOrders(address),
            this.getSellerOrders(address)
        ]);

        return {
            buyerOrders,
            sellerOrders
        };
    },

    // =====================================
    // 10. CAC THAO TAC DON HANG
    // =====================================

    async cancelOrderOnChain(orderId) {
        return await this.getWriteContract().cancelOrder(orderId);
    },

    async markDeliveredOnChain(orderId) {
        return await this.getWriteContract().markDelivered(orderId);
    },

    async confirmReceivedOnChain(orderId) {
        return await this.getWriteContract().confirmReceived(orderId);
    },

    async requestReturnOnChain(orderId) {
        return await this.getWriteContract().requestReturn(orderId);
    },

    async approveReturnOnChain(orderId) {
        return await this.getWriteContract().approveReturn(orderId);
    },

    async rejectReturnOnChain(orderId) {
        return await this.getWriteContract().rejectReturn(orderId);
    },

    async confirmReturnedOnChain(orderId) {
        return await this.getWriteContract().confirmReturned(orderId);
    },

    async autoReleaseOnChain(orderId) {
        return await this.getWriteContract().autoRelease(orderId);
    }
};
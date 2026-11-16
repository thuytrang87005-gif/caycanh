// Kiểm tra quyền sở hữu sản phẩm dựa theo ví đang đăng nhập

const State = {
    userAddress: null,
    provider: null,
    signer: null,

    // Sử dụng optional chaining (?.) và key mặc định để tránh lỗi khi nạp file
    plants: JSON.parse(localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.PLANTS || 'bonsai_plants')) || [],
    cart: JSON.parse(localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.CART || 'bonsai_cart')) || [],
    orders: JSON.parse(localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.ORDERS || 'bonsai_orders')) || [],

    // Kiểm tra ví hiện tại có phải là người bán của sản phẩm này không
    isSeller(sellerAddress) {
        if (!this.userAddress || !sellerAddress) return false;
        return this.userAddress.toLowerCase() === sellerAddress.toLowerCase();
    },

    savePlants() {
        const key = window.CONFIG?.STORAGE_KEYS?.PLANTS || 'bonsai_plants';
        localStorage.setItem(key, JSON.stringify(this.plants));
    },

    saveCart() {
        const key = window.CONFIG?.STORAGE_KEYS?.CART || 'bonsai_cart';
        localStorage.setItem(key, JSON.stringify(this.cart));
    },

    saveOrders() {
        const key = window.CONFIG?.STORAGE_KEYS?.ORDERS || 'bonsai_orders';
        localStorage.setItem(key, JSON.stringify(this.orders));
    }
};
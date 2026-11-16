window.CONFIG = {
    CONTRACT_ADDRESS: "0x4E1cca6D4136853DD8A21E7f7f4667Fc37BbA4D2", 
    CONTRACT_ABI: [],
    STORAGE_KEYS: {
        PLANTS: 'bonsai_plants',
        CART: 'bonsai_cart',
        ORDERS: 'bonsai_orders'
    }
};

async function loadConfig() {
    // 1. Đọc địa chỉ từ env.json 
    try {
        const jsonRes = await fetch('env.json');
        if (jsonRes.ok) {
            const data = await jsonRes.json();
            if (data.CONTRACT_ADDRESS && data.CONTRACT_ADDRESS.startsWith("0x")) {
                window.CONFIG.CONTRACT_ADDRESS = data.CONTRACT_ADDRESS;
            }
        }
    } catch (e) {
        console.warn("Chưa nạp được env.json, thử đọc .env...");
    }

    // 2. Dự phòng: Đọc từ .env
    if (!window.CONFIG.CONTRACT_ADDRESS) {
        try {
            const envRes = await fetch('.env');
            if (envRes.ok) {
                const text = await envRes.text();
                const match = text.match(/CONTRACT_ADDRESS\s*=\s*["']?(0x[a-fA-F0-9]{40})["']?/i);
                if (match && match[1]) {
                    window.CONFIG.CONTRACT_ADDRESS = match[1];
                }
            }
        } catch (e) {
            // Live Server chặn đọc .env
        }
    }

    // 3. Đọc ABI từ js/bonsai_marketplace.json
    try {
        const abiRes = await fetch('js/bonsai_marketplace.json');
        if (abiRes.ok) {
            const abiData = await abiRes.json();
            window.CONFIG.CONTRACT_ABI = abiData.abi ? abiData.abi : abiData;
        }
    } catch (err) {
        console.error("Lỗi đọc file ABI JSON:", err);
    }

    if (window.CONFIG.CONTRACT_ADDRESS) {
        console.log(">> Nạp cấu hình thành công! Smart Contract Address:", window.CONFIG.CONTRACT_ADDRESS);
    } else {
        console.warn(">> Cảnh báo: Chưa tìm thấy CONTRACT_ADDRESS trong env.json hoặc .env");
    }

    return true;
}

const loadEnvConfig = loadConfig;
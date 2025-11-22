# 🚀 SAFROCHAIN FAUCET BOT BY 0xNyilzz

Multi-Wallet Cosmos Address Generator dengan Proxy Rotation, Auto-Faucet Claim, dan Auto-Transfer

## 📌 Overview

Bot ini dirancang untuk mengautomasi proses testing di Safrochain testnet dengan fitur:

- ✅ Generate Multiple Wallets
- ✅ Proxy Rotation
- ✅ Auto Faucet Claim
- ✅ Auto Transfer To Destination Address

## 📋 Configuration

1. **PROXY HTTP (WAJIB!)**
- Buat file **proxy.txt**
```javascript
  http://user:password@proxy1.example.com:8080
  http://user:password@proxy2.example.com:8080
```

2. **CONFIGURE**
```bash
nano faucet-bot.js
```

3. **TARGET ADDRESS** (untuk auto-transfer)
```javascript
TRANSFER.TARGET_ADDRESS: 'addr_safroxxxxxxx'
TRANSFER.AMOUNT: '1000000' // Untuk 1 SAF (konversi 1jt usaf)
```

4. **WORKERS** (jumlah wallet)
```javascript
WORKER.COUNT: xxxx // Jumlah worker yg diinginkan
```

## 🚀 Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Bot
```bash
npm start
```


## 📁 Output Files

```
wallets/
├── phrase.txt      # Mnemonik (address|mnemonic)
└── pk.txt          # Public key (address|pubkey)
```

## 🔐 Security

```bash
# Backup wallets
cp -r wallets/ wallets_backup_$(date +%Y%m%d)
```

## 📞 Support

- **Docs**: https://docs.safrochain.com
- **Explorer**: https://explorer.testnet.safrochain.com

## 📝 License

MIT License

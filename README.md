# 🚀 SAFROCHAIN FAUCET BOT v1.0

Multi-Wallet Cosmos Address Generator dengan HTTPS Proxy Rotation, Auto-Faucet Claim, dan Auto-Transfer

## 📌 Overview

Bot ini dirancang untuk mengautomasi proses testing di Safrochain testnet dengan fitur:

- ✅ Generate Multiple Wallets
- ✅ Proxy HTTPS Rotation
- ✅ Auto Faucet Claim
- ✅ Auto Transfer
- ✅ Data Persistence
- ✅ Error Handling
- ✅ Logging

## 🚀 Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure
\`\`\`bash
cp config.example.js config.js
nano config.js
\`\`\`

### 3. Run Bot
\`\`\`bash
npm start
\`\`\`

## 📋 Configuration

Edit \`config.js\` dan update:

1. **PROXY HTTPS** (WAJIB!)
\`\`\`javascript
PROXY.URLS: [
  'https://user:password@proxy1.example.com:8080',
  'https://user:password@proxy2.example.com:8080',
]
\`\`\`

2. **TARGET ADDRESS** (untuk auto-transfer)
\`\`\`javascript
TRANSFER.TARGET_ADDRESS: 'addr_safro1xxxxxx'
TRANSFER.AMOUNT: '1000000'
\`\`\`

3. **WORKERS** (jumlah wallet)
\`\`\`javascript
WORKER.COUNT: 3
\`\`\`

## 📁 Output Files

\`\`\`
wallets/
├── phrase.txt       # Mnemonik (address|mnemonic)
└── pk.txt          # Public key (address|pubkey)
\`\`\`

## 🔐 Security

```bash
# Backup wallets
cp -r wallets/ wallets_backup_$(date +%Y%m%d)

# Don't commit sensitive files
git check-ignore -v wallets/
git check-ignore -v config.js
```

## 📞 Support

- **Docs**: https://docs.safrochain.com
- **Faucet**: https://faucet.testnet.safrochain.com
- **Explorer**: https://explorer.testnet.safrochain.com

## 📝 License

MIT License

---

**Made for Safrochain Community** ❤️

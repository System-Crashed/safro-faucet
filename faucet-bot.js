const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const dns = require('dns');
const axios = require('axios');
const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { SigningStargateClient, calculateFee, GasPrice } = require('@cosmjs/stargate');

const execAsync = promisify(exec);
const dnsLookup = promisify(dns.lookup);

// ===== LOAD PROXIES FROM FILE =====
function loadProxiesFromFile() {
  try {
    const proxyFilePath = path.join(__dirname, 'proxy.txt');

    if (!fs.existsSync(proxyFilePath)) {
      console.warn('⚠️  proxy.txt not found. Creating template...');
      const template = `# Add your proxies here, one per line
# Format: http://user:pass@proxy:port OR https://user:pass@proxy:port
# Examples:
# http://user:password@proxy1.example.com:8080
# http://user:password@proxy2.example.com:8080
# https://user:password@proxy3.example.com:8080
`;
      fs.writeFileSync(proxyFilePath, template);
      console.log('✅ Created proxy.txt template');
      return [];
    }

    // Read proxies from file
    const content = fs.readFileSync(proxyFilePath, 'utf8');
    const proxies = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Remove empty lines and comments

    return proxies;
  } catch (error) {
    console.error('❌ Error loading proxies:', error.message);
    return [];
  }
}

// ===== RESOLVE PROXY IP =====
async function resolveProxyIp(proxyUrl) {
  try {
    // Extract hostname from proxy URL
    // Format: http://user:pass@host:port or https://user:pass@host:port
    const match = proxyUrl.match(/@([^:]+):/);
    if (!match) {
      return proxyUrl; // Return as-is if can't parse
    }

    const hostname = match[1];

    // Try to resolve DNS
    try {
      const { address } = await dnsLookup(hostname);
      return address; // Return IP address
    } catch (dnsError) {
      // If DNS fails, return hostname
      return hostname;
    }
  } catch (error) {
    console.warn('⚠️ Could not resolve proxy IP:', error.message);
    return proxyUrl;
  }
}

// ===== CONFIG =====
const CONFIG = {
  FAUCET_URL: 'https://faucetapi.safrochain.com/api/transaction',
  RPC_ENDPOINT: 'https://rpc.testnet.safrochain.com',
  REST_ENDPOINT: 'https://rest.testnet.safrochain.com',
  CHAIN_ID: 'safro-testnet-1',
  ADDRESS_PREFIX: 'addr_safro',

  // Load proxies from file
  PROXIES: loadProxiesFromFile(),

  WALLETS_DIR: './wallets',
  PHRASES_FILE: 'phrase.txt',
  PRIVATE_KEYS_FILE: 'pk.txt',

  WORKERS: 3,
  FAUCET_COOLDOWN: 43200000,

  TARGET_ADDRESS: 'addr_safroxxxxxxx',
  TRANSFER_AMOUNT: '1000000',

  // Timing configs to prevent sequence mismatch
  CLAIM_WAIT: 20000,        // Wait 20s after claim
  TRANSFER_WAIT: 15000,     // Wait 15s before transfer
  COOLDOWN: 45000,          // Cooldown between cycles
  RETRY_DELAY: 40000,       // Retry delay
};

// ===== UTILITIES =====

async function generateCosmosAddress(addressIndex = 0) {
  try {
    const mnemonic = await DirectSecp256k1HdWallet.generate(24);
    const mnemonicString = mnemonic.secret.data;

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
      mnemonicString,
      {
        prefix: CONFIG.ADDRESS_PREFIX,
      }
    );

    const accounts = await wallet.getAccounts();
    const address = accounts[0].address;
    const publicKey = accounts[0].pubkey;

    return {
      address,
      mnemonic: mnemonicString,
      publicKey: Buffer.from(publicKey).toString('base64'),
    };
  } catch (error) {
    console.error('❌ Error generating address:', error.message);
    throw error;
  }
}

function saveWalletData(address, mnemonic, publicKey) {
  try {
    const phraseEntry = `${address}|${mnemonic}\n`;
    fs.appendFileSync(path.join(CONFIG.WALLETS_DIR, CONFIG.PHRASES_FILE), phraseEntry);

    const pkEntry = `${address}|${publicKey}\n`;
    fs.appendFileSync(path.join(CONFIG.WALLETS_DIR, CONFIG.PRIVATE_KEYS_FILE), pkEntry);

    console.log(`✅ Wallet data saved for ${address}`);
  } catch (error) {
    console.error('❌ Error saving wallet data:', error.message);
  }
}

function getRandomProxy() {
  if (CONFIG.PROXIES.length === 0) {
    return null;
  }
  return CONFIG.PROXIES[Math.floor(Math.random() * CONFIG.PROXIES.length)];
}

// FIXED : Sequence
async function claimFaucet(address) {
  const MAX_RETRIES = 3;
  let delay = 30000, attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // --- Faucet Claim ---
      let curlCommand = `curl -X POST ${CONFIG.FAUCET_URL} -H "Content-Type: application/json" -d '{"receiver":"${address}"}'`;

      if (CONFIG.PROXIES.length) {
        const proxy = getRandomProxy();
        curlCommand = `curl -x ${proxy} -X POST ${CONFIG.FAUCET_URL} -H "Content-Type: application/json" -d '{"receiver":"${address}"}'`;
        const proxyIp = await resolveProxyIp(proxy);
        console.log(`🔄 Menggunakan proxy: ${proxyIp}`);
      }

      console.log(`📡 Claiming faucet untuk ${address} (attempt ${attempt + 1})...`);
      const { stdout, stderr } = await execAsync(curlCommand, { maxBuffer: 10 * 1024 * 1024, timeout: 30000 });

      if (stderr && !stderr.includes('%')) console.warn('⚠️ Curl warning:', stderr);

      const response = JSON.parse(stdout);

      if (response.success || response.transactionHash) {
        console.log(`✅ Faucet claimed successfully!`);
        return true;
      } else if ((response.error || '').includes('account sequence mismatch') || (response.error || '').includes('mismatch')) {
        attempt++;
        console.log(`❌ Sequence mismatch. Waiting ${delay / 1000}s then retrying (attempt ${attempt + 1})...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      } else {
        console.log(`⚠️ Faucet claim response:`, response);
        return false;
      }
    } catch (error) {
      if ((error.message || '').includes('sequence') || (error.message || '').includes('mismatch')) {
        attempt++;
        console.log(`❌ Sequence mismatch. Waiting ${delay / 1000}s then retrying (attempt ${attempt + 1})...`);
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        console.error(`❌ Error claiming faucet:`, error.message);
        return false;
      }
    }
  }
  console.error("❌ Faucet claim ultimately failed after retries.");
  return false;
}

// FIXED: Retry logic with sequence mismatch handling
async function transferTokens(fromMnemonic, toAddress, amount) {
  const MAX_RETRIES = 10;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`💸 Attempt ${attempt}/${MAX_RETRIES}: Transferring ${amount} usaf...`);

      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(
        fromMnemonic,
        { prefix: CONFIG.ADDRESS_PREFIX }
      );

      const accounts = await wallet.getAccounts();
      const fromAddress = accounts[0].address;

      const client = await SigningStargateClient.connectWithSigner(
        CONFIG.RPC_ENDPOINT,
        wallet
      );

      // FIXED: Fetch fresh account sequence to prevent mismatch
      const account = await client.getAccount(fromAddress);
      const sequence = account?.sequence || 0;
      console.log(`📝 Account sequence: ${sequence}`);

      const gasPriceValue = GasPrice.fromString('0.1usaf');
      const gasEstimate = 150000; // FIXED: Increased from 100000
      const fee = calculateFee(gasEstimate, gasPriceValue);

      const msgSend = {
        typeUrl: '/cosmos.bank.v1beta1.MsgSend',
        value: {
          fromAddress: fromAddress,
          toAddress: toAddress,
          amount: [
            {
              denom: 'usaf',
              amount: amount,
            },
          ],
        },
      };

      const result = await client.signAndBroadcast(fromAddress, [msgSend], fee);

      if (result.code === 0) {
        console.log(`✅ Transfer successful! Tx Hash: ${result.transactionHash}`);
        return true;
      } else if (result.code === 32 && attempt < MAX_RETRIES) {
        // Code 32 = account sequence mismatch, retry with backoff
        console.error(`❌ Sequence mismatch, retrying...`);
        const waitTime = attempt * CONFIG.RETRY_DELAY;
        console.log(`⏳ Waiting ${waitTime/1000}s before retry ${attempt+1}...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      } else {
        console.error(`❌ Transfer failed with code: ${result.code}`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error attempt ${attempt}:`, error.message);
      if (attempt < MAX_RETRIES && (error.message.includes('sequence') || error.message.includes('mismatch'))) {
        const waitTime = attempt * CONFIG.RETRY_DELAY;
        console.log(`⏳ Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (attempt === MAX_RETRIES) {
        throw error;
      }
    }
  }

  return false;
}

async function faucetWorker(workerId) {
  try {
    console.log(`\n🤖 Worker #${workerId} started...`);

    for (let i = 0; i < CONFIG.WORKERS; i++) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🔄 Cycle ${i + 1}/${CONFIG.WORKERS} untuk Worker #${workerId}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      console.log(`\n  ⃣ Generating new Cosmos address...`);
      const walletData = await generateCosmosAddress(i);
      console.log(`✅ Address generated: ${walletData.address}`);

      console.log(`\n  ⃣ Saving wallet data...`);
      saveWalletData(walletData.address, walletData.mnemonic, walletData.publicKey);

      console.log(`\n  ⃣ Claiming faucet...`);
      const claimSuccess = await claimFaucet(walletData.address);

      if (!claimSuccess) {
        console.warn(`⚠️ Faucet claim failed untuk ${walletData.address}`);
      } else {
        console.log(`⏳ Waiting ${CONFIG.CLAIM_WAIT/1000}s for faucet to process...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.CLAIM_WAIT));

        if (CONFIG.TARGET_ADDRESS && CONFIG.TARGET_ADDRESS !== 'addr_safro1...') {
          console.log(`\n  ⃣ Transferring tokens to target address...`);
          console.log(`⏳ Waiting ${CONFIG.TRANSFER_WAIT/1000}s untuk blockchain confirmation...`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.TRANSFER_WAIT));

          await transferTokens(walletData.mnemonic, CONFIG.TARGET_ADDRESS, CONFIG.TRANSFER_AMOUNT);
        }
      }

      if (i < CONFIG.WORKERS - 1) {
        console.log(`\n⏳ Cooldown ${CONFIG.COOLDOWN/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.COOLDOWN));
      }
    }

    console.log(`\n✅ Worker #${workerId} completed all cycles!`);
  } catch (error) {
    console.error(`❌ Worker #${workerId} error:`, error.message);
  }
}

async function init() {
  try {
    console.log(`
╔══════════════════════════════════════════════════════╗
║   🚀 SAFROCHAIN FAUCET BOT - BY 0xNyilzz              ║
║   Proxy Rotation | Auto Claim | Auto Transfer	         ║
╚══════════════════════════════════════════════════════╝
    `);

    if (!fs.existsSync(CONFIG.WALLETS_DIR)) {
      fs.mkdirSync(CONFIG.WALLETS_DIR, { recursive: true });
      console.log(`📁 Created wallets directory`);
    }

    const phrasePath = path.join(CONFIG.WALLETS_DIR, CONFIG.PHRASES_FILE);
    const pkPath = path.join(CONFIG.WALLETS_DIR, CONFIG.PRIVATE_KEYS_FILE);

    if (!fs.existsSync(phrasePath)) {
      fs.writeFileSync(phrasePath, '# Mnemonic phrases (address|mnemonic)\n');
    }
    if (!fs.existsSync(pkPath)) {
      fs.writeFileSync(pkPath, '# Public keys (address|publickey)\n');
    }

    console.log(`\n⚙️ Configuration:`);
    console.log(`  • Faucet: ${CONFIG.FAUCET_URL}`);
    console.log(`  • Chain: ${CONFIG.CHAIN_ID}`);
    console.log(`  • Workers: ${CONFIG.WORKERS}`);
    console.log(`  • Proxies: ${CONFIG.PROXIES.length} configured`);
    console.log(`  • Target: ${CONFIG.TARGET_ADDRESS}`);
    console.log(`  • Transfer wait: ${CONFIG.TRANSFER_WAIT/1000}s`);

    if (CONFIG.PROXIES.length === 0) {
      console.log(`\n⚠️  No proxies loaded! Add proxies to proxy.txt`);
    }

    await faucetWorker(1);

  } catch (error) {
    console.error(`❌ Fatal error:`, error);
  }
}

if (require.main === module) {
  init().catch(console.error);
}

module.exports = {
  generateCosmosAddress,
  claimFaucet,
  transferTokens,
  faucetWorker,
};

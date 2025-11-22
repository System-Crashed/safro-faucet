#!/usr/bin/env node

const axios = require('axios');
const readline = require('readline');

const REST_ENDPOINT = 'https://rest.testnet.safrochain.com';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function checkBalance(address) {
  try {
    console.log(`\n🔍 Checking balance for: ${address}\n`);

    const response = await axios.get(
      `${REST_ENDPOINT}/cosmos/bank/v1beta1/balances/${address}`,
      { timeout: 10000 }
    );

    const balances = response.data.balances || [];

    if (balances.length === 0) {
      console.log(`⚠️  No tokens found.\n`);
      return;
    }

    console.log(`✅ Balance Information:\n`);
    console.log(`┌─ Balances ─────────────────┐`);

    balances.forEach((balance) => {
      const denom = balance.denom;
      const amount = parseInt(balance.amount);
      let displayAmount = amount;
      let displayDenom = denom;

      if (denom === 'usaf') {
        displayAmount = (amount / 1000000).toFixed(6);
        displayDenom = 'SAF';
      }

      console.log(`│  ${displayAmount} ${displayDenom}`);
    });

    console.log(`└────────────────────────────┘\n`);

  } catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
  }

  rl.close();
}

async function main() {
  console.log(`
╔═══════════════════════════════════════╗
║   Check Wallet Balance - Safrochain   ║
╚═══════════════════════════════════════╝
  `);

  let address = process.argv[2];

  if (!address) {
    address = await question('Enter wallet address (addr_safro1...): ');
  }

  if (!address || !address.startsWith('addr_safro1')) {
    console.error(`❌ Invalid address format.\n`);
    rl.close();
    process.exit(1);
  }

  await checkBalance(address);
}

main().catch(console.error);

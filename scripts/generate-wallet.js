#!/usr/bin/env node

const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function generateWallet() {
  console.log(`
╔════════════════════════════════════════╗
║   Generate Cosmos Wallet - Safrochain  ║
╚════════════════════════════════════════╝
  `);

  try {
    const addressPrefix = await question('Enter address prefix (default: addr_safro): ') || 'addr_safro';
    const walletDir = await question('Enter wallet directory (default: ./wallets): ') || './wallets';
    const wordCount = await question('Enter mnemonic words (12 or 24, default: 24): ') || '24';

    if (!fs.existsSync(walletDir)) {
      fs.mkdirSync(walletDir, { recursive: true });
      console.log(`✅ Created directory: ${walletDir}`);
    }

    console.log(`\n🔄 Generating ${wordCount}-word mnemonic...`);
    const wallet = await DirectSecp256k1HdWallet.generate(parseInt(wordCount));
    const mnemonic = wallet.secret.data;

    const hdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: addressPrefix,
    });

    const accounts = await hdWallet.getAccounts();
    const address = accounts[0].address;
    const pubkey = Buffer.from(accounts[0].pubkey).toString('base64');

    console.log(`\n✅ Wallet Generated Successfully!\n`);
    console.log(`📌 Address:   ${address}`);
    console.log(`🔑 Mnemonic:  ${mnemonic}`);
    console.log(`📝 PubKey:    ${pubkey}`);

    const phraseFile = path.join(walletDir, 'phrase.txt');
    const pkFile = path.join(walletDir, 'pk.txt');

    fs.appendFileSync(phraseFile, `${address}|${mnemonic}\n`);
    fs.appendFileSync(pkFile, `${address}|${pubkey}\n`);

    console.log(`\n✅ Saved to:`);
    console.log(`   • ${phraseFile}`);
    console.log(`   • ${pkFile}\n`);

    rl.close();
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

generateWallet();

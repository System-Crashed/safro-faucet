module.exports = {
  FAUCET: {
    URL: 'https://faucet.testnet.safrochain.com/request',
    COOLDOWN: 43200000,
    TIMEOUT: 30000,
  },

  CHAIN: {
    RPC_ENDPOINT: 'https://rpc.testnet.safrochain.com',
    REST_ENDPOINT: 'https://rest.testnet.safrochain.com',
    CHAIN_ID: 'safro-testnet-1',
    ADDRESS_PREFIX: 'addr_safro',
    COIN_DENOM: 'usaf',
    GAS_PRICE: '0.1usaf',
    GAS_ESTIMATE: 100000,
  },

  PROXY: {
    URLS: [
      // 'https://user:password@proxy1:8080',
      // 'https://user:password@proxy2:8080',
    ],
    STRATEGY: 'random',
    MAX_RETRIES: 3,
    TIMEOUT: 30000,
  },

  WALLET: {
    DIRECTORY: './wallets',
    PHRASES_FILE: 'phrase.txt',
    PRIVATE_KEYS_FILE: 'pk.txt',
    HD_PATH: "m/44'/118'/0'/0",
    MNEMONIC_LENGTH: 24,
  },

  WORKER: {
    COUNT: 3,
    CYCLE_DELAY: 15000,
    POST_CLAIM_DELAY: 30000,
    PRE_TRANSFER_DELAY: 10000,
  },

  TRANSFER: {
    ENABLED: true,
    TARGET_ADDRESS: 'addr_safro1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    AMOUNT: '1000000',
    TRANSFER_DELAY: 5000,
  },

  LOGGING: {
    LEVEL: 'info',
    TO_FILE: true,
    DIRECTORY: './logs',
    MAX_SIZE: 5242880,
    RETENTION_DAYS: 7,
  },

  ADVANCED: {
    DRY_RUN: false,
    VERBOSE: false,
    NOTIFICATIONS: {
      ENABLED: false,
      TYPE: 'discord',
    },
    DATABASE: {
      ENABLED: false,
      TYPE: 'sqlite',
      PATH: './data/history.db',
    },
    BACKUP: {
      ENABLED: true,
      FREQUENCY: 86400000,
      DIRECTORY: './backups',
    },
  },
};

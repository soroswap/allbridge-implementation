# Allbridge Integration with Soroswap

## Overview

This repository contains scripts that interface with Allbridge for cross-chain transactions between the Stellar network and other supported blockchains. Our goal is to enable seamless asset transfers within Soroswap, leveraging Allbridge's bridging capabilities.

## Scripts

### 1. `allBridgeClassic.js` (Deprecated)

This script was utilizing the Allbridge Classic API to facilitate cross-chain transactions between Stellar and other blockchains supported by Allbridge. However, it will no longer be maintained or used as we shift our focus to the more advanced Allbridge Core system.

### 2. `allBridgeCore.ts`

This script interacts with the Allbridge Core SDK, now fully supporting bridging between Soroban on Stellar and Binance Smart Chain (BSC), among other blockchains. The script demonstrates our capability to bridge assets like USDT and USDC between these networks, fully utilizing the latest features of the Allbridge Core.

**Key Components:**

- **SDK Initialization:** Initializes the Allbridge Core SDK with custom RPC URLs for supported blockchains including BSC and Soroban.
- **Chain and Token Details:** Retrieves detailed information and capabilities of supported chains, specifically focusing on bridging operations between BSC and Soroban.
- **Transaction Execution:** Handles the bridging of tokens from BSC to Soroban and vice versa, including setup of trust lines on Soroban when needed.
- **Error Handling and Transaction Confirmations:** Manages errors during the bridging process and confirms transactions across chains to ensure reliability and consistency.

## Testing

### Setup

Before you start testing, ensure that all dependencies are installed and environment variables are set up correctly:

1. **Install Dependencies:**
   Run `yarn install` to install the required packages.

2. **Environment Configuration:**
   Set up your environment variables using `.env.example` as a template. Rename `.env.example` to `.env` and replace the placeholder values with your actual configuration details.

### Running Tests

To execute the tests, use the command `yarn core`. This script will perform the following actions:

- **Bridging USDC from Soroban to USDT on BSC:** This operation bridges 1 USDC from the Soroban network on Stellar to 1 USDT on the Binance Smart Chain (BSC).
- **Bridging USDT from BSC to USDC on Soroban:** Following the first bridge, it will bridge 1 USDT from BSC back to 1 USDC on Soroban.

### Important Notes

- **Transaction Time:** Keep in mind that each bridge transaction can take a few minutes to complete. If you do not have at least 1 USDC and 1 USDT on both accounts, it is recommended to manage the transactions sequentially to avoid errors due to insufficient funds.
- **Sequential Bridging:** If you are testing with limited funds, you can modify the script to perform the transactions one at a time:

  - **First Transaction:** Comment out the lines for `bridgeFromBscToStellar` (lines 261 to 267) and run the script. This will execute the bridge from Soroban to BSC. Wait for this transaction to complete by checking the corresponding blockchain explorer.
  - **Second Transaction:** Once the first transaction is confirmed, comment out the lines for `bridgeFromStellarToBnb` (lines 252 to 258) and uncomment the previously commented lines to perform the bridge from BSC back to Soroban.

- **Sufficient Funds:** If you have more than 1 unit of USD in the form of USDC and USDT on both blockchains, you can execute both bridging operations one after the other without waiting.

### Monitoring

Monitor transaction statuses and progress through the respective blockchain explorers for Soroban and BSC. This will help you verify that the bridges are completed successfully.

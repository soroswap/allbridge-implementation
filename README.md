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

## Strategic Decision to Focus on Allbridge Core

### Updates and Future Proofing

- **Latest Updates:** Allbridge Core has recently been updated to support asset transfers between BSC and Soroban on the Stellar network. This allows us to effectively bridge between these and other supported chains, aligning with our goal to offer a wide range of cross-chain transaction capabilities within Soroswap.
- **Deprecation of Classic:** The Allbridge Classic system will be deprecated in favor of Allbridge Core, which offers broader chain support and more advanced features.

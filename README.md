# Allbridge Integration with Soroswap

## Overview

This repository contains scripts that interface with Allbridge for cross-chain transactions between the Stellar network and other supported blockchains. Our goal is to enable seamless asset transfers within Soroswap, leveraging Allbridge's bridging capabilities.

## Scripts

### 1. `allBridgeClassic.js`

This script utilizes the Allbridge API to facilitate cross-chain transactions between Stellar and other blockchains supported by Allbridge. It is designed to interact with the Allbridge Classic bridge system but is not completed as we await further developments from Allbridge.

**Key Components:**

- **Environment Setup:** Loads configuration from environment variables.
- **Token Support Fetching:** Fetches supported tokens and their details for cross-chain transactions.
- **Transaction Management:** Manages cross-chain transactions and handles errors during the process.

### 2. `allBridgeCore.ts`

This newer script interfaces with the Allbridge Core SDK, which is expected to support more blockchains and features, including the new Soroban platform on Stellar. It checks for the supported chains and their capabilities.

**Key Components:**

- **SDK Initialization:** Sets up the Allbridge Core SDK with customized RPC URLs.
- **Chain Details Fetching:** Retrieves detailed information about the supported chains, focusing particularly on the Soroban platform.

## Strategic Decision to Wait

### Current Status of Soroban Integration

The Allbridge Core SDK recognizes the Soroban chain, but as of now, it does not support any tokens for bridging. The object returned for Soroban includes essential details like chain symbol, transfer times, and transaction costs but lacks active tokens, which are crucial for our operations on Soroswap.

### Why Wait?

- **Future Compatibility:** Integrating Allbridge Classic might provide a short-term solution, but it lacks the broader chain support and advanced features that Allbridge Core will offer. Waiting for the complete integration of Soroban in Allbridge Core ensures that Soroswap remains compatible with future blockchain technologies and standards.
- **Resource Efficiency:** Integrating a system that is still under significant development (like Allbridge Core with Soroban) could require continuous revisions and updates to keep up with changes. Waiting allows us to allocate our resources more efficiently by integrating a more stable and feature-complete version once available.
- **User Experience:** Providing a stable, reliable, and expansive bridging solution enhances user trust and satisfaction. Premature integration may lead to issues that could affect user experience negatively.

### Moving Forward

Our team closely monitors the developments from Allbridge regarding Soroban support. We are committed to integrating Allbridge Core into Soroswap as soon as it offers a robust set of features that meet our requirements for a seamless and efficient user experience. This strategic patience aligns with our goal to provide a cutting-edge, reliable platform for our users.

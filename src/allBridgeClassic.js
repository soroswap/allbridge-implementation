require("dotenv").config();
var StellarSdk = require("@stellar/stellar-sdk");
const fs = require("fs").promises;
const { ethers } = require("ethers");

const allBridgeBSCSmartContract = "0xD5D6B2f2D7a7506C49Bb0cb6FB39a67F065d6FC4";

// Function to load contract ABIs from local files
async function loadAbi(file) {
  const path = `${__dirname}/abi/${file}`;
  const abi = await fs.readFile(path, "utf8");
  return JSON.parse(abi);
}

function getConfig() {
  return {
    evmSecret: process.env.EVM_SECRET_KEY,
    stellarSecret: process.env.STELLAR_PRIVATE_KEY,
  };
}

const networkRpcUrl = process.env.BSC_RPC;
const provider = new ethers.JsonRpcProvider(networkRpcUrl);
const wallet = new ethers.Wallet(getConfig().evmSecret, provider);

/**
 * Fetches and logs the supported tokens for cross-network transactions via Stellar.
 *
 * The `supportedTokens` object maps originating ("FROM") networks to their respective details,
 * including the number of confirmations required for a transaction and a list of destination ("TO")
 * tokens that are supported for transactions from the respective originating network.
 *
 * Each key in the `supportedTokens` object represents an originating network (e.g., BSC, ETH, POL),
 * and the associated value is an object containing:
 *  - `confirmations`: The number of confirmations required for a transaction from this network
 *    to be considered secure.
 *  - `tokens`: An array of token objects that can be received on the Stellar network (XLM) from
 *    transactions originating from this network. For the XLM network itself, this array represents
 *    the tokens supported for transactions to other networks.
 *
 * Example structure:
 * {
 *   BSC: { confirmations: 15, tokens: [...] }, // Transactions from BSC to XLM
 *   ETH: { confirmations: 80, tokens: [...] }, // Transactions from ETH to XLM
 *   XLM: { confirmations: 5, tokens: [...] }   // Transactions from XLM to other networks
 * }
 *
 * This structure allows us to understand the cross-network transaction capabilities and requirements
 * for Stellar, providing insights into the transaction confirmation thresholds and the range of tokens
 * supported for bridging across different blockchain networks.
 */
async function fetchSupportedTokens() {
  try {
    const response = await fetch(
      "https://stellar-info.allbridgeapi.net/token-info"
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

async function fetchCheckSignerForNetwork(chainId) {
  try {
    const response = await fetch(
      `https://signer.allbridgeapi.net/check/${chainId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

// This checks if the recipient address is valid returns the status, {result: boolean, status: 'OK'} if status is OK then you are good to go
async function fetchCheckRecipientTokenAddress(
  blockchainId,
  recipientAddress,
  tokenSource,
  tokenSourceAddress
) {
  try {
    const response = await fetch(
      `https://stellar-info.allbridgeapi.net/check/${blockchainId}/address/${recipientAddress}?tokenSource=${tokenSource}&tokenSourceAddress=${tokenSourceAddress}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

// This checks if the recipient address is valid returns the status, {result: boolean, status: 'OK'} if status is OK then you are good to go
async function fetchCheckRecipientTokenBalance(
  blockchainId,
  tokenSource,
  tokenSourceAddress
) {
  try {
    const response = await fetch(
      `https://stellar-info.allbridgeapi.net/check/${blockchainId}/balance/${tokenSource}/${tokenSourceAddress}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch error:", error.message);
  }
}

async function main() {
  const config = getConfig();
  console.log("🚀 « config:", config);

  const stellarAccount = StellarSdk.Keypair.fromSecret(config.stellarSecret);

  const supportedTokens = await fetchSupportedTokens();
  const bscToStellarTokens = supportedTokens["BSC"];
  console.log("🚀 « bscToStellarTokens:", bscToStellarTokens);
  const bnbToStellar = bscToStellarTokens.tokens.find(
    (token) => token.symbol === "BNB"
  );
  console.log("🚀 « bnbToStellar:", bnbToStellar);

  // Not really sure what these are for... probably to check the signer is available? the response is {result: boolean}
  const checkBSCSigner = await fetchCheckSignerForNetwork("BSC");
  console.log("🚀 « checkBSCSigner:", checkBSCSigner);
  const checkXLMSigner = await fetchCheckSignerForNetwork("XLM");
  console.log("🚀 « checkXLMSigner:", checkXLMSigner);

  const checkRecipientTokenAddress = await fetchCheckRecipientTokenAddress(
    "XLM",
    stellarAccount.publicKey(),
    bnbToStellar.tokenSource,
    bnbToStellar.tokenSourceAddress
  );
  console.log("🚀 « checkRecipientTokenAddress:", checkRecipientTokenAddress);

  // This is checking the balance of the asset that the wallet will receive (in this case is a wrapped BNB with code: abBNB and issuer: GALLBRBQHAPW5FOVXXHYWR6J4ZDAQ35BMSNADYGBW25VOUHUYRZM4XIL)
  const checkRecipientTokenBalance = await fetchCheckRecipientTokenBalance(
    "XLM",
    bnbToStellar.tokenSource,
    bnbToStellar.tokenSourceAddress
  );
  console.log("🚀 « checkRecipientTokenBalance:", checkRecipientTokenBalance);

  // Now a call is made to the lockBase() function in the BSC Allbridge smart contract FOR STELLAR! "0xD5D6B2f2D7a7506C49Bb0cb6FB39a67F065d6FC4"
  if (
    checkRecipientTokenAddress.result === true &&
    checkRecipientTokenAddress.status === "OK"
  ) {
    const allbridgeContractAbi = await loadAbi("allBridgeAbi.json");

    const allbridgeContract = new ethers.Contract(
      allBridgeBSCSmartContract,
      allbridgeContractAbi,
      wallet
    );
    console.log("🚀 « allbridgeContract:", allbridgeContract);

    const bnbToBridge = ethers.parseEther("0.0101");
    console.log("🚀 « bnbToBridge:", bnbToBridge);

    // Generating lockId with first byte as 0x01
    let lockId = ethers.hexlify(ethers.randomBytes(16));
    lockId = `0x01${lockId.slice(3)}`; // Ensure first byte is 0x01

    console.log("🚀 « lockId:", lockId);
    const wrappedBaseTokenAddress = bnbToStellar.tokenSourceAddress; // Wrapped BNB contract
    console.log("🚀 « wrappedBaseTokenAddress:", wrappedBaseTokenAddress);

    const recipient = stellarAccount.publicKey();
    console.log("🚀 « recipientAddress:", recipient);

    // Destination blockchain ID to bytes4 (e.g., "ETH\0")
    const destination = ethers.encodeBytes32String("XLM").slice(0, 10);
    console.log("🚀 « destination:", destination);

    // If the function is payable, add the value here
    const txOptions = { value: bnbToBridge };
    console.log("🚀 « txOptions:", txOptions);

    // Lock base token
    try {
      console.log("Locking base token...");
      const bridgeTx = await allbridgeContract.lockBase(
        lockId,
        wrappedBaseTokenAddress,
        recipient,
        destination,
        txOptions
      );
      console.log("🚀 « bridgeTx:", bridgeTx);
      await bridgeTx.wait();
      console.log(`LockBase successful: Transaction Hash: ${bridgeTx.hash}`);
    } catch (error) {
      console.error(`LockBase failed: ${error}`);
    }
  }

  process.exit();
}

main().then(() => console.log("Script finished succesfully"), console.error);

// ?:

// ?: https://stellar-info.allbridgeapi.net/check/XLM/balance/XLM/0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c000000000000000000000000

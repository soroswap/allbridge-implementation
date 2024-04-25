// Load environment variables and necessary libraries.
require("dotenv").config();
var StellarSdk = require("@stellar/stellar-sdk");
const fs = require("fs").promises;
const { ethers } = require("ethers");

// Define the AllBridge BSC Smart Contract address.
const allBridgeBSCSmartContract = "0xD5D6B2f2D7a7506C49Bb0cb6FB39a67F065d6FC4";

// Helper function to load ABI definitions from local files.
async function loadAbi(file) {
  const path = `${__dirname}/abi/${file}`;
  const abi = await fs.readFile(path, "utf8");
  return JSON.parse(abi);
}

// Retrieve sensitive configuration from environment variables.
function getConfig() {
  return {
    evmSecret: process.env.EVM_SECRET_KEY,
    stellarSecret: process.env.STELLAR_PRIVATE_KEY,
  };
}

// Setup the blockchain provider and wallet using the EVM compatible network details.
const networkRpcUrl = process.env.BSC_RPC;
const provider = new ethers.JsonRpcProvider(networkRpcUrl);
const wallet = new ethers.Wallet(getConfig().evmSecret, provider);

// Function to fetch supported tokens and their details from the AllBridge API.
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

// Check if a signer is registered and valid for a specified network.
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

// Validate recipient token and address on the specified blockchain.
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

// Check balance for a specified token at a given address.
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

// Main function orchestrates the cross-chain transaction sequence.
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

  const checkRecipientTokenBalance = await fetchCheckRecipientTokenBalance(
    "XLM",
    bnbToStellar.tokenSource,
    bnbToStellar.tokenSourceAddress
  );
  console.log("🚀 « checkRecipientTokenBalance:", checkRecipientTokenBalance);

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

    let lockId = ethers.hexlify(ethers.randomBytes(16));
    lockId = `0x01${lockId.slice(3)}`; // Ensure first byte is 0x01

    console.log("🚀 « lockId:", lockId);
    const wrappedBaseTokenAddress = bnbToStellar.tokenSourceAddress;
    console.log("🚀 « wrappedBaseTokenAddress:", wrappedBaseTokenAddress);

    const recipient = stellarAccount.publicKey();
    console.log("🚀 « recipientAddress:", recipient);

    const destination = ethers.encodeBytes32String("XLM").slice(0, 10);
    console.log("🚀 « destination:", destination);

    const txOptions = { value: bnbToBridge };
    console.log("🚀 « txOptions:", txOptions);

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

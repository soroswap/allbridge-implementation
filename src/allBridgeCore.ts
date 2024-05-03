import "dotenv/config";
import {
  AllbridgeCoreSdk,
  ChainSymbol,
  FeePaymentMethod,
  Messenger,
  SendParams,
  TokenWithChainDetails,
  mainnet,
  nodeRpcUrlsDefault,
} from "@allbridge/bridge-core-sdk";
import { Keypair, SorobanRpc, TransactionBuilder } from "@stellar/stellar-sdk";
import { ethers } from "ethers";
import { ensure } from "./utils/utils";
import Big from "big.js";
import * as fs from "fs";

//Docs: https://github.com/allbridge-io/allbridge-core-js-sdk/tree/7219e7f4171f2ae4e881f233a0b34b683183915b

// Initializing Allbridge SDK
const allBridgeSdk = new AllbridgeCoreSdk({
  ...nodeRpcUrlsDefault,
  BSC: process.env.BSC_RPC,
  SRB: process.env.SRB_RPC,
});

// Helper function to load ABI definitions from local files.
async function loadAbi(file: string) {
  const path = `${__dirname}/abi/${file}`;
  const abi = fs.readFileSync(path, { encoding: "utf-8" });
  return JSON.parse(abi);
}

// loads stellar secret
const stellarAccount = Keypair.fromSecret(process.env.STELLAR_PRIVATE_KEY!);

// Setup the blockchain provider and wallet using the EVM compatible network details.
const bscNetworkRpcUrl = process.env.BSC_RPC;
const bscProvider = new ethers.JsonRpcProvider(bscNetworkRpcUrl);
const bscWallet = new ethers.Wallet(process.env.EVM_SECRET_KEY!, bscProvider);

async function bridgeFromBscToStellar(
  fromAddress: string,
  toAddress: string,
  amount: string,
  sourceToken?: TokenWithChainDetails,
  destinationToken?: TokenWithChainDetails
) {
  if (!sourceToken || !destinationToken) {
    throw new Error("usdt and usdc are null");
  }

  const allowanceAmount = await allBridgeSdk.bridge.getAllowance({
    token: sourceToken,
    owner: fromAddress,
  });
  console.log("🚀 « allowanceAmount:", allowanceAmount);

  const allowance = await allBridgeSdk.bridge.checkAllowance({
    token: sourceToken,
    owner: fromAddress,
    amount: amount,
  });

  // approving the bridge smart contract to spend the tokens using allbridge, allbridge will set the allowance to the max,
  // if we want to set this manually to a specific amount, we would need to do it manually using ethersjs/web3js and loading the token abi and contract
  if (!allowance) {
    const rawTransactionApprove =
      await allBridgeSdk.bridge.rawTxBuilder.approve({
        token: sourceToken,
        owner: fromAddress,
      });
    try {
      const txResponse = await bscWallet.sendTransaction(
        rawTransactionApprove as ethers.TransactionResponse
      );
      const approveReceipt = await txResponse.wait();
      console.log("🚀 « approveReceipt:", approveReceipt);
    } catch (error) {
      console.log("🚀 « error:", error);
      throw new Error("error approving bridge contract");
    }
  }

  // Bridging!
  // if using Web3 js apparently it could be easy to just pass the Web3 provider to the send function and there
  // would be no need to get the rawTxBuilder and it would just use the loaded account on web3 provider,
  // But since im using ethers here, i need to get the raw transaction and send it manually

  // Bridge fees can be paid either with the stablecoin or native currency, in this case im using native
  const sendParams: SendParams = {
    amount,
    fromAccountAddress: fromAddress,
    toAccountAddress: toAddress,
    sourceToken,
    destinationToken,
    messenger: Messenger.ALLBRIDGE,
    gasFeePaymentMethod: FeePaymentMethod.WITH_NATIVE_CURRENCY,
  };
  const rawBridgeTransaction = await allBridgeSdk.bridge.rawTxBuilder.send(
    sendParams
  );
  try {
    const txResponse = await bscWallet.sendTransaction(
      rawBridgeTransaction as ethers.TransactionResponse
    );
    const bridgeReceipt = await txResponse.wait();
    console.log("🚀 « bridgeReceipt:", bridgeReceipt);
  } catch (error) {}
}

async function bridgeFromStellarToBnb(
  fromAddress: string,
  toAddress: string,
  amount: string,
  sourceToken?: TokenWithChainDetails,
  destinationToken?: TokenWithChainDetails
) {
  if (!sourceToken || !destinationToken) {
    throw new Error("usdt and usdc are null");
  }

  const sendParams: SendParams = {
    amount,
    fromAccountAddress: fromAddress,
    toAccountAddress: toAddress,
    sourceToken,
    destinationToken,
    messenger: Messenger.ALLBRIDGE,
    gasFeePaymentMethod: FeePaymentMethod.WITH_STABLECOIN,
  };

  const xdrTx: string = (await allBridgeSdk.bridge.rawTxBuilder.send(
    sendParams
  )) as string;

  // SendTx
  const transaction = TransactionBuilder.fromXDR(
    xdrTx,
    mainnet.sorobanNetworkPassphrase
  );
  transaction.sign(stellarAccount);
  const signedTx = transaction.toXDR();

  const restoreXdrTx =
    await allBridgeSdk.utils.srb.simulateAndCheckRestoreTxRequiredSoroban(
      signedTx,
      fromAddress
    );

  if (restoreXdrTx) {
    const newRestoredTx = TransactionBuilder.fromXDR(
      restoreXdrTx,
      mainnet.sorobanNetworkPassphrase
    );
    newRestoredTx.sign(stellarAccount);
    const signedRestoreXdrTx = newRestoredTx.toXDR();
    const sentRestoreXdrTx =
      await allBridgeSdk.utils.srb.sendTransactionSoroban(signedRestoreXdrTx);
    const confirmRestoreXdrTx = await allBridgeSdk.utils.srb.confirmTx(
      sentRestoreXdrTx.hash
    );
    if (
      confirmRestoreXdrTx.status ===
      SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      console.log(
        `Waited for Restore transaction to complete, but it did not. ` +
          `Check the transaction status manually. ` +
          `Hash: ${sentRestoreXdrTx.hash}`
      );
    } else if (
      confirmRestoreXdrTx.status === SorobanRpc.Api.GetTransactionStatus.FAILED
    ) {
      console.log(
        `Transaction Restore failed. Check the transaction manually.` +
          `Hash: ${sentRestoreXdrTx.hash}`
      );
    } else {
      console.log(
        `Transaction Restore Confirmed. Hash: ${sentRestoreXdrTx.hash}`
      );
    }
  }

  const sent = await allBridgeSdk.utils.srb.sendTransactionSoroban(signedTx);
  const confirm = await allBridgeSdk.utils.srb.confirmTx(sent.hash);
  if (confirm.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    console.log(
      `Waited for transaction to complete, but it did not. ` +
        `Check the transaction status manually. ` +
        `Hash: ${sent.hash}`
    );
  } else if (confirm.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    console.log(
      `Transaction failed. Check the transaction manually.` +
        `Hash: ${sent.hash}`
    );
  } else {
    console.log(`Transaction Confirmed. Hash: ${sent.hash}`);
  }

  //TrustLine check and Set up for destinationToken if it is SRB
  const destinationTokenSBR = sourceToken; // simulate destination is srb

  const balanceLine = await allBridgeSdk.utils.srb.getBalanceLine(
    fromAddress,
    destinationTokenSBR.tokenAddress
  );
  console.log(`BalanceLine:`, balanceLine);
  const notEnoughBalanceLine =
    !balanceLine ||
    Big(balanceLine.balance).add(amount).gt(Big(balanceLine.limit));
  if (notEnoughBalanceLine) {
    const xdrTx = await allBridgeSdk.utils.srb.buildChangeTrustLineXdrTx({
      sender: fromAddress,
      tokenAddress: destinationTokenSBR.tokenAddress,
    });

    //SignTx
    const transaction = TransactionBuilder.fromXDR(
      xdrTx,
      mainnet.sorobanNetworkPassphrase
    );
    transaction.sign(stellarAccount);
    const signedTrustLineTx = transaction.toXDR();

    const submit = await allBridgeSdk.utils.srb.submitTransactionStellar(
      signedTrustLineTx
    );
    console.log("Submitted change trust tx. Hash:", submit.hash);
  }
}

async function main() {
  // Returns all supported chains
  const supportedChains = await allBridgeSdk.chainDetailsMap();

  //extract information from BNB  chain
  const bscChain = supportedChains[ChainSymbol.BSC];
  const usdtTokenBsc = ensure(
    bscChain.tokens.find((token) => token.symbol === "USDT")
  );

  //extract information from Soroban  chain
  const sorobanChain = supportedChains[ChainSymbol.SRB];
  const usdcTokenSrb = ensure(
    sorobanChain.tokens.find((token) => token.symbol === "USDC")
  );

  // Bridging from Stellar to BNB
  await bridgeFromStellarToBnb(
    stellarAccount.publicKey(),
    bscWallet.address,
    "1",
    usdcTokenSrb,
    usdtTokenBsc
  );

  // Bridging from BNB to Stellar
  await bridgeFromBscToStellar(
    bscWallet.address,
    stellarAccount.publicKey(),
    "1",
    usdtTokenBsc,
    usdcTokenSrb
  );

  process.exit();
}

main().then(() => console.log("Script finished succesfully"), console.error);

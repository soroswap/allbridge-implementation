import "dotenv/config";
import {
  AllbridgeCoreSdk,
  AmountFormat,
  ChainSymbol,
  FeePaymentMethod,
  Messenger,
  SendParams,
  TokenWithChainDetails,
  mainnet,
  nodeRpcUrlsDefault,
} from "@allbridge/bridge-core-sdk";
import {
  BASE_FEE,
  Keypair,
  Operation,
  SorobanRpc,
  TimeoutInfinite,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { ethers } from "ethers";
import { ensure } from "./utils/utils";
import Big from "big.js";

// Initializing Allbridge SDK
const allBridgeSdk = new AllbridgeCoreSdk({
  ...nodeRpcUrlsDefault,
  BSC: process.env.BSC_RPC,
  STLR: process.env.STLR_RPC,
  SRB: process.env.SRB_RPC,
  ETH: process.env.ETH_RPC,
});

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
  console.log("🚀 « sourceToken:", sourceToken);

  const rawTransactionApprove = await allBridgeSdk.bridge.rawTxBuilder.approve(
    bscProvider,
    {
      token: sourceToken,
      owner: fromAddress,
    }
  );
  console.log("🚀 « rawTransactionApprove:", rawTransactionApprove);

  // There is a check allowance but is returning an error "Cannot read properties of undefined (reading 'Contract')"
  // const allowance = await allBridgeSdk.bridge.checkAllowance(bscProvider, {
  //   token: sourceToken,
  //   owner: fromAddress,
  //   amount: "1.01",
  // });
  // console.log("🚀 « allowance:", allowance);
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

  // await bridgeFromStellarToBnb(
  //   stellarAccount.publicKey(),
  //   bscWallet.address,
  //   "1",
  //   usdcTokenSrb,
  //   usdtTokenBsc
  // );

  await bridgeFromBscToStellar(
    bscWallet.address,
    stellarAccount.publicKey(),
    "3",
    usdtTokenBsc,
    usdcTokenSrb
  );

  process.exit();
}

main().then(() => console.log("Script finished succesfully"), console.error);

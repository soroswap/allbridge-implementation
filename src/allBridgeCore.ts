import "dotenv/config";
import {
  AllbridgeCoreSdk,
  ChainSymbol,
  nodeRpcUrlsDefault,
} from "@allbridge/bridge-core-sdk";
import { Keypair } from "@stellar/stellar-sdk";

// Initializing Allbridge SDK
const allBridgeSdk = new AllbridgeCoreSdk({
  ...nodeRpcUrlsDefault,
  BSC: process.env.BSC_RPC,
  STLR: process.env.STLR_RPC,
  SRB: process.env.SRB_RPC,
  ETH: process.env.ETH_RPC,
});

async function getConfig() {
  return {
    stellarSecret: process.env.STELLAR_PRIVATE_KEY ?? "",
  };
}

async function main() {
  const config = await getConfig();

  // loads stellar secret
  const stellarAccount = Keypair.fromSecret(config.stellarSecret);

  // Returns all supported chains
  const supportedChains = await allBridgeSdk.chainDetailsMap();

  // extract information about Soroban chain
  const supportedChainForSoroban = supportedChains[ChainSymbol.SRB];
  console.log("🚀 « supportedChainForSoroban:", supportedChainForSoroban);

  process.exit();
}

main().then(() => console.log("Script finished succesfully"), console.error);

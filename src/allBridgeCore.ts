import "dotenv/config";
import {
  AllbridgeCoreSdk,
  ChainSymbol,
  nodeRpcUrlsDefault,
} from "@allbridge/bridge-core-sdk";

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

  // const stellarAccount = Keypair.fromSecret(config.stellarSecret);

  const supportedChains = await allBridgeSdk.chainDetailsMap();

  // extract information about Stellar chain
  const supportedChainForStellar = supportedChains[ChainSymbol.STLR];

  // Is undefined... Allbridge Core currently does not support Stellar, is still in development for the Soroban chain.
  // Will get back to this when is supported, in the meantime, experiments with Allbridge Classic are in allBridgeClassic.js
  console.log("🚀 « supportedChainForStellar:", supportedChainForStellar);

  process.exit();
}

main().then(() => console.log("Script finished succesfully"), console.error);

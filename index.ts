import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

import * as nearAPI from "near-api-js"
import { startStream, types } from 'near-lake-framework';

const CONTACT_ADDR = "dev-1666200445140-19169904957827"

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  streamerMessage
    .shards.map(s => s.chunk)
    .filter(c => c !== null)
    .flatMap(t => t.receipts)
    .forEach(r => {
      if(r.receiverId == CONTACT_ADDR) {
        if("Action" in r.receipt) {
          const action = r.receipt.Action
          console.log(action)
          action.actions.forEach((a: types.Action) => {
            if(a !== "CreateAccount" && "FunctionCall" in a) {
              const functionCall = a.FunctionCall
              console.log("called", 
                functionCall.methodName, 
                Buffer.from(functionCall.args, 'base64').toString('utf8'), // TODO: is it really utf8?
                functionCall.gas, 
                functionCall.deposit
              )
            }
          })
        }
      }
    })
}

(async () => {
  const connectionConfig = {
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
  };
  const nearConnection = await nearAPI.connect(connectionConfig);
  const status = await nearConnection.connection.provider.status()
  const blockHeight = status.sync_info.latest_block_height
  console.log("Starting from latest block height", blockHeight) 
  const lakeConfig: types.LakeConfig = {
    s3BucketName: "near-lake-data-" + "testnet", 
    s3RegionName: "eu-central-1",
    startBlockHeight: blockHeight,
  };
  await startStream(lakeConfig, handleStreamerMessage);
})();

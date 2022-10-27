import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()

import * as nearAPI from "near-api-js"
import { startStream, types } from 'near-lake-framework';

interface EventLogData {
  standard: string,
  version: string,
  event: string,
  data?: unknown,
};

interface ParasEventLogData {
  owner_id: string,
  token_ids: string[],
};

interface MintbaseEventLogData {
  owner_id: string,
  memo: string,
}

const CONTACT_ADDR = "dev-1666200445140-19169904957827"

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  //const createdOn = new Date(streamerMessage.block.header.timestamp / 1000000)
  streamerMessage
    .shards.map(s => s.chunk)
    .filter(c => c !== null)
    .flatMap(t => t.receipts)
    .forEach(r => {
      if(r.receiverId == CONTACT_ADDR) {
        console.log(r.receipt)
      }
    })
  // const relevantOutcomes = streamerMessage
  //   .shards
  //   .flatMap(shard => shard.receiptExecutionOutcomes)
  //   .map(outcome => ({
  //     receipt: {
  //       id: outcome.receipt.receiptId, 
  //       receiverId: outcome.receipt.receiverId,
  //     },
  //     events: outcome.executionOutcome.outcome.logs.map(
  //       (log: string): EventLogData => {
  //         const [_, probablyEvent] = log.match(/^EVENT_JSON:(.*)$/) ?? []
  //         try {
  //           return JSON.parse(probablyEvent)
  //         } catch (e) {
  //           return
  //         }
  //       }
  //     )
  //     .filter(event => event !== undefined)
  //   }))
  //   .filter(relevantOutcome =>
  //     relevantOutcome.events.some(
  //       event => event.standard === "nep171" && event.event === "nft_mint"
  //     )
  //   )

  // let output = []
  // for (let relevantOutcome of relevantOutcomes) {
  //   let marketplace = "Unknown"
  //   let nfts = []
  //   if (relevantOutcome.receipt.receiverId.endsWith(".paras.near")) {
  //     marketplace = "Paras"
  //     nfts = relevantOutcome.events.flatMap(event => {
  //       return (event.data as ParasEventLogData[])
  //         .map(eventData => ({
  //           owner: eventData.owner_id,
  //           links: eventData.token_ids.map(
  //             tokenId => `https://paras.id/token/${relevantOutcome.receipt.receiverId}::${tokenId.split(":")[0]}/${tokenId}`
  //           )
  //          })
  //       )
  //     })
  //   } else if (relevantOutcome.receipt.receiverId.match(/\.mintbase\d+\.near$/)) {
  //     marketplace = "Mintbase"
  //     nfts = relevantOutcome.events.flatMap(event => {
  //       return (event.data as MintbaseEventLogData[])
  //         .map(eventData => {
  //         const memo = JSON.parse(eventData.memo)
  //         return {
  //           owner: eventData.owner_id,
  //           links: [`https://mintbase.io/thing/${memo["meta_id"]}:${relevantOutcome.receipt.receiverId}`]
  //         }
  //       })
  //     })
  //   } else {
  //     nfts = relevantOutcome.events.flatMap(event => event.data)
  //   }
  //   output.push({
  //     receiptId: relevantOutcome.receipt.id,
  //     marketplace,
  //     createdOn,
  //     nfts,
  //   })
  // }
  // if (output.length) {
  //   console.log(`We caught freshly minted NFTs!`)
  //   console.dir(output, { depth: 5 })
  // }
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
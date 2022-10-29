import * as dotenv from 'dotenv' 
dotenv.config()

import * as nearAPI from "near-api-js"
import { startStream, types } from 'near-lake-framework';

import * as sqlite3 from 'sqlite3'

const CONTACT_ADDR = "dev-1666200445140-19169904957827"

let db: sqlite3.Database

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
              const argsString = Buffer.from(functionCall.args, 'base64').toString('utf8')
              const args = JSON.parse(argsString) 
              console.log("called", 
                functionCall.methodName, 
                argsString, // TODO: is it really utf8?
                functionCall.gas, 
                functionCall.deposit
              )
              if(functionCall.methodName == 'create_resource') {
                handleCreateResource(args)
              }
            }
          })
        }
      }
    })
}

// let checkId 
//   if(checkId == undefined) {
//     checkId = db.prepare("SELECT * where id == (?)") 
//   }
//   checkId.run(args.id) 
let createResourceQuery : sqlite3.Statement
let addResourceImageQuery: sqlite3.Statement
let addResourceTagQuery: sqlite3.Statement
function prepareStatements() {
  createResourceQuery = db.prepare("INSERT INTO resources VALUES (?, ?, ?, ?, ?)")
  addResourceImageQuery = db.prepare("INSERT INTO resource_images VALUES (?, ?)")
  addResourceTagQuery = db.prepare("INSERT INTO resource_tags VALUES (?, ?)")
}
function finalizePreparedStatements() {
  createResourceQuery.finalize() 
  addResourceImageQuery.finalize()
  addResourceTagQuery.finalize()
}
async function handleCreateResource(args: any) {
  createResourceQuery.run(args.id, args.title, args.description, "SimpleRent", args.price_per_ms)
  if(args.imageUrls) {
    args.imageUrls.forEach((url: string) => {
      addResourceImageQuery.run(args.id, url)
    }) 
  }
  if(args.tags) {
    args.tags.forEach((tag: string) => {
      addResourceTagQuery.run(tag, args.id)
    }) 
  }
  console.log("inserted into db") 
}

(async () => {
  await new Promise<void>((resolve, reject) => {
    console.log("trying to connect to", process.env.SQLITE_DB)
    db = new sqlite3.Database(process.env.SQLITE_DB, err => {
      console.log("something happened")
      if(err) {
        reject("could not connect to the db") 
      } else {
        prepareStatements()
        resolve()
      }
    })
  })

  console.log(db)

  const connectionConfig = {
    networkId: "testnet",
    nodeUrl: "https://rpc.testnet.near.org",
    walletUrl: "https://wallet.testnet.near.org",
    helperUrl: "https://helper.testnet.near.org",
    explorerUrl: "https://explorer.testnet.near.org",
  }

  const nearConnection = await nearAPI.connect(connectionConfig)
  const status = await nearConnection.connection.provider.status()
  const blockHeight = status.sync_info.latest_block_height

  console.log("Starting from latest block height", blockHeight) 

  const lakeConfig: types.LakeConfig = {
    s3BucketName: "near-lake-data-" + "testnet", 
    s3RegionName: "eu-central-1",
    startBlockHeight: blockHeight,
  };

  await startStream(lakeConfig, handleStreamerMessage)

  finalizePreparedStatements()
})();


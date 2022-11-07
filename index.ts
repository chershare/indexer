import * as dotenv from 'dotenv' 
dotenv.config()

import * as nearAPI from "near-api-js"
import { startStream, types } from 'near-lake-framework';

import * as sqlite3 from 'sqlite3'

const CONTACT_ADDR = "dev-1667639146606-57835171345116"

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
          action.actions.forEach((a: types.Action) => {
            if(a !== "CreateAccount" && "FunctionCall" in a) {
              const functionCall = a.FunctionCall
              if(functionCall.methodName == 'create_resource') {
                let args = parseArgs(functionCall.args)
                handleCreateResource(args)
              }
            }
          })
        }
      }
    })
}

function parseArgs(s: string) {
  const argsString = Buffer.from(s, 'base64').toString('utf8')
  return JSON.parse(argsString) 
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
  createResourceQuery = db.prepare("INSERT INTO resources VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
  addResourceImageQuery = db.prepare("INSERT INTO resource_images VALUES (?,?)")
  addResourceTagQuery = db.prepare("INSERT INTO resource_tags VALUES (?,?)")
}
function finalizePreparedStatements() {
  createResourceQuery.finalize() 
  addResourceImageQuery.finalize()
  addResourceTagQuery.finalize()
}

const EARTH_RADIUS_KM = 6371
function transformCoordinates(lat: number, lon: number){
    const phi   = (90-lat)*(Math.PI/180);
    const theta = (lon+180)*(Math.PI/180);

    let x = -(EARTH_RADIUS_KM * Math.sin(phi)*Math.cos(theta));
    let z = (EARTH_RADIUS_KM * Math.sin(phi)*Math.sin(theta));
    let y = (EARTH_RADIUS_KM * Math.cos(phi));
  
    return [x,y,z];
}

async function handleCreateResource(args: any) {
  console.log(`create_resource(\n${JSON.stringify(args, null, ' ')})\n)`) 
  let rip = args.resource_init_params
  let pricingModel = Object.keys(rip.pricing)[0]
  let pricing = rip.pricing[pricingModel]

  let xyz = transformCoordinates(rip.coordinates[0], rip.coordinates[1]) 

  createResourceQuery.run(
    args.name, 

    rip.title, 
    rip.description, 
    rip.contact, 

    pricingModel, 
    pricing.price_per_ms, 
    pricing.price_fixed_base, 
    pricing.refund_buffer, 

    ...xyz, 

    rip.min_duration_ms, 
  )
  if(rip.imageUrls) {
    rip.imageUrls.forEach((url: string) => {
      addResourceImageQuery.run(args.name, url)
    }) 
  }
  if(rip.tags) {
    rip.tags.forEach((tag: string) => {
      addResourceTagQuery.run(tag, args.name)
    }) 
  }
}

(async () => {
  await new Promise<void>((resolve, reject) => {
    db = new sqlite3.Database(process.env.SQLITE_DB, err => {
      if(err) {
        reject("could not connect to the db") 
      } else {
        prepareStatements()
        resolve()
      }
    })
  })

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


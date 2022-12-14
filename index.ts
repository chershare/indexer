import * as dotenv from 'dotenv' 
dotenv.config()

import * as nearAPI from "near-api-js"
import { startStream, types } from 'near-lake-framework';

import * as sqlite3 from 'sqlite3'

const CONTACT_ADDR = process.env.CONTRACT_ACCOUNT_ID 

const resourceContractAccountIds = new Set()

let db: sqlite3.Database


function parseLog(log: string) {
  let colon = log.indexOf(":") 
  let event = log.slice(0, colon)
  let data = JSON.parse(log.slice(colon + 1))
  return [event, data]
}

async function handleStreamerMessage(
  streamerMessage: types.StreamerMessage
): Promise<void> {
  streamerMessage.shards.flatMap(shard => shard.receiptExecutionOutcomes) 
    .forEach(outcome => {
      const receiverId = outcome.receipt.receiverId
      if(resourceContractAccountIds.has(receiverId)) {
        let resourceName = receiverId.slice(0, - ( 1 + CONTACT_ADDR.length))
        outcome.executionOutcome.outcome.logs.forEach(log => {
          let [event, data] = parseLog(log) 
          if(event == 'BookingCreation') {
            console.log(`book(\n${JSON.stringify(data, null, ' ')})\n)`)
            createBookingQuery.run(
              data.id, 
              resourceName, 
              data.booker_account_id, 
              data.start, 
              data.end,
              data.price, 
              (_runResult: sqlite3.RunResult, err: Error) => {
                if(err) {
                  console.log("error creating booking: " + err) 
                }
              }
            ) 
          } else if(event == 'BookingCancellation') {
            console.log('cancel', data) 
            removeBookingQuery.run(receiverId, data.id)
          }
        }) 
      } else if (receiverId == CONTACT_ADDR) {
        outcome.executionOutcome.outcome.logs.forEach(log => {
          let [event, data] = parseLog(log) 
          if(event == 'ResourceCreation') {
            console.log('resource created', JSON.stringify(data)) 
            handleCreateResource(data) 
          }
        }) 
      }
    }) 
    // .shards.map(s => s.chunk)
    // .filter(c => c !== null)
    // .flatMap(t => t.receipts)
    // .forEach(r => {
    //   if(resourceContractAccountIds.has(r.receiverId)) {
    //     if("Action" in r.receipt) {
    //       const action = r.receipt.Action
    //       action.actions.forEach((a: types.Action) => {
    //         if(a !== "CreateAccount" && "FunctionCall" in a) {
    //           const functionCall = a.FunctionCall
    //           if(functionCall.methodName == 'book') {
    //             let args = parseArgs(functionCall.args)
    //             let resourceName = r.receiverId.slice(0, - ( 1 + CONTACT_ADDR.length))
    //             handleBook(resourceName, action.signerId, args) 
    //           }
    //         }
    //       })
    //     }
    //   } else if(r.receiverId == CONTACT_ADDR) {
    //     if("Action" in r.receipt) {
    //       const action = r.receipt.Action
    //       action.actions.forEach((a: types.Action) => {
    //         if(a !== "CreateAccount" && "FunctionCall" in a) {
    //           const functionCall = a.FunctionCall
    //           if(functionCall.methodName == 'create_resource') {
    //             let args = parseArgs(functionCall.args)
    //             handleCreateResource(args)
    //           }
    //           if(functionCall.methodName == 'create_resource_callback') {
    //             // TODO: log event, to make sure contract creation has been successful - only then store to db
    //             console.log(JSON.stringify(functionCall))
    //           }
    //         }
    //       })
    //     }
    //   }
    // })
}

// function parseArgs(s: string) {
//   const argsString = Buffer.from(s, 'base64').toString('utf8')
//   return JSON.parse(argsString) 
// }

// let checkId 
//   if(checkId == undefined) {
//     checkId = db.prepare("SELECT * where id == (?)") 
//   }
//   checkId.run(args.id) 
let createResourceQuery : sqlite3.Statement
let addResourceImageQuery: sqlite3.Statement
let addResourceTagQuery: sqlite3.Statement
let createBookingQuery: sqlite3.Statement
let removeBookingQuery: sqlite3.Statement
function prepareStatements() {
  function nArgs(n: number) {
    return "?,".repeat(n).slice(0,-1)
  }
  createResourceQuery = db.prepare(`INSERT INTO resources VALUES (${nArgs(12)})`)
  addResourceImageQuery = db.prepare("INSERT INTO resource_images VALUES (?,?,?)")
  addResourceTagQuery = db.prepare("INSERT INTO resource_tags VALUES (?,?)")
  createBookingQuery = db.prepare(`INSERT INTO bookings VALUES (${nArgs(6)})`)
  removeBookingQuery = db.prepare(`DELETE FROM bookings WHERE resource_name == ? AND local_id == ?`)
}
function finalizePreparedStatements() {
  createResourceQuery.finalize() 
  addResourceImageQuery.finalize()
  addResourceTagQuery.finalize()
  createBookingQuery.finalize()
  removeBookingQuery.finalize()
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

async function handleCreateResource(data: any) {
  const name = data.name
  const owner = data.owner
  const rip = data.init_params

  console.log(`create_resource(${name}, \n${JSON.stringify(rip, null, ' ')})\n)`) 

  let [x, y, z] = transformCoordinates(rip.coordinates[0], rip.coordinates[1]) 

  createResourceQuery.run(
    name, 
    owner, 

    rip.title, 
    rip.description, 
    rip.contact, 

    rip.pricing.price_per_ms, 
    rip.pricing.price_per_booking, 
    rip.pricing.full_refund_period_ms, 

    x, y, z, 

    rip.min_duration_ms
  )
  if(rip.image_urls) {
    rip.image_urls.forEach((url: string, i: number) => {
      addResourceImageQuery.run(name, url, i)
    }) 
  }
  if(rip.tags) {
    rip.tags.forEach((tag: string) => {
      addResourceTagQuery.run(tag, name)
    }) 
  }

  // add new contract to the list
  resourceContractAccountIds.add(
    makeResourceContractAccountId(name)
  ) 
}

function makeResourceContractAccountId(resourceName: string) {
  return resourceName + "." + CONTACT_ADDR 
}

function connectToDb() {
  return new Promise<void>((resolve, reject) => {
    db = new sqlite3.Database(process.env.SQLITE_DB, err => {
      if(err) {
        reject("could not connect to the db") 
      } else {
        prepareStatements()
        resolve()
      }
    })
    db.configure('busyTimeout', 30000)
  })
}

interface ResourceNamesRow {
  name: string
}
function loadResourceContracts() {
  return new Promise<void>((resolve, reject) => {
    db.all("SELECT name from resources", {}, (err: any, rows: ResourceNamesRow[]) => {
      console.log(rows) 
      if(err) {
        reject("Failed to get list of current contracts from db") 
      } else {
        rows.forEach(
          row => {
            console.log(row.name)
            resourceContractAccountIds.add(
              makeResourceContractAccountId(row.name)
            ) 
          }
        ) 
        console.log("watching resources:" + Array.from(resourceContractAccountIds).join(', ')) 
        resolve()
      }
    }) 
  })
}

(async () => {
  await connectToDb()
  await loadResourceContracts()

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


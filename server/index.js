import { createServer } from 'node:http';
import { createReadStream } from 'node:fs'
import { Readable, Transform } from 'node:stream'
import { WritableStream, TransformStream } from 'node:stream/web'
import { setTimeout } from 'node:timers/promises'
import csvtojson from 'csvtojson'

const PORT = 3000;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': '*'
}

const checkHeaders = (request, response) => {
  if (request.method !== 'OPTIONS') return response.writeHead(200, headers)

  response.writeHead(204, headers)
  response.end()
}

const mapData = (chunk) => {
  const data = JSON.parse(Buffer.from(chunk))

  const mappedData = {
    title: data.title,
    description: data.description,
    url_anime: data.url_anime
  }

  return JSON.stringify(mappedData).concat('\n')
}

const requestListner = async (request, response) => {
  checkHeaders(request, response)

  if (request.method === 'OPTIONS') return


  let items = 0
  request.once('close', () => { console.log(`Connection was closed and ${items} items are sent.`) })

  Readable.toWeb(createReadStream('./animeflv.csv'))
    // step by step from each item
    .pipeThrough(Transform.toWeb(csvtojson()))
    .pipeThrough(new TransformStream({
      transform(chunk, controller) {
        controller.enqueue(mapData(chunk))
      }
    }))
    // the last step
    .pipeTo(new WritableStream({
      async write(chunk) {
        await setTimeout(200)
        items++
        response.write(chunk)
      },
      close() {
        response.end()
      }
    }))


  response.writeHead(200, headers)
}

const listner = () => { console.log(`Server is running at ${PORT}`) }

createServer(requestListner)
  .listen(PORT)
  .on('listening', listner);

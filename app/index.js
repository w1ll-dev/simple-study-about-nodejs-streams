const API_URL = 'http://localhost:3000'

function appendToHTML(element) {
  return new WritableStream({
    write({ title, description, url_anime }) {
      const card = `
        <article>
          <div class="text">
            <h3>${title}</h3>
            <p>${description}</p>
            <a href="${url_anime}">link</a>
          </div>
        </article>
      `
      element.innerHTML += card
    }
  })
}

function parseNDJSON(data) {
  let ndJSONBuffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      ndJSONBuffer += chunk
      const items = ndJSONBuffer.split('\n')
      items
        .slice(0, -1)
        .forEach(item => controller.enqueue(JSON.parse(item)))
      ndJSONBuffer = items[items.length - 1]
    },
    flush() {
      if (!ndJSONBuffer) return

      controller.enqueue(JSON.parse(ndJSONBuffer))
    }
  })

}

async function consumeAPI(signal) {
  const response = await fetch(API_URL, { signal })

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(parseNDJSON())
  // .pipeTo(new WritableStream({
  //   write(chunk) {
  //     console.log('chunk', chunk)
  //   }
  // }))

  return reader
}

const [start, stop, cards] = ['start', 'stop', 'cards'].map(item => document.getElementById(item))

let abortController = new AbortController()

start.addEventListener('click', async () => {
  const readable = await consumeAPI(abortController.signal)
  readable.pipeTo(appendToHTML(cards))
})

stop.addEventListener('click', () => {
  abortController.abort()
  console.log('aborting...')
  abortController = new AbortController()
})
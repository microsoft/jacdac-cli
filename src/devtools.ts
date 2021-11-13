import {
    JDBus,
    Packet,
    PACKET_PROCESS,
    printPacket,
    serializeToTrace,
} from "jacdac-ts"

/* eslint-disable @typescript-eslint/no-var-requires */
const WebSocket = require("faye-websocket")
const http = require("http")
const fs = require("fs")
const url = require("url")
const path = require("path")

const log = console.log
const debug = console.debug
const error = console.error

export async function devToolsCommand(options?: { packets?: boolean }) {
    const { packets } = options || {}
    const port = 8081

    debug(`starting dev tools...`)
    log(`   dashboard: http://localhost:${port}`)
    log(`   websocket: ws://localhost:${port}`)

    // start http server
    const clients: WebSocket[] = []
    const server = http.createServer(function (req, res) {
        //debug(`${req.method} ${req.url}`)

        // parse URL
        const parsedUrl = url.parse(req.url)
        // extract URL path
        let pathname = `.${parsedUrl.pathname}`
        if (pathname === "./") pathname = "./index.html"
        // based on the URL path, extract the file extension. e.g. .js, .doc, ...
        const ext = path.parse(pathname).ext
        // maps file extension to MIME typere
        const map = {
            ".ico": "image/x-icon",
            ".html": "text/html",
            ".js": "text/javascript",
        }

        const fname = path.join(__dirname, "../public", pathname)
        fs.exists(fname, exist => {
            if (!exist) {
                // if the file is not found, return 404
                res.statusCode = 404
                debug(`not found`)
                return
            }

            // if is a directory search for index file matching the extension
            //if (fs.statSync(fname).isDirectory()) fname += "index" + ext

            // read file from file system
            fs.readFile(fname, (err, data) => {
                if (err) {
                    res.statusCode = 500
                    debug(`error reading file`)
                } else {
                    // if the file is found, set Content-type and send data
                    res.setHeader("Content-type", map[ext] || "text/plain")
                    res.end(data)
                }
            })
        })
    })

    // passive bus to sniff packets
    const bus = new JDBus([], { client: false, disableRoleManager: true })
    bus.passive = true

    const processPacket = (message: ArrayBuffer, sender: string) => {
        const data = new Uint8Array(message)
        const pkt = Packet.fromBinary(data, bus.timestamp)
        pkt.sender = sender
        bus.processPacket(pkt)
    }

    server.on("upgrade", (request, socket, body) => {
        // is this a socket?
        if (WebSocket.isWebSocket(request)) {
            let client = new WebSocket(request, socket, body)
            const sender = Math.random() + ""
            clients.push(client)
            log(`client: connected (${clients.length} clients)`)
            client.on("message", event => {
                const { data } = event
                clients.filter(c => c !== client).forEach(c => c.send(data))
                processPacket(data, sender)
            })
            client.on("close", () => {
                const i = clients.indexOf(client)
                clients.splice(i, 1)
                client = undefined
                log(`client: disconnected (${clients.length} clients)`)
            })
            client.on("error", ev => error(ev))
        }
    })

    if (packets)
        bus.on(PACKET_PROCESS, (pkt: Packet) => {
            const str = printPacket(pkt, {
                showTime: true,
                skipRepeatedAnnounce: true,
                skipResetIn: true,
            })
            if (str) debug(serializeToTrace(pkt, 0))
        })

    bus.start()
    server.listen(port)
}

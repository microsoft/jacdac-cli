import {
    bufferConcat,
    ERROR,
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
const net = require("net")

const log = console.log
const debug = console.debug
const error = console.error

export async function devToolsCommand(options?: {
    packets?: boolean
    internet?: boolean
}) {
    const { packets, internet } = options || {}
    const port = 8081
    const tcpPort = 8082
    const listenHost = internet ? undefined : "127.0.0.1"

    debug(`starting dev tools...`)
    log(`   dashboard: http://localhost:${port}`)
    log(`   websocket: ws://localhost:${port}`)
    log(`   raw socket: tcp://localhost:${tcpPort}`)

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
    bus.on(ERROR, e => error(e))
    bus.passive = true

    const processPacket = (message: Buffer | Uint8Array, sender: string) => {
        const data = new Uint8Array(message)
        const pkt = Packet.fromBinary(data, bus.timestamp)
        pkt.sender = sender
        bus.processPacket(pkt)
    }

    function removeClient(client: WebSocket) {
        const i = clients.indexOf(client)
        clients.splice(i, 1)
        log(`client: disconnected (${clients.length} clients)`)
    }

    server.on("upgrade", (request, socket, body) => {
        // is this a socket?
        if (WebSocket.isWebSocket(request)) {
            const client = new WebSocket(request, socket, body)
            const sender = Math.random() + ""
            clients.push(client)
            log(`client: connected (${clients.length} clients)`)
            client.on("message", event => {
                const { data } = event
                clients.filter(c => c !== client).forEach(c => c.send(data))
                processPacket(data, sender)
            })
            client.on("close", () => removeClient(client))
            client.on("error", ev => error(ev))
        }
    })

    const tcpServer = net.createServer(client => {
        const sender = Math.random() + ""
        client.send = (pkt0: Buffer) => {
            const pkt = new Uint8Array(pkt0)
            const b = new Uint8Array(1 + pkt.length)
            b[0] = pkt.length
            b.set(pkt, 1)
            client.write(b)
        }
        clients.push(client)
        log(`client: connected (${clients.length} clients)`)
        let acc: Uint8Array
        client.on("data", (buf: Uint8Array) => {
            if (acc) {
                buf = bufferConcat(acc, buf)
                acc = null
            } else {
                buf = new Uint8Array(buf)
            }
            while (buf) {
                const endp = buf[0] + 1
                if (buf.length >= endp) {
                    const pkt = buf.slice(1, endp)
                    if (buf.length > endp) buf = buf.slice(endp)
                    else buf = null
                    clients
                        .filter(c => c !== client)
                        // this should really be pkt.buffer to get ArrayBuffer but faye-websocket doesn't like that
                        .forEach(c => c.send(Buffer.from(pkt)))
                    processPacket(pkt, sender)
                } else {
                    acc = buf
                    buf = null
                }
            }
        })
        client.on("end", () => removeClient(client))
        client.on("error", ev => error(ev))
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
    server.listen(port, listenHost)
    tcpServer.listen(tcpPort, listenHost)
}

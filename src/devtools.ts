import {
    bufferConcat,
    ERROR,
    JDBus,
    Packet,
    PACKET_PROCESS,
    printPacket,
    serializeToTrace,
} from "jacdac-ts"
import { createTransports, TransportsOptions } from "./transports"

/* eslint-disable @typescript-eslint/no-var-requires */
const WebSocket = require("faye-websocket")
const http = require("http")
const https = require("https");
const url = require("url")
const net = require("net")

const log = console.log
const debug = console.debug
const error = console.error

function fetchProxy(): Promise<string> {
    const url = "https://microsoft.github.io/jacdac-docs/devtools/proxy";
    return new Promise<string>((resolve, reject) => {
        https.get(url, res => {
            if (res.statusCode != 200)
                reject(new Error(`proxy download failed (${res.statusCode})`))
            res.setEncoding("utf8");
            let body = "";
            res.on("data", data => body += data );
            res.on("end", () => resolve(body));
            res.on("error", e => reject(e));
        });    
    })
}

export async function devToolsCommand(
    options?: {
        packets?: boolean
        internet?: boolean
    } & TransportsOptions
) {
    const { packets, internet } = options || {}
    const port = 8081
    const tcpPort = 8082
    const listenHost = internet ? undefined : "127.0.0.1"

    const transports = createTransports(options)

    log(`Jacdac dev tools`)
    log(`   dashboard: http://localhost:${port}`)
    log(`   websocket: ws://localhost:${port}`)
    log(`   raw socket: tcp://localhost:${tcpPort}`)

    // download proxy sources
    //debug(`downloading proxy sources`)
    const proxyHtml = await fetchProxy()

    // start http server
    //debug(`starting proxy web server`)
    const clients: WebSocket[] = []
    const server = http.createServer(function (req, res) {
        const parsedUrl = url.parse(req.url)
        const pathname = parsedUrl.pathname
        if (pathname === "/") {
            res.setHeader("Cache-control", "no-cache")
            res.setHeader("Content-type", "text/html")
            res.end(proxyHtml);
        }
        else {
            res.statusCode = 404
        }
    });

    // passive bus to sniff packets
    const bus = new JDBus(transports, {
        client: false,
        disableRoleManager: true,
        proxy: true,
    })
    bus.on(ERROR, e => error(e))
    bus.passive = transports.length === 0

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
            try {
                client.write(b)
            } catch {
                try {
                    client.end()
                } catch {} // eslint-disable-line no-empty
            }
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
    bus.connect(true)
    server.listen(port, listenHost)
    tcpServer.listen(tcpPort, listenHost)
}

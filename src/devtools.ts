import {
    bufferConcat,
    ERROR,
    JDBus,
    Packet,
    PACKET_PROCESS,
    printPacket,
    serializeToTrace,
    createProxyBridge,
    randomDeviceId,
    PACKET_RECEIVE_NO_DEVICE,
    Flags,
    JDFrameBuffer,
    FRAME_PROCESS,
    JSONTryParse,
    prettySize,
} from "jacdac-ts"
import { enableLogging } from "./jdlogging"
import { createTransports, TransportsOptions } from "./transports"

const SENDER_FIELD = "__jacdac_sender"
/* eslint-disable @typescript-eslint/no-var-requires */
const WebSocket = require("faye-websocket")
import http from "http"
import https from "https"
import url from "url"
import net from "net"
import fs from "fs"

const log = console.log
const debug = console.debug
const error = console.error

function fetchProxy(localhost: boolean): Promise<string> {
    const protocol = localhost ? http : https
    const url = localhost
        ? "http://localhost:8000/devtools/proxy.html"
        : "https://microsoft.github.io/jacdac-docs/devtools/proxy"
    console.debug(`fetch devtools proxy at ${url}`)
    return new Promise<string>((resolve, reject) => {
        protocol
            .get(url, res => {
                if (res.statusCode != 200)
                    reject(
                        new Error(`proxy download failed (${res.statusCode})`)
                    )
                res.setEncoding("utf8")
                let body = ""
                res.on("data", data => (body += data))
                res.on("end", () => {
                    if (localhost) {
                        body = body.replace(
                            /https:\/\/microsoft.github.io\/jacdac-docs\/dashboard/g,
                            "http://localhost:8000/dashboard"
                        )
                    }
                    resolve(body)
                })
                res.on("error", reject)
            })
            .on("error", reject)
    })
}

export async function devToolsCommand(
    options?: {
        packets?: boolean
        internet?: boolean
        logging?: boolean
        trace?: string
        diagnostics?: boolean
        localhost?: boolean
        jacscript?: string
    } & TransportsOptions
) {
    const {
        packets,
        internet,
        trace,
        logging,
        diagnostics,
        localhost,
        jacscript: jacscriptFile,
    } = options || {}
    const port = 8081
    const tcpPort = 8082
    const listenHost = internet ? undefined : "127.0.0.1"

    if (diagnostics) Flags.diagnostics = true
    if (trace) fs.writeFileSync(trace, "")

    log(`Jacdac dev tools`)
    log(`   dashboard: http://localhost:${port}`)
    log(`   websocket: ws://localhost:${port}`)
    log(`   raw socket: tcp://localhost:${tcpPort}`)

    // download proxy sources
    const proxyHtml = await fetchProxy(localhost)

    // start http server
    const clients: WebSocket[] = []

    // upload jacscript file is needed
    const sendJacscript = jacscriptFile
        ? () => {
              const source = fs.readFileSync(jacscriptFile, {
                  encoding: "utf-8",
              })
              console.debug(`refresh jacscript (${prettySize(source.length)})`)
              const msg = JSON.stringify({
                  type: "source",
                  channel: "jacscript",
                  source,
              })
              clients.forEach(c => c.send(msg))
          }
        : undefined

    const server = http.createServer(function (req, res) {
        const parsedUrl = url.parse(req.url)
        const pathname = parsedUrl.pathname
        if (pathname === "/") {
            res.setHeader("Cache-control", "no-cache")
            res.setHeader("Content-type", "text/html")
            res.end(proxyHtml)
        } else {
            res.statusCode = 404
        }
    })

    // passive bus to sniff packets

    const transports = createTransports(options)
    const bus = new JDBus(transports, {
        client: false,
        disableRoleManager: true,
        proxy: true,
    })
    bus.passive = true
    bus.on(ERROR, e => error(e))
    const forwardFrame = (frame: JDFrameBuffer) => {
        if (trace)
            fs.appendFileSync(trace, serializeToTrace(frame, 0, bus) + "\n")
        clients
            .filter(c => (c as any)[SENDER_FIELD] !== frame._jacdac_sender)
            .forEach(c => c.send(Buffer.from(frame)))
    }
    const bridge = createProxyBridge((data, sender) => {
        // note that this is not invoked on bridge.receiveFrameOrPacket(), since these are our own frames
        // FRAME_PROCESS event below is invoked for all frames
    })
    bridge.on(FRAME_PROCESS, forwardFrame)
    bus.addBridge(bridge)
    const processMessage = (message: string, sender: string) => {
        const msg = JSONTryParse(message)
        if (!msg) return
        console.debug(msg)
    }
    const processPacket = (message: Buffer | Uint8Array, sender: string) => {
        const data = new Uint8Array(message)
        bridge.receiveFrameOrPacket(data, sender)
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
            const sender = "ws" + randomDeviceId()
            let firstJacscript = false
            // store sender id to deduped packet
            client[SENDER_FIELD] = sender
            clients.push(client)
            log(`client: connected (${sender}, ${clients.length} clients)`)
            client.on("message", (event: any) => {
                const { data } = event
                if (typeof data === "string") processMessage(data, sender)
                else processPacket(data, sender)
                if (!firstJacscript && sendJacscript) {
                    firstJacscript = true
                    sendJacscript()
                }
            })
            client.on("close", () => removeClient(client))
            client.on("error", (ev: Error) => error(ev))
        }
    })

    const tcpServer = net.createServer((client: any) => {
        const sender = "tcp" + randomDeviceId()
        client[SENDER_FIELD] = sender
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
        log(`client: connected (${sender} ${clients.length} clients)`)
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
                    processPacket(pkt, sender)
                } else {
                    acc = buf
                    buf = null
                }
            }
        })
        client.on("end", () => removeClient(client))
        client.on("error", (ev: Error) => error(ev))
    })

    if (packets)
        bus.on([PACKET_RECEIVE_NO_DEVICE, PACKET_PROCESS], (pkt: Packet) => {
            // don't print everything...
            const str = printPacket(pkt, {
                showTime: true,
                skipRepeatedAnnounce: true,
                skipResetIn: true,
            })
            if (str && packets) debug(str)
        })

    if (logging) enableLogging(bus)

    bus.start()
    bus.connect(true)
    server.listen(port, listenHost)
    tcpServer.listen(tcpPort, listenHost)

    if (sendJacscript) {
        console.debug(`watch ${jacscriptFile}`)
        fs.watch(jacscriptFile, async (eventType, filename) => {
            sendJacscript()
        })
    }
}

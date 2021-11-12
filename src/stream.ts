import {
    PACKET_PROCESS,
    PACKET_SEND,
    WEBSOCKET_TRANSPORT,
    createUSBTransport,
    createNodeUSBOptions,
    JDBus,
    printPacket,
    Packet,
    createNodeWebSerialTransport,
    Transport,
    serializeToTrace,
    isCancelError,
} from "jacdac-ts"

const log = console.log
const debug = console.debug
const error = console.error

export async function streamCommand(
    options: {
        usb?: boolean
        serial?: boolean
        ws?: boolean
        catalog?: boolean
        port?: number
        packets?: boolean
        sensors?: boolean
    } = {}
) {
    if (!options.usb && !options.serial) options.usb = options.serial = true

    const transports: Transport[] = []
    if (options.usb) {
        debug(`adding USB transport`)
        debug(
            `on windows, node.js will crash if you haven't setup libusb properly...`
        )
        transports.push(createUSBTransport(createNodeUSBOptions()))
    }
    if (options.serial) {
        debug(`adding serial transport`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }

    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    if (options.ws) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ws = require("ws")
        const port = options.port || 8080
        const urls = [`http://localhost:${port}/`, `http://127.0.0.1:${port}/`]
        log(`starting web socket server`)
        urls.forEach(url => debug(`\t${url}`))
        const wss = new ws.WebSocketServer({ port })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wss.on("connection", (ws: any) => {
            debug(`ws: client connected`)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ws.on("message", (message: any) => {
                const data = new Uint8Array(message as ArrayBuffer)
                const pkt = Packet.fromBinary(data, bus.timestamp)
                pkt.sender = WEBSOCKET_TRANSPORT
                bus.processPacket(pkt)
            })
            const cleanup = bus.subscribe(
                [PACKET_PROCESS, PACKET_SEND],
                (pkt: Packet) => {
                    ws.send(pkt.toBuffer())
                }
            )
            ws.on("close", () => {
                debug(`ws: client disconnected`)
                cleanup?.()
            })
        })
        wss.on("error", error)
    }
    if (options.packets)
        bus.on(PACKET_PROCESS, (pkt: Packet) => {
            const str = printPacket(pkt, {
                showTime: true,
                skipRepeatedAnnounce: true,
                skipResetIn: true,
            })
            if (str) debug(serializeToTrace(pkt, 0))
        })
    bus.streaming = !!options.sensors
    bus.start()
    const run = async () => {
        try {
            await bus.connect()
        } catch (e) {
            if (!isCancelError(e)) error(e)
        }
    }
    run()
}

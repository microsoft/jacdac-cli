import {
    PACKET_PROCESS,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
    PACKET_SEND,
    WEBSOCKET_TRANSPORT,
    createUSBTransport,
    createNodeUSBOptions,
    JDBus,
    printPacket,
    parseLogicLog,
    replayLogicLog,
    Packet,
    createNodeWebSerialTransport,
    Transport,
    serializeToTrace,
    isCancelError,
} from "jacdac-ts"
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFileSync } = require("fs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { program } = require("commander")
import type { CommandOptions } from "commander"

const log = console.log
const debug = console.debug
const error = console.error

async function mainCli() {
    const createCommand = (name: string, opts?: CommandOptions) => {
        const cmd = program.command(name, opts)
        return cmd
    }

    log(`jacdac cli`)

    createCommand("parse")
        .argument("<file>", "logic analyzer log file")
        .description("parse a Logic analyzer trace and replay packets")
        .action(parseCommand)

    createCommand("stream")
        .option("--sensors", "stream sensors data")
        .option("-u, --usb", "listen to Jacdac over USB")
        .option("-s, --serial", "listen to Jacdac over SERIAL")
        .option("-p, --packets", "show all packets")
        .option("--ws", "start web socket server")
        .option("--port <number>", "specify custom web socket server port")
        .option("--devices <string>", "regular expression filter for devices")
        .option("--services <string>", "regular expression filter for services")
        .option("--rm", "delete files from output folder")
        .option("--catalog", "generate .json files for device catalog")
        .action(streamCommand)

    await program.parseAsync(process.argv)
}

async function mainWrapper() {
    try {
        await mainCli()
    } catch (e) {
        error("Exception: " + e.stack)
        error("Build failed")
        process.exit(1)
    }
}

mainWrapper()

async function streamCommand(
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

async function parseCommand(file: string) {
    const bus = new JDBus([], { client: false })
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    bus.on(PACKET_RECEIVE, pkt => log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_ANNOUNCE, pkt => log(printPacket(pkt, opts)))

    const text = readFileSync(file, "utf8")
    replayLogicLog(bus, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}

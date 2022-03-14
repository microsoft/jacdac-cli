import {
    JDBus,
    PACKET_RECEIVE,
    PACKET_RECEIVE_ANNOUNCE,
    PACKET_RECEIVE_NO_DEVICE,
    parseLogicLog,
    printPacket,
    replayLogicLog,
} from "jacdac-ts"
import { readFileSync } from "fs"

const log = console.log

export async function parseCommand(file: string) {
    const bus = new JDBus([], { client: false })
    const opts = {
        skipRepeatedAnnounce: false,
        showTime: true,
    }
    bus.on(PACKET_RECEIVE, pkt => log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_ANNOUNCE, pkt => log(printPacket(pkt, opts)))
    bus.on(PACKET_RECEIVE_NO_DEVICE, pkt => log(printPacket(pkt, opts)))
    const text = readFileSync(file, "utf8")
    replayLogicLog(bus, parseLogicLog(text), Number.POSITIVE_INFINITY)
    setTimeout(() => process.exit(0), 500)
}

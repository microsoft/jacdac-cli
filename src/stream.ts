import {
    PACKET_PROCESS,
    JDBus,
    printPacket,
    Packet,
    isCancelError,
} from "jacdac-ts"
import { createTransports, TransportsOptions } from "./transports"

const log = console.log
const debug = console.debug
const error = console.error

export async function streamCommand(
    options: {
        catalog?: boolean
        packets?: boolean
        sensors?: boolean
    } & TransportsOptions = {}
) {
    const transports = createTransports(options)
    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    if (options.packets)
        bus.on(PACKET_PROCESS, (pkt: Packet) => {
            const str = printPacket(pkt, {
                showTime: true,
            })
            if (str) debug(str)
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

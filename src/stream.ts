import {
    PACKET_PROCESS,
    createUSBTransport,
    createNodeUSBOptions,
    JDBus,
    printPacket,
    Packet,
    createNodeWebSerialTransport,
    createNodeSPITransport,
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
        spi?: boolean
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
        log(`adding USB transport`)
        log(`make sure to install the webusb package`)
        debug(
            `on windows, node.js will crash if you haven't setup libusb properly...`
        )
        transports.push(createUSBTransport(createNodeUSBOptions()))
    }
    if (options.serial) {
        log(`adding serial transport`)
        log(`make sure to install the serialport package`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }
    if (options.spi) {
        log(`adding SPI transport`)
        log(`make sure to install the rpio package`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeSPITransport(require("rpio")))
    }

    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
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

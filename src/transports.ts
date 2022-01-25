import {
    createNodeUSBOptions,
    createNodeWebSerialTransport,
    createUSBTransport,
    createNodeSPITransport,
    Transport,
} from "jacdac-ts"
const log = console.log
const debug = console.debug

export interface TransportsOptions {
    usb?: boolean
    serial?: boolean
    ws?: boolean
    port?: number
    spi?: boolean
}

export function createTransports(options: TransportsOptions) {
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

    return transports
}

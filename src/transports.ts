import {
    createNodeUSBOptions,
    createNodeWebSerialTransport,
    createUSBTransport,
    createNodeSPITransport,
    Transport,
} from "jacdac-ts"
const log = console.log
//const debug = console.debug

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
        log(`adding USB transport (requires "usb" package)`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createUSBTransport(createNodeUSBOptions(require("usb").WebUSB)))
    }
    if (options.serial) {
        log(`adding serial transport (requires "serialport" package)`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeWebSerialTransport(require("serialport")))
    }
    if (options.spi) {
        log(`adding SPI transport (requires "rpio" package)`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        transports.push(createNodeSPITransport(require("rpio")))
    }

    return transports
}

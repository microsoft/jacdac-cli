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
        const usb = require("usb")
        const options = createNodeUSBOptions(usb.WebUSB)
        transports.push(createUSBTransport(options))
    }
    if (options.serial) {
        log(`adding serial transport (requires "serialport" package)`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SerialPort = require("serialport")
        transports.push(createNodeWebSerialTransport(SerialPort))
    }
    if (options.spi) {
        log(`adding SPI transport (requires "rpio" package)`)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const RPIO = require("rpio")
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const SpiDev = require("spi-device")
        transports.push(createNodeSPITransport(RPIO, SpiDev))
    }

    return transports
}

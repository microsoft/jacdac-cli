import { readFileSync } from "fs"
import {
    delay,
    DEVICE_ANNOUNCE,
    JacscriptManagerCmd,
    JDBus,
    JDDevice,
    OutPipe,
    prettySize,
    sha256,
    SRV_JACSCRIPT_MANAGER,
    toHex,
} from "jacdac-ts"
import { createTransports, TransportsOptions } from "./transports"

const log = console.log
const debug = console.debug
const error = console.error

export async function deployCommand(
    file: string,
    options: TransportsOptions = {}
) {
    const bytecode = readFileSync(file)
    const sha = await sha256([bytecode])

    log(`jacscript bytecode ${prettySize(bytecode.length)}, ${toHex(sha)}`)

    const transports = createTransports(options)
    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.start()
    bus.on(DEVICE_ANNOUNCE, (device: JDDevice) => debug(`announce ${device}`))

    // connect to a bus
    await bus.connect()

    // allow devices to enumerate
    await delay(1000)

    // deploy to services on bus
    const services = bus.services({ serviceClass: SRV_JACSCRIPT_MANAGER })
    for (const service of services) {
        log(`deploy to ${service}`)
        await OutPipe.sendBytes(
            service,
            JacscriptManagerCmd.DeployBytecode,
            bytecode
        )
    }
}

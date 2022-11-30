import { readFileSync } from "fs"
import {
    delay,
    DeviceScriptManagerCmd,
    JDBus,
    OutPipe,
    prettySize,
    sha256,
    SRV_DEVICE_SCRIPT_MANAGER,
    toHex,
} from "jacdac-ts"
import { createTransports, TransportsOptions } from "./transports"

const log = console.log

export async function deployCommand(
    file: string,
    options: TransportsOptions = {}
) {
    const bytecode = readFileSync(file)
    const sha = await sha256([bytecode])

    log(`bytecode ${prettySize(bytecode.length)}, ${toHex(sha)}`)

    const transports = createTransports(options)
    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.start()

    // connect to a bus
    await bus.connect()

    // allow devices to enumerate
    await delay(1000)

    // deploy to services on bus
    const services = bus.services({ serviceClass: SRV_DEVICE_SCRIPT_MANAGER })
    log(`found ${services.length} managers`)

    for (const service of services) {
        log(`deploy to ${service}`)
        await OutPipe.sendBytes(
            service,
            DeviceScriptManagerCmd.DeployBytecode,
            bytecode
        )
    }

    process.exit(services.length > 0 ? 0 : -1)
}

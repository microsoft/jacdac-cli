import { readFileSync } from "fs"
import {
    delay,
    JacscriptManagerCmd,
    JDBus,
    OutPipe,
    prettySize,
    sha256,
    SRV_JACSCRIPT_MANAGER,
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

    log(`jacscript bytecode ${prettySize(bytecode.length)}, ${toHex(sha)}`)

    const transports = createTransports(options)
    log(`starting bus...`)
    const bus = new JDBus(transports, { client: false })
    bus.start()

    // connect to a bus
    await bus.connect()

    // allow devices to enumerate
    await delay(1000)

    // deploy to services on bus
    const services = bus.services({ serviceClass: SRV_JACSCRIPT_MANAGER })
    log(`found ${services.length} jacscript managers`)

    for (const service of services) {
        log(`deploy to ${service}`)
        await OutPipe.sendBytes(
            service,
            JacscriptManagerCmd.DeployBytecode,
            bytecode
        )
    }

    process.exit(services.length > 0 ? 0 : -1)
}

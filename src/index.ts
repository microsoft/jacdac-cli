// eslint-disable-next-line @typescript-eslint/no-var-requires
import { program } from "commander"
import type { CommandOptions } from "commander"
import { devToolsCommand } from "./devtools"
import { parseCommand } from "./parse"
import { streamCommand } from "./stream"
import { deployCommand } from "./deploy"

const log = console.log
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
        .option("-u, --usb", "listen to Jacdac over USB (requires usb)")
        .option(
            "-s, --serial",
            "listen to Jacdac over SERIAL (requires serialport)"
        )
        .option(
            "-i, --spi",
            "listen to Jacdac over SPI (requires rpio, experimental)"
        )
        .option("-p, --packets", "show all packets")
        .option("--devices <string>", "regular expression filter for devices")
        .option("--services <string>", "regular expression filter for services")
        .option("--rm", "delete files from output folder")
        .option("--catalog", "generate .json files for device catalog")
        .action(streamCommand)

    createCommand("devtools")
        .option("-p, --packets", "show all packets")
        .option("-l, --logging", "print out device log messages as they come")
        .option("-t, --trace <string>", "save all packets to named file")
        .option("-w, --internet", "allow connections from non-localhost")
        .option("-u, --usb", "listen to Jacdac over USB (requires usb)")
        .option("-d, --diagnostics", "print more debug info")
        .option(
            "-s, --serial",
            "listen to Jacdac over SERIAL (requires serialport)"
        )
        .option(
            "-i, --spi",
            "listen to Jacdac over SPI (requires rpio, experimental)"
        )
        .option(
            "--localhost",
            "use localhost:8000 instead of the internet dashboard"
        )
        .option(
            "-j, --jacscript <string>",
            "upload and watch source of local jacscript file"
        )
        .action(devToolsCommand)

    createCommand("deploy")
        .description("deploy a jacscript program (as bytecode) to devices")
        .argument("<file>", "jacscript bytecode file")
        .option("-u, --usb", "listen to Jacdac over USB (requires usb)")
        .option(
            "-s, --serial",
            "listen to Jacdac over SERIAL (requires serialport)"
        )
        .option(
            "-i, --spi",
            "listen to Jacdac over SPI (requires rpio, experimental)"
        )
        .option("--devices <string>", "regular expression filter for devices")
        .action(deployCommand)

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

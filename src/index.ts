// eslint-disable-next-line @typescript-eslint/no-var-requires
const { program } = require("commander")
import type { CommandOptions } from "commander"
import { devToolsCommand } from "./devtools"
import { parseCommand } from "./parse"
import { streamCommand } from "./stream"

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
        .option("-u, --usb", "listen to Jacdac over USB")
        .option("-s, --serial", "listen to Jacdac over SERIAL")
        .option("-p, --packets", "show all packets")
        .option("--ws", "start web socket server")
        .option("--port <number>", "specify custom web socket server port")
        .option("--devices <string>", "regular expression filter for devices")
        .option("--services <string>", "regular expression filter for services")
        .option("--rm", "delete files from output folder")
        .option("--catalog", "generate .json files for device catalog")
        .action(streamCommand)

    createCommand("devtools")
        .option("-p, --packets", "show all packets")
        .action(devToolsCommand)

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

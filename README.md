> [!IMPORTANT]
> This repository has moved to https://github.com/jacdac/jacdac-cli
 
# Jacdac CLI

A command line interface to support various tasks using Jacdac.

**Jacdac** is a plug-and-play hardware/software stack
for **microcontrollers** and their peripherals (sensors/actuators),
with applications to rapid prototyping, making, and physical computing.

This repository contains a command line interface tool for the [Jacdac](https://aka.ms/jacdac) protocol.

-   **[Jacdac Protocol Documentation](https://aka.ms/jacdac/)**
-   **[CLI Documentation](https://microsoft.github.io/jacdac-docs/clients/cli/)**
-   Discussions at https://github.com/microsoft/jacdac/discussions
-   Issues are tracked on https://github.com/microsoft/jacdac/issues

The rest of this page is for developers of the `jacdac-ts` library.

## Installation

-   Install [nodejs.org](https://nodejs.org/) 14+
-   Install the tool globally.

```bash
sudo npm install -g jacdac-cli
```

If the native module installation fails, try adding `--unsafe`

```bash
sudo npm install -g jacdac-cli --unsafe
```

## Usage

### `jacdac parse`

Parses a logic analyzer log and replays the packets

```
jacdac parse log.txt
```

### `jacdac devtools`

Starts websocket and native socket server that acts as a bridge between a web dashboard and a client implementation. 
This allows to test a native client using the latest version of the web developer tools.
This command will work in [GitHub codespaces](https://github.com/features/codespaces). 

```
jacdac devtools
```

#### `jacdac devtools --device-script <file>`

Starts the devtools web site and also watches/uploads the source of a given [DeviceScript](https://aka.ms/devicescript) to the development web site. The dev web site will automatically compile and potentially deploy the DeviceScript program to a connected device.

## Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.


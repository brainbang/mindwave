// This records a serial stream to disk

import SerialPort from '@serialport/stream'
import Binding from '@serialport/bindings'
import { createWriteStream } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const out = createWriteStream(`${__dirname}/log.bin`)

SerialPort.Binding = Binding
const serialPort = new SerialPort('/dev/rfcomm0', { baudRate: 57600 })

serialPort.pipe(out)

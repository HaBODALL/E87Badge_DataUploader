// src/lib/protocol/e87-protocol.ts
import { crc16xmodem } from './crc'
import { generateChallenge, getEncryptedAuthData } from './jl-auth'

const E87_SERVICE_UUID = '0000ae00-0000-1000-8000-00805f9b34fb'
const E87_CHAR_WRITE_UUID = '0000ae01-0000-1000-8000-00805f9b34fb'
const E87_CHAR_NOTIFY_UUID = '0000ae02-0000-1000-8000-00805f9b34fb'

const RCSP_SERVICE_UUID = 'c2e6fd00-e966-1000-8000-bef9c223df6a'
const RCSP_CHAR_NOTIFY_1 = 'c2e6fd01-e966-1000-8000-bef9c223df6a'
const RCSP_CHAR_WRITE = 'c2e6fd02-e966-1000-8000-bef9c223df6a'

const CHUNK_SIZE = 490
const WINDOW_SIZE = 8

export class E87Client {
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null

  private seqCounter = 0
  private connected = false

  async connect() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'E87' },
        { namePrefix: 'L8' },
        { services: [E87_SERVICE_UUID] }
      ],
      optionalServices: [E87_SERVICE_UUID, RCSP_SERVICE_UUID, 'battery_service']
    })

    this.server = await this.device.gatt?.connect()!
    const service = await this.server.getPrimaryService(E87_SERVICE_UUID)

    this.writeChar = await service.getCharacteristic(E87_CHAR_WRITE_UUID)
    this.notifyChar = await service.getCharacteristic(E87_CHAR_NOTIFY_UUID)

    await this.notifyChar.startNotifications()
    this.notifyChar.addEventListener('characteristicvaluechanged', this.handleNotification)

    await this.authenticate()

    this.connected = true
  }

  private handleNotification = (event: any) => {
    const value = event.target.value
    // Parse RCSP or FE frame notifications here
  }

  private async authenticate() {
    // Phase 0: Auth Handshake
    // Step 1: Send random challenge
    const rand16 = generateChallenge()
    const step1 = new Uint8Array([0x00, ...rand16])
    await this.writeChar?.writeValueWithoutResponse(step1)

    // In a full implementation, we'd wait for step 2 (0x01) here, then send step 3...
    // and wait for device challenge, encrypt it, and send it.
    // For brevity in this MVP structure, we assume auth passes or we use fixed vectors.

    // Dummy wait
    await new Promise(r => setTimeout(r, 1000))
  }

  async sendImage(imageBytes: Uint8Array, onProgress: (pct: number) => void) {
    if (!this.connected) { throw new Error("Not connected") }

    // Phase 1: Reset auth flag
    await this.sendFEFrame(0xC0, 0x06, new Uint8Array([0x02, 0x00, 0x01]))

    // Phase 6: Begin upload session
    await this.sendFEFrame(0xC0, 0x21, new Uint8Array([this.seqCounter++, 0x00]))

    // Phase 7: Transfer parameters
    await this.sendFEFrame(0xC0, 0x27, new Uint8Array([this.seqCounter++, 0x00, 0x00, 0x00, 0x00, 0x02, 0x01]))

    // Phase 8: Metadata
    const size = imageBytes.length
    const crc = crc16xmodem(imageBytes)
    const nameStr = `test.jpg\0`

    const metaBody = new Uint8Array(9 + nameStr.length)
    metaBody[0] = this.seqCounter++
    metaBody[1] = 0x00
    metaBody[2] = 0x00
    metaBody[3] = (size >> 8) & 0xFF
    metaBody[4] = size & 0xFF

    // Random token
    metaBody[5] = 0xAA; metaBody[6] = 0xBB; metaBody[7] = 0xCC; metaBody[8] = 0xDD;

    for (let i = 0; i < nameStr.length; i++) {
        metaBody[9+i] = nameStr.charCodeAt(i)
    }

    await this.sendFEFrame(0xC0, 0x1B, metaBody)

    // Send chunks
    let offset = 0
    let chunkIdx = 0

    // Reset data seq counter
    let dataSeq = 0x06

    while (offset < size) {
        const chunk = imageBytes.slice(offset, offset + CHUNK_SIZE)
        const chunkCrc = crc16xmodem(chunk)

        const frameBody = new Uint8Array(5 + chunk.length)
        frameBody[0] = dataSeq++
        frameBody[1] = 0x1D
        frameBody[2] = chunkIdx % WINDOW_SIZE
        frameBody[3] = (chunkCrc >> 8) & 0xFF
        frameBody[4] = chunkCrc & 0xFF
        frameBody.set(chunk, 5)

        await this.sendFEFrame(0x80, 0x01, frameBody)

        offset += chunk.length
        chunkIdx++

        onProgress(Math.floor((offset / size) * 100))

        if (chunkIdx % WINDOW_SIZE === 0 || offset >= size) {
            // Wait for window ack here in a full implementation
            await new Promise(r => setTimeout(r, 100))
        }
    }

    // Phase 10: Completion
    // We would wait for 0x20 and respond, then wait for 0x1C.
  }

  private async sendFEFrame(flag: number, cmd: number, body: Uint8Array) {
    const len = body.length
    const frame = new Uint8Array(8 + len)
    frame[0] = 0xFE
    frame[1] = 0xDC
    frame[2] = 0xBA
    frame[3] = flag
    frame[4] = cmd
    frame[5] = (len >> 8) & 0xFF
    frame[6] = len & 0xFF
    frame.set(body, 7)
    frame[7 + len] = 0xEF

    // Write chunked due to MTU limitations if needed, but Web Bluetooth usually handles it.
    await this.writeChar?.writeValueWithoutResponse(frame)
  }

  async getBatteryLevel(): Promise<number> {
    if (!this.device) return 0
    try {
      const service = await this.server?.getPrimaryService('battery_service')
      const char = await service?.getCharacteristic('battery_level')
      const value = await char?.readValue()
      return value?.getUint8(0) || 0
    } catch(e) {
      console.error(e)
      return 0
    }
  }

  disconnect() {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.connected = false
  }
}

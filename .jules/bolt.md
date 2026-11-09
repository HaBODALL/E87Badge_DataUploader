## 2024-05-15 - CRC Bitwise Calculation on Main Thread
**Learning:** In a codebase heavily relying on chunked Web Bluetooth transfers (like this AuraCast project sending image files byte-by-byte), running a nested loop `O(n * 8)` CRC bitwise calculation on the main thread for every chunk causes unnecessary CPU load and potential micro-stutters during uploads. Even though it's relatively fast, precomputing the CRC table (`O(n)`) completely avoids any CPU spike during the crucial transfer phase.
**Action:** When working on protocols (like XMODEM, RCSP, or custom framing) that chunk data and sign each chunk with a CRC on the main thread, always use a table-driven approach instead of calculating bit-by-bit to maintain smooth UI and consistent throughput.

## 2024-05-16 - Array Spread Overhead in Byte to Hex Conversion
**Learning:** In highly active areas of the codebase like protocol debugging, continuously logging raw data chunks by spreading `Uint8Array` into `[...bytes]` and mapping over it to format strings is extremely expensive in Javascript. It requires memory allocations for intermediate arrays and overhead for string padding functions.
**Action:** When converting byte arrays to hex strings repeatedly (especially in Bluetooth log loops), use a pre-allocated array map (lookup table) of pre-padded strings for each byte `(0-255)`, looping sequentially over the array and doing simple string concatenation.

## 2026-10-25 - Zero-copy Views and ArrayBuffer Slice Overhead
**Learning:** `Uint8Array.prototype.slice()` and `ArrayBuffer.prototype.slice()` allocate new backing memory, which can cause significant overhead and GC pressure when repeatedly called in a hot loop (like a Bluetooth chunked upload). However, `Uint8Array.prototype.subarray()` creates a zero-copy view and is vastly faster. When an actual copy of an ArrayBuffer is needed (e.g. queueing Bluetooth notification events safely from a shared DataView), using `new Uint8Array(new Uint8Array(buffer, offset, length))` is approximately 9x faster than using `buffer.slice()`.
**Action:** Use `.subarray()` when extracting chunks for immediate sequential reading (like uploading payloads). Use `new Uint8Array(new Uint8Array(buffer, offset, length))` when safely cloning binary data off a volatile shared buffer (like Web Bluetooth characteristic value buffers).

## 2024-05-14 - TextDecoder caching
**Learning:** Instantiating `new TextDecoder()` inside high-frequency loops (like `parseFileBrowseResponse` or `tryAscii` which runs for every parsed attribute) adds unnecessary garbage collection pressure and main thread CPU load.
**Action:** Cache and reuse `TextDecoder` and `TextEncoder` instances at the module level whenever they don't depend on specific stream states.

## 2026-10-25 - Uint8Array Iterator Overhead
**Learning:** Using `for...of` loops to iterate over `Uint8Array` instances (e.g., in checksum calculations like `buildQixFrame` or simple parses like `tryAscii`) introduces noticeable iterator allocation overhead in JavaScript, especially when executed frequently during protocol communication.
**Action:** Always prefer traditional indexed `for` loops (`for (let i = 0; i < data.length; i++)`) for iterating over typed arrays like `Uint8Array` in hot paths to eliminate this overhead.

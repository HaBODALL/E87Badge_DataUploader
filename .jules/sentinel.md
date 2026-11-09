## 2026-11-09 - [Prevent Memory Leaks and DoS in Image Uploads]
**Vulnerability:** Memory exhaustion (DoS) and memory leaks via client-side image uploads and `URL.createObjectURL`.
**Learning:** Missing size validation on user-uploaded files can lead to DoS by memory exhaustion. Additionally, `URL.createObjectURL` allocates memory for Blob URLs that is never freed if `URL.revokeObjectURL` is not explicitly called when the image is no longer needed.
**Prevention:** Always enforce a strict file size limit (e.g., 10MB) before processing client-side uploads. Track and explicitly call `URL.revokeObjectURL` whenever a Blob URL is replaced, cleared, or successfully processed to prevent memory leaks.

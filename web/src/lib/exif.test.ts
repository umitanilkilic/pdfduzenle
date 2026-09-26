import { describe, expect, it } from "vitest";
import { jpegOrientation } from "./exif";

/** Minimal JPEG: SOI + APP1/Exif with one IFD entry for Orientation, then SOS. */
function jpegWithOrientation(orientation: number, littleEndian: boolean): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(26));
  tiff.setUint16(0, littleEndian ? 0x4949 : 0x4d4d);
  tiff.setUint16(2, 42, littleEndian);
  tiff.setUint32(4, 8, littleEndian);
  tiff.setUint16(8, 1, littleEndian);
  tiff.setUint16(10, 0x0112, littleEndian);
  tiff.setUint16(12, 3, littleEndian);
  tiff.setUint32(14, 1, littleEndian);
  tiff.setUint16(18, orientation, littleEndian);
  const exif = [0x45, 0x78, 0x69, 0x66, 0, 0, ...new Uint8Array(tiff.buffer)];
  const len = exif.length + 2;
  return Uint8Array.from([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...exif, 0xff, 0xda, 0, 2]);
}

describe("jpegOrientation", () => {
  it.each([true, false])("reads the tag (little endian: %s)", (little) => {
    expect(jpegOrientation(jpegWithOrientation(6, little))).toBe(6);
  });

  it("defaults to 1 without EXIF or for non-JPEG data", () => {
    expect(jpegOrientation(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBe(1);
    expect(jpegOrientation(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toBe(1);
    expect(jpegOrientation(new Uint8Array())).toBe(1);
  });

  it("does not read past truncated data", () => {
    expect(jpegOrientation(jpegWithOrientation(6, true).slice(0, 20))).toBe(1);
  });
});

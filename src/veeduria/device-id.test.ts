import { describe, expect, it } from "vitest";
import { DEVICE_ID_STORAGE_KEY, getLocalDeviceId } from "./device-id";

describe("getLocalDeviceId", () => {
  it("reutiliza UUID local y no guarda nombre", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    const first = getLocalDeviceId(storage, () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    const second = getLocalDeviceId(storage, () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(first).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(second).toBe(first);
    expect(mem.get(DEVICE_ID_STORAGE_KEY)).toBe(first);
    expect([...mem.keys()].join()).not.toMatch(/nombre|email|telefono/i);
  });
});

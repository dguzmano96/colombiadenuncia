export const DEVICE_ID_STORAGE_KEY = "cd-device-id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Kv = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): Kv | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function getLocalDeviceId(
  storage: Kv | null = defaultStorage(),
  uuid: () => string = () => crypto.randomUUID(),
): string {
  const existing = storage?.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing && UUID_RE.test(existing)) {
    return existing;
  }
  const id = uuid();
  storage?.setItem(DEVICE_ID_STORAGE_KEY, id);
  return id;
}

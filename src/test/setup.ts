import "fake-indexeddb/auto";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { resetDb } from "@/storage/db";

afterEach(async () => {
  cleanup();
  await resetDb();
});

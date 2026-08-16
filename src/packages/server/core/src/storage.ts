import type { Credential } from "./types";
import {
  createNextcloudWebDAVStorage,
  createNextcloudCalDAVStorage,
  createNextcloudCalDAVTaskStorage,
} from "@dav-worker/storage-nextcloud";

export type Storages = ReturnType<typeof createStorages>;

export function createStorages(credential: Credential) {
  return {
    file: createNextcloudWebDAVStorage(credential),
    calendar: createNextcloudCalDAVStorage(credential),
    task: createNextcloudCalDAVTaskStorage(credential),
  };
}

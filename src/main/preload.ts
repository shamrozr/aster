import { contextBridge } from "electron";

// Deliberately tiny. The renderer reaches the local agent directly over HTTP
// (127.0.0.1), so it needs no privileged Node bridge. We only expose static,
// non-sensitive metadata.
contextBridge.exposeInMainWorld("aster", {
  platform: process.platform,
  version: process.env.npm_package_version ?? "0.1.0",
});

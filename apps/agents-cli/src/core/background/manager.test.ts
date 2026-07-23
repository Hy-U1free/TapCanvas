import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BackgroundTaskManager } from "./manager.js";

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agents-background-"));
}

function createNodeCommand(source: string): string {
  return `${quoteShellArgument(process.execPath)} -e ${quoteShellArgument(source)}`;
}

function quoteShellArgument(value: string): string {
  if (process.platform === "win32") {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function waitForTask(
  manager: BackgroundTaskManager,
  taskId: string,
  timeoutMs = 3000
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const task = manager.get(taskId);
    if (task.status !== "running") return task;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`background task did not finish in time: ${taskId}`);
}

test("BackgroundTaskManager persists completion and emits notifications", async () => {
  const dir = createTempDir();
  const manager = new BackgroundTaskManager(dir);

  const task = manager.start({
    command: createNodeCommand("console.log('done')"),
    cwd: dir,
    requestedBy: "root",
  });
  const finished = await waitForTask(manager, task.id);

  assert.equal(finished.status, "completed");
  assert.match(finished.resultPreview, /done/);
  assert.match(manager.readOutput(task.id), /done/);

  const notifications = manager.drainNotifications("root");
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.taskId, task.id);
  assert.equal(notifications[0]?.status, "completed");
  assert.equal(manager.drainNotifications("root").length, 0);
});

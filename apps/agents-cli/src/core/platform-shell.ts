export type PlatformShellInvocation = {
  executable: string;
  args: string[];
  windowsVerbatimArguments?: boolean;
};

export function resolvePlatformShellInvocation(command: string): PlatformShellInvocation {
  if (process.platform === "win32") {
    const executable = process.env.ComSpec?.trim() || process.env.COMSPEC?.trim() || "cmd.exe";
    return {
      executable,
      args: ["/d", "/s", "/c", `"${command}"`],
      windowsVerbatimArguments: true,
    };
  }
  return {
    executable: "/bin/sh",
    args: ["-lc", command],
  };
}

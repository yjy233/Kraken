import fs from "node:fs/promises";
import path from "node:path";

export interface SandboxOptions {
  rootDir: string;
  allowedDirs?: string[];
  maxFileSizeBytes?: number;
}

export class Sandbox {
  private rootDir: string;
  private allowedDirs: string[];
  private maxFileSizeBytes: number;

  constructor(options: SandboxOptions) {
    this.rootDir = path.resolve(options.rootDir);
    const extras = options.allowedDirs?.map((dir) => path.resolve(dir)) ?? [];
    this.allowedDirs = [this.rootDir, ...extras];
    this.maxFileSizeBytes = options.maxFileSizeBytes ?? 1024 * 1024;
  }

  resolvePath(requestedPath: string): string {
    const resolved = path.isAbsolute(requestedPath)
      ? path.resolve(requestedPath)
      : path.resolve(this.rootDir, requestedPath);

    if (!this.isAllowed(resolved)) {
      throw new Error("Path is outside of sandbox allowlist");
    }

    return resolved;
  }

  async readFile(requestedPath: string): Promise<string> {
    const resolved = this.resolvePath(requestedPath);
    const stat = await fs.stat(resolved);
    if (stat.size > this.maxFileSizeBytes) {
      throw new Error("File too large for sandbox read");
    }
    return fs.readFile(resolved, "utf-8");
  }

  async writeFile(requestedPath: string, content: string): Promise<void> {
    const resolved = this.resolvePath(requestedPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, "utf-8");
  }

  async appendFile(requestedPath: string, content: string): Promise<void> {
    const resolved = this.resolvePath(requestedPath);
    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.appendFile(resolved, content, "utf-8");
  }

  async listDirectory(requestedPath: string): Promise<string[]> {
    const resolved = this.resolvePath(requestedPath);
    const stat = await fs.stat(resolved);

    if (!stat.isDirectory()) {
      throw new Error("Path is not a directory");
    }

    const entries = await fs.readdir(resolved, { withFileTypes: true });
    return entries.map((entry) => {
      const prefix = entry.isDirectory() ? "[DIR]  " : "[FILE] ";
      return prefix + entry.name;
    });
  }

  private isAllowed(resolvedPath: string): boolean {
    return this.allowedDirs.some((dir) => {
      const relative = path.relative(dir, resolvedPath);
      return !relative.startsWith("..") && !path.isAbsolute(relative);
    });
  }
}

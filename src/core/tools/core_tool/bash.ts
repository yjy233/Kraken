import type { ToolDefinition } from "../types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface BashInput {
  command: string;
  timeout?: number;
  cwd?: string;
}

export function createBashTool(): ToolDefinition<BashInput> {
  return {
    name: "bash",
    description: "Execute a bash command and return the output. Use for system operations, git commands, npm scripts, file operations, etc. BE CAREFUL with destructive commands.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "The bash command to execute (e.g., 'ls -la', 'git status', 'npm install')"
        },
        timeout: {
          type: "number",
          description: "Timeout in milliseconds (default: 30000ms / 30s, max: 300000ms / 5min)"
        },
        cwd: {
          type: "string",
          description: "Working directory for command execution (default: current directory)"
        }
      },
      required: ["command"]
    },
    async run(input, context) {
      try {
        // Validate timeout
        const timeout = Math.min(input.timeout ?? 30000, 300000);

        // Security: Log the command being executed
        context.logger.info(`[bash] Executing: ${input.command}`);

        // Execute command
        const { stdout, stderr } = await execAsync(input.command, {
          timeout,
          cwd: input.cwd,
          maxBuffer: 1024 * 1024 * 10, // 10MB max output
          shell: "/bin/bash"
        });

        // Combine stdout and stderr
        let output = "";
        if (stdout) output += stdout;
        if (stderr) {
          output += stderr ? (output ? "\n[stderr]:\n" + stderr : stderr) : "";
        }

        // Trim output if empty
        if (!output.trim()) {
          output = "(command executed successfully, no output)";
        }

        return {
          ok: true,
          content: output,
          data: { stdout, stderr }
        };
      } catch (error: any) {
        // Handle execution errors
        const errorMsg = error.message || String(error);
        let errorContent = `bash error: ${errorMsg}`;

        // Include stdout/stderr from failed command if available
        if (error.stdout || error.stderr) {
          errorContent += "\n\n";
          if (error.stdout) errorContent += `stdout:\n${error.stdout}\n`;
          if (error.stderr) errorContent += `stderr:\n${error.stderr}`;
        }

        // Check for specific error types
        if (error.killed) {
          errorContent = `bash error: Command timed out after ${input.timeout || 30000}ms`;
        }

        return {
          ok: false,
          content: errorContent,
          data: {
            stdout: error.stdout,
            stderr: error.stderr,
            code: error.code,
            signal: error.signal
          }
        };
      }
    }
  };
}

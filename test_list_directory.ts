/**
 * 测试 list_directory 工具
 */

import { Sandbox } from "./src/core/sandbox/Sandbox";
import { createListDirectoryTool } from "./src/core/tools/core_tool/list_directory";
import { createLogger } from "./src/core/utils/logger";

async function testListDirectory() {
  console.log("=== Testing list_directory Tool ===\n");

  // 创建 sandbox
  const sandbox = new Sandbox({
    rootDir: process.cwd(),
    allowedDirs: [process.cwd()],
    maxFileSizeBytes: 1024 * 1024
  });

  const logger = createLogger("info");

  // 创建工具
  const listDirTool = createListDirectoryTool();

  console.log("Tool name:", listDirTool.name);
  console.log("Tool description:", listDirTool.description);
  console.log("\n--- Test 1: List current directory ---");

  const result1 = await listDirTool.run(
    { path: "." },
    { sandbox, sessionId: "test", logger }
  );

  console.log("Success:", result1.ok);
  console.log("Content:\n" + result1.content);

  console.log("\n--- Test 2: List src directory ---");

  const result2 = await listDirTool.run(
    { path: "src" },
    { sandbox, sessionId: "test", logger }
  );

  console.log("Success:", result2.ok);
  console.log("Content:\n" + result2.content);

  console.log("\n--- Test 3: List src/core directory ---");

  const result3 = await listDirTool.run(
    { path: "src/core" },
    { sandbox, sessionId: "test", logger }
  );

  console.log("Success:", result3.ok);
  console.log("Content:\n" + result3.content);

  console.log("\n--- Test 4: Error - path is a file ---");

  const result4 = await listDirTool.run(
    { path: "package.json" },
    { sandbox, sessionId: "test", logger }
  );

  console.log("Success:", result4.ok);
  console.log("Content:", result4.content);

  console.log("\n--- Test 5: Error - path doesn't exist ---");

  const result5 = await listDirTool.run(
    { path: "nonexistent_directory" },
    { sandbox, sessionId: "test", logger }
  );

  console.log("Success:", result5.ok);
  console.log("Content:", result5.content);

  console.log("\n=== All tests completed ===");
}

// 运行测试
testListDirectory().catch(console.error);

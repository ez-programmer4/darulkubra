const fs = require("fs");
const path = require("path");

// Function to recursively find all TypeScript/JavaScript files
function findFiles(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (
      stat &&
      stat.isDirectory() &&
      !file.startsWith(".") &&
      file !== "node_modules"
    ) {
      results = results.concat(findFiles(filePath, extensions));
    } else if (extensions.some((ext) => file.endsWith(ext))) {
      results.push(filePath);
    }
  });

  return results;
}

// Function to remove console.log statements more carefully
function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;

    // More careful regex patterns
    // Remove single-line console.log statements
    content = content.replace(/console\.log\s*\([^)]*\);?\s*/g, "");

    // Remove multi-line console.log statements (more careful)
    content = content.replace(/console\.log\s*\([\s\S]*?\);?\s*/g, "");

    // Remove other console methods
    content = content.replace(
      /console\.(error|warn|info|debug)\s*\([^)]*\);?\s*/g,
      ""
    );
    content = content.replace(
      /console\.(error|warn|info|debug)\s*\([\s\S]*?\);?\s*/g,
      ""
    );

    // Clean up extra semicolons and empty lines
    content = content.replace(/;\s*;\s*/g, ";");
    content = content.replace(/\n\s*\n\s*\n/g, "\n\n");

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);

      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
const srcDir = path.join(__dirname, "..", "src");
const files = findFiles(srcDir);

let cleanedCount = 0;
files.forEach((file) => {
  if (removeConsoleLogs(file)) {
    cleanedCount++;
  }
});

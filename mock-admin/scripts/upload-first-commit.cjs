const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".artifacts", "node_modules"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(full, files);
    else files.push(full);
  }
  return files;
}

const files = collectFiles(process.cwd()).sort();
for (const file of files) {
  const relative = path.relative(process.cwd(), file);
  const content = fs.readFileSync(file).toString("base64");
  const payload = JSON.stringify({
    message: `chore: add ${relative}`,
    content
  });
  console.log(`Uploading ${relative}`);
  execFileSync("gh", [
    "api",
    "--method",
    "PUT",
    `repos/Yves-Cao/affiliate-mock-site/contents/${encodeURI(relative)}`,
    "--input",
    "-"
  ], { input: payload, stdio: ["pipe", "inherit", "inherit"] });
}

console.log(`Uploaded ${files.length} files`);

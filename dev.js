const { spawn } = require("child_process");
const path = require("path");

const root = __dirname;

const projects = [
  {
    name: "Direct Messages",
    cwd: "services/direct_messages",
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "Identity",
    cwd: "services/identity",
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "Notifications",
    cwd: "services/notifications",
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "Social",
    cwd: "services/social",
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "Web",
    cwd: "apps/web",
    command: "npm",
    args: ["run", "dev"],
  },
  {
    name: "Mobile",
    cwd: "apps/mobile",
    command: "npx",
    args: ["expo", "start", "--clear"],
  },
];

const processes = [];

for (const project of projects) {
  const cwd = path.join(root, project.cwd);

  console.log(`\n🚀 Starting ${project.name}...`);

  const child = spawn(project.command, project.args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  processes.push(child);

  child.on("error", (err) => {
    console.error(`❌ ${project.name}: ${err.message}`);
  });

  child.on("exit", (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`⚠️ ${project.name} exited with code ${code}`);
    } else if (signal) {
      console.log(`🛑 ${project.name} stopped`);
    }
  });
}

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log("\n🛑 Stopping all projects...");

  for (const child of processes) {
    if (child.exitCode === null && !child.killed) {
      child.kill("SIGTERM");
    }
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
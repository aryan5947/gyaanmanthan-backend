import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function formatDate() {
  return new Date().toISOString();
}

function writeToFile(level: string, message: string) {
  const logFile = path.join(logDir, `${level}.log`);
  fs.appendFileSync(logFile, `[${formatDate()}] ${message}\n`);
}

export const logger = {
  info: (msg: string, ...args: any[]) => {
    const line = `[INFO] ${formatDate()} → ${msg} ${args.length ? JSON.stringify(args) : ""}`;
    console.log("\x1b[36m%s\x1b[0m", line); // cyan
    writeToFile("info", line);
  },
  warn: (msg: string, ...args: any[]) => {
    const line = `[WARN] ${formatDate()} → ${msg} ${args.length ? JSON.stringify(args) : ""}`;
    console.warn("\x1b[33m%s\x1b[0m", line); // yellow
    writeToFile("warn", line);
  },
  error: (msg: string, ...args: any[]) => {
    const line = `[ERROR] ${formatDate()} → ${msg} ${args.length ? JSON.stringify(args) : ""}`;
    console.error("\x1b[31m%s\x1b[0m", line); // red
    writeToFile("error", line);
  },
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== "production") {
      const line = `[DEBUG] ${formatDate()} → ${msg} ${args.length ? JSON.stringify(args) : ""}`;
      console.log("\x1b[90m%s\x1b[0m", line); // gray
      writeToFile("debug", line);
    }
  }
};

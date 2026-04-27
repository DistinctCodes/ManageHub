import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const CONTRACTS = [
  "credential_badge",
  "event_ticketing",
  "governance",
  "resource_credits",
  "revenue_distribution",
];

const NETWORK = process.env.STELLAR_NETWORK ?? "testnet";
const SECRET_KEY = process.env.STELLAR_SECRET_KEY;
const SANDBOX_DIR = path.resolve(__dirname);
const OUTPUT_FILE = path.join(SANDBOX_DIR, "deployed-ids.env");

if (!SECRET_KEY) {
  console.error("Error: STELLAR_SECRET_KEY environment variable is required.");
  process.exit(1);
}

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function buildAll() {
  for (const contract of CONTRACTS) {
    const dir = path.join(SANDBOX_DIR, contract);
    console.log(`Building ${contract}...`);
    run("cargo build --target wasm32-unknown-unknown --release", dir);
  }
  console.log("All contracts built.\n");
}

function testAll() {
  for (const contract of CONTRACTS) {
    const dir = path.join(SANDBOX_DIR, contract);
    console.log(`Testing ${contract}...`);
    run("cargo test", dir);
  }
  console.log("All tests passed.\n");
}

function deployAll() {
  const deployed: Record<string, string> = {};

  for (const contract of CONTRACTS) {
    const wasmPath = path.join(
      SANDBOX_DIR, contract, "target/wasm32-unknown-unknown/release",
      `${contract}.wasm`
    );
    console.log(`Deploying ${contract}...`);
    const contractId = run(
      `stellar contract deploy --wasm ${wasmPath} --source ${SECRET_KEY} --network ${NETWORK}`,
      SANDBOX_DIR
    );
    deployed[contract] = contractId;
    console.log(`  → ${contractId}`);
  }

  const envContent = Object.entries(deployed)
    .map(([k, v]) => `${k.toUpperCase()}_CONTRACT_ID=${v}`)
    .join("\n");
  fs.writeFileSync(OUTPUT_FILE, envContent + "\n");

  console.log("\n── Deployed Contract IDs ──────────────────");
  for (const [name, id] of Object.entries(deployed)) {
    console.log(`  ${name.padEnd(24)} ${id}`);
  }
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

const cmd = process.argv[2];
if (cmd === "build") buildAll();
else if (cmd === "test") testAll();
else if (cmd === "deploy") deployAll();
else {
  console.log("Usage: ts-node deploy.ts <build|test|deploy>");
  process.exit(1);
}

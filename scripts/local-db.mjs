// Local development only. Runs a native PostgreSQL server, never PGlite/SQLite.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
import os from "node:os";
const root = process.cwd();
const stateDir = path.join(root, ".data");
const localRoot = path.resolve(
  process.env.BIOREG_LOCAL_ROOT ||
    path.join(
      process.env.LOCALAPPDATA || os.homedir(),
      "BioRegRadar",
      crypto.createHash("sha256").update(root).digest("hex").slice(0, 12),
    ),
);
const dataDir = path.join(localRoot, "postgres18");
async function run(binary, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (c) => (output += c));
    child.stderr.on("data", (c) => (output += c));
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve(output) : reject(new Error(output)),
    );
  });
}
async function main() {
  const binaries = await import(
    `@embedded-postgres/${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`
  );
  await fs.mkdir(stateDir, { recursive: true });
  await fs.mkdir(localRoot, { recursive: true });
  const sourceNative = path.dirname(path.dirname(binaries.pg_ctl));
  const native = path.join(localRoot, "native18");
  if (
    !(await fs
      .stat(path.join(native, "bin", path.basename(binaries.pg_ctl)))
      .catch(() => null))
  )
    await fs.cp(sourceNative, native, { recursive: true });
  const localBinaries = Object.fromEntries(
    Object.entries(binaries).map(([key, value]) => [
      key,
      path.join(native, "bin", path.basename(value)),
    ]),
  );
  if (process.argv.includes("--stop")) {
    await run(localBinaries.pg_ctl, [
      "-D",
      dataDir,
      "stop",
      "-m",
      "fast",
      "-w",
    ]);
    console.log("Local PostgreSQL stopped. Database files retained.");
    return;
  }
  const credentialFile = path.join(stateDir, "local-postgres.json");
  let settings;
  try {
    settings = JSON.parse(await fs.readFile(credentialFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    settings = {
      user: "bioreg",
      password: crypto.randomBytes(32).toString("hex"),
      port: 55432,
    };
    await fs.writeFile(credentialFile, JSON.stringify(settings), {
      flag: "wx",
      mode: 0o600,
    });
  }
  if (!(await fs.stat(path.join(dataDir, "PG_VERSION")).catch(() => null))) {
    const passwordFile = path.join(localRoot, "init-password.tmp");
    await fs.writeFile(passwordFile, settings.password, { mode: 0o600 });
    try {
      await run(localBinaries.initdb, [
        "-D",
        dataDir,
        "--encoding=UTF8",
        "--locale=C",
        "--auth=scram-sha-256",
        `--username=${settings.user}`,
        `--pwfile=${passwordFile}`,
      ]);
    } finally {
      await fs.unlink(passwordFile);
    }
  }
  let running = false;
  try {
    await run(localBinaries.pg_ctl, ["-D", dataDir, "status"]);
    running = true;
  } catch {}
  if (!running)
    await run(localBinaries.pg_ctl, [
      "-D",
      dataDir,
      "-l",
      path.join(localRoot, "postgres.log"),
      "-o",
      `-h 127.0.0.1 -p ${settings.port}`,
      "start",
      "-w",
    ]);
  const client = new pg.Client({
    host: "127.0.0.1",
    port: settings.port,
    user: settings.user,
    password: settings.password,
    database: "postgres",
  });
  await client.connect();
  try {
    if (
      !(await client.query("SELECT 1 FROM pg_database WHERE datname='bioreg'"))
        .rowCount
    )
      await client.query("CREATE DATABASE bioreg");
  } finally {
    await client.end();
  }
  const envFile = path.join(root, ".env.local");
  const previous = await fs.readFile(envFile, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  let updated = previous;
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!new RegExp("^" + key + "\\s*=\\s*\\S+", "m").test(previous)) {
      updated = updated.replace(new RegExp("^" + key + "\\s*=\\s*$", "gm"), "");
      updated += `
${key}=postgresql://${settings.user}:${settings.password}@127.0.0.1:${settings.port}/bioreg
`;
    }
  }
  if (updated !== previous)
    await fs.writeFile(envFile, updated, { mode: 0o600 });
  console.log(
    "Native PostgreSQL ready on 127.0.0.1:55432. Credentials are saved only in ignored local files. Existing DATABASE_URL values are preserved.",
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Local PostgreSQL setup failed:",
      String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, "[REDACTED]"),
    );
    process.exitCode = 1;
  });

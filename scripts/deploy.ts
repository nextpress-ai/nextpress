import { spawnSync } from "node:child_process";
import path from "node:path";

type Result = { status: true } | { status: false; message: string; code?: number };

function run(command: string, args: string[]): Result {
  const r = spawnSync(command, args, { stdio: "inherit" });

  if (r.error) {
    const message = r.error instanceof Error ? r.error.message : String(r.error);
    return { status: false, message, code: 1 };
  }

  const code = r.status ?? 1;
  if (code !== 0) {
    return { status: false, message: `${command} exited with code ${code}`, code };
  }

  return { status: true };
}

function fail(message: string, code = 1): never {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

function main(): void {
  const rawArgs = process.argv.slice(2);

  const bump = run("pnpm", ["-s", "version:bump"]);
  if (!bump.status) {
    fail(`Version bump failed: ${bump.message}`, bump.code ?? 1);
  }

  const deployScriptPath = path.resolve(import.meta.dirname, "..", "deploy.sh");
  const deploy = run("bash", [deployScriptPath, ...rawArgs]);
  if (!deploy.status) {
    fail(`deploy.sh failed: ${deploy.message}`, deploy.code ?? 1);
  }
}

main();


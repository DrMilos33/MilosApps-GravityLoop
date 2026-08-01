import type { FullConfig } from "@playwright/test";

interface HealthResponse {
  status?: unknown;
  app?: unknown;
  environment?: unknown;
}

export default async function verifyGravityLoopServer(
  config: FullConfig,
): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL;
  if (typeof baseURL !== "string") {
    throw new Error("Gravity Loop E2E requires an explicit baseURL.");
  }

  const healthURL = new URL("health.json", baseURL);
  const response = await fetch(healthURL, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Gravity Loop readiness failed with HTTP ${response.status}.`);
  }

  const health = (await response.json()) as HealthResponse;
  if (
    health.status !== "ok" ||
    health.app !== "gravity-loop" ||
    health.environment !== "dev"
  ) {
    throw new Error(
      `Gravity Loop readiness identity mismatch: ${JSON.stringify(health)}`,
    );
  }
}

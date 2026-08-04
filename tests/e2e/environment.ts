export type GravityLoopEnvironment = "dev" | "production";

const configuredEnvironment =
  process.env.GRAVITY_LOOP_EXPECTED_ENVIRONMENT?.trim() ?? "production";

if (configuredEnvironment !== "dev" && configuredEnvironment !== "production") {
  throw new Error(
    `Invalid GRAVITY_LOOP_EXPECTED_ENVIRONMENT: ${configuredEnvironment}`,
  );
}

export const expectedEnvironment = configuredEnvironment as GravityLoopEnvironment;
export const expectedProductionApproved = expectedEnvironment === "production";
export const expectedPortalOrigin =
  expectedEnvironment === "production"
    ? "https://milos-apps.de"
    : "https://dev.milos-apps.de";
export const expectedPrivacyUrl = `${expectedPortalOrigin}/datenschutz`;

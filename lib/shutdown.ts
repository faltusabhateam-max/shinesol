/** Permanent-shutdown switch. ON by default. Set env SHUTDOWN=0 (and redeploy) to restore the app. */
export const SHUTDOWN = process.env.SHUTDOWN !== "0";
export const SHUTDOWN_MESSAGE = "Shine has permanently shut down";

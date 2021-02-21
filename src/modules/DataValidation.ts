export function checkEnvVars() {
  if (process.env.API_URL == undefined) {
    throw new Error("env var API_URL is not set");
  }
  if (process.env.QUEUE_URL == undefined) {
    throw new Error("env var QUEUE_URL is not set");
  }
  // TODO: check all env vars
}
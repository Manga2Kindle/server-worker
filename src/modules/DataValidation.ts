export function isNaturalNumber(x: unknown): boolean {
  const n: string = x as string; // force the value incase it is not
  const n1 = Math.abs(Number(n));
  const n2 = parseInt(n, 10);

  return !isNaN(n1) && n2 === n1 && n1.toString() == n;
}

export function checkEnvVars() {
  if (process.env.API_URL == undefined) {
    throw new Error("env var API_URL is not set");
  }
  if (process.env.QUEUE_URL == undefined) {
    throw new Error("env var QUEUE_URL is not set");
  }
  // TODO: check all env vars
}
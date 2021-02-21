import {$log} from "@tsed/common";

export default class Stats {
  private static _instance: Stats;
  private free = true;
  private jobs = 0;
  private failedJobs = 0;

  private constructor() {
    $log.info("Instanciate Stats");
  }

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  // Worker status functions

  public isWorkerFree(): boolean {
    return this.free;
  }

  public workerWorking() {
    this.free = false;
  }

  public workerDone() {
    this.free = true;
  }

  // Stats functions

  public addJob() {
    this.jobs++;
  }

  public jobsDone(): number {
    return this.jobs;
  }

  public jobFailed() {
    this.failedJobs++;
  }

  public jobsFailed(): number {
    return this.failedJobs;
  }

  //TODO: add average time, average pages, error rate...
}

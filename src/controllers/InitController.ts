import {Controller, Get} from "@tsed/common";
import Stats from "../modules/stats";

@Controller("/")
export class InitController {
  @Get("/register")
  getStats() {
    return {
      worker: process.env.SELF_URL,
      free: Stats.Instance.isWorkerFree()
    };
  }
}

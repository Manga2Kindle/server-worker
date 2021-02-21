import {Controller, Get} from "@tsed/common";
import Stats from "../modules/stats";

@Controller("/")
export class StatsController {
  @Get("/")
  getStats() {
    return {
      jobsDone: Stats.Instance.jobsDone(),
      jobsFailed: Stats.Instance.jobsFailed()
    };
  }
}

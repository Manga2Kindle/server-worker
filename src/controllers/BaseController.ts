import {Controller, Get, PathParams, Put} from "@tsed/common";
import Stats from "../modules/stats";

@Controller("/")
export class BaseController {
  @Get("/")
  getStats() {
    return {
      jobsDone: Stats.Instance.jobsDone
    };
  }

  @Get("/status")
  getStatus() {
    return {
      free: Stats.Instance.isWorkerFree()
    };
  }

  @Put("/:id")
  convertChapter(
    @PathParams("id")
    id: number
  ) {
    // TODO: do what we do
  }
}

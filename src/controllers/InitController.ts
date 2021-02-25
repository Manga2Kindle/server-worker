import {Controller, Get} from "@tsed/common";

@Controller("/")
export class InitController {
  @Get("/register")
  getStats() {
    return {
      self: process.env.SELF_URL
    };
  }
}

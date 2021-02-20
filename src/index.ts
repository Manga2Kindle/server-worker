import {config} from "dotenv";
import {resolve} from "path";
config({path: resolve(__dirname, "../.env")});

import {$log} from "@tsed/common";
import { PlatformExpress } from "@tsed/platform-express";
import {Server} from "./Server";
import Stats from "./modules/stats";

async function bootstrap() {
  try {
    $log.debug("Start server...");
    const platform = await PlatformExpress.bootstrap(Server);

    // instanciate stats
    Stats.Instance;

    await platform.listen();
    $log.debug("Server initialized");
  } catch (er) {
    $log.error(er);
  }
}

bootstrap();

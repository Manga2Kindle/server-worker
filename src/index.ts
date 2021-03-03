import {config} from "dotenv";
import {resolve} from "path";
config({path: resolve(__dirname, "../.env")});

import {$log} from "@tsed/common";
import {PlatformExpress} from "@tsed/platform-express";
import {Server} from "./Server";
import Stats from "./modules/stats";
import {checkEnvVars} from "./modules/DataValidation";
import {register} from "./modules/queueApiService";

async function bootstrap() {
  try {
    // check if envs are set
    checkEnvVars();

    $log.debug("Start server...");
    const platform = await PlatformExpress.bootstrap(Server);

    // instanciate stats
    Stats.Instance;

    await platform.listen();
    $log.debug("Server initialized");

    // register worker
    await register();
  } catch (er) {
    $log.error(er);
  }
}

bootstrap();

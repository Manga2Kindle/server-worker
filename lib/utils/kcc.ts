/**
 * Module to manage sync to async work with Kindle Comic Converter (kcc)
 *
 * @author Eduardo Fernandez
 */

import { exec, ExecException } from "child_process";
import { resolve } from "path";

const kccPath = resolve(__dirname, "../../kcc-master/kcc-c2e.py");

export interface KccOptions {
  style: string;
  splitter: number;
}

/**
 * Converts the given folder to Epub
 *
 * @param {String} folderName string to folder
 * @param {Array} options can be null (will pick default values)
 * @return {Promise} on resolve returns (stdout)
 */
export function folderToEpub(folderName: string, options: KccOptions): Promise<string | Error> {
  return new Promise((resolve, reject) => {
    let style = "manga"; // can be manga, webtoon or comic (others = comic)
    let splitter = 0; // double page parsing mode. 0: Split 1: Rotate 2: Both

    // escape spaces in the path
    //folderName = folderName.replace(/(\s+)/g, "\\$1");

    // TODO: let the user put some more options (device, 4panel...)
    if (options) {
      style = options.style ? options.style : style;
      splitter = Number.isInteger(options.splitter) ? options.splitter : splitter;
    }

    let comand = 'python3 "' + kccPath + '" -p KV -g 1.0 --forcecolor';

    switch (style) {
      case "manga":
        comand += " -m";
        break;

      case "webtoon":
        comand += " -w";
        break;
    }

    comand += " -u -r " + splitter + ' -f EPUB "' + folderName + '"';

    exec(comand, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        return reject(error);
      }
      if (stderr) {
        return reject(Error(stderr));
      }
      resolve(stdout);
    });
  });
}

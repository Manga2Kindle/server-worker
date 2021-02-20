/**
 * Module to manage sync to async work with Amazon's Kindlegen (it needs to be installed)
 *
 * @author Eduardo Fernandez
 */

import { exec, ExecException } from "child_process";
import { resolve } from "path";

const path = resolve(__dirname, "../../kindlegen/kindlegen");

/**
 * Converts the given epub to mobi
 *
 * @param {String} filePath string to epub file
 * @return {Promise} on resolve returns (stdout)
 */
export function epubToMobi(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const comand = '"' + path + '" -dont_append_source -locale en "' + filePath + '"';

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

import { join, resolve } from "path";
import { config } from "dotenv";
config({ path: resolve(__dirname, "../.env") });

import Axios from "axios";
import { Request, Response } from "express";
import { env } from "process";
import { STATUS } from "./models/Status";
import S3Storage from "./utils/S3Storage";
import { promisify } from "util";
import { access, mkdir, writeFile } from "fs";

Axios.defaults.baseURL = env.API_URL;
Axios.defaults.timeout = 1000;

export const lambdaHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (env.API_URL == undefined) {
      throw new Error("Config error");
    }
    if (req.params[0] && isNaturalNumber(req.params[0])) {
      const id = req.params[0];

      // reply caller
      res.status(200);
      res.send(`will do ${id}`);

      // change status
      changeStatus(id, STATUS.PROCESSING);

      //#region create folders

      const tmpFolder = resolve(__dirname, "../tmp");
      const idFolder = resolve(tmpFolder, id);
      const existDir = promisify(access);
      const makeDir = promisify(mkdir);

      existDir(tmpFolder)
        .catch(() => makeDir(tmpFolder))
        .then(() => existDir(idFolder))
        .catch(() => makeDir(idFolder));

      //#endregion
      //#region download files
      const s3 = new S3Storage();

      const getFileList = promisify(s3.getFileList);
      const getFile = promisify(s3.getFile);
      const wf = promisify(writeFile);

      getFileList(id)
        .then((metadata) => {
          const fileList: string[] = [];

          metadata.Contents.forEach((data: any) => {
            fileList.push(data.Key);
          });

          return fileList;
        })
        .then((fileList) => {
          const fileDonloaded: boolean[] = [];
          for (let i = 0; i < fileList.length; i++) {
            fileDonloaded.push(false);
          }

          fileList.forEach((fileKey) => {
            getFile(fileKey).then((data) => {
              wf(resolve(tmpFolder, fileKey), data.Body);
            });
          });
        });
      //#endregion
      //#region create epub

      wf(resolve(idFolder, "mimetype"), "application/epub+zip");
      wf(resolve(idFolder, "mimetype"), "application/epub+zip");

      //#endregion

      // change status
      changeStatus(id, STATUS.CONVERTING);

      // zip epub

      // change status
      changeStatus(id, STATUS.SENDING);

      // send epub

      // change status
      changeStatus(id, STATUS.DONE);

      // delete files
    } else {
      res.status(400).send("Bad Request");
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.status(500).send(error.message);
    }
    changeStatus(req.params[0], STATUS.ERROR);
    console.error(error);
  }
};

function isNaturalNumber(x: unknown): boolean {
  const n: string = x as string; // force the value in case it is not
  const n1 = Math.abs(Number(n));
  const n2 = parseInt(n, 10);

  return !isNaN(n1) && n2 === n1 && n1.toString() == n;
}

function changeStatus(id: string | number, status: string | number) {
  const url = join("chapter", id.toString(), status.toString());
  Axios.patch(url)
    .then((res) => {
      if (res.status != 204) {
        throw new Error("response to an status change was an error");
      }
    })
    .catch((error) => {
      throw error;
    });
}

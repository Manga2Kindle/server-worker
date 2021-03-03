import {$log, Controller, Get, PathParams, Put, Res} from "@tsed/common";
import {BadRequest} from "@tsed/exceptions";
import {Returns} from "@tsed/schema";
import {Response} from "express";
import {access, chmodSync, mkdir, readFileSync, rmSync, writeFile} from "fs";
import {resolve} from "path";
import {promisify} from "util";
import {Chapter} from "../models/Chapter";
import {Metadata} from "../models/Metadata";
import {STATUS} from "../models/Status";
import {changeStatus} from "../modules/apiApiService";
import {authorToString, formTitle, metadataEditor, sendFile} from "../modules/conversionUtils";
import {isNaturalNumber} from "../modules/DataValidation";
import {folderToEpub, KccOptions} from "../modules/kcc";
import {epubToMobi} from "../modules/kindlegen";
import { done } from "../modules/queueApiService";
import S3Storage from "../modules/S3Storage";
import Stats from "../modules/stats";
import {unZipDirectory, zipDirectory} from "../modules/ziputils";

@Controller("/")
export class WorkerController {
  @Get("/status")
  getStatus() {
    return {
      free: Stats.Instance.isWorkerFree()
    };
  }

  @Put("/:id")
  @Returns(400)
  async convertChapter(
    @PathParams("id")
    id: number,
    @Res() response: Response
  ) {
    // reply caller
    if (isNaturalNumber(id)) {
      Stats.Instance.addJob();
      Stats.Instance.workerWorking();
      response.status(200).send(`will do ${id}`);
    } else {
      return new BadRequest("not a natural number");
    }

    // start conversion
    try {
      // change status
      await changeStatus(id, STATUS.PROCESSING);

      //#region create folders

      const tmpFolder = resolve("/tmp", "Manga2Kindle");
      const idFolder = resolve(tmpFolder, id.toString());
      const existDir = promisify(access);
      const makeDir = promisify(mkdir);

      await existDir(tmpFolder)
        .catch(() => makeDir(tmpFolder))
        .then(() => existDir(idFolder))
        .catch(() => makeDir(idFolder));

      chmodSync(tmpFolder, 0o777);

      //#endregion
      //#region download files

      const s3 = new S3Storage();

      const getFileList = promisify(s3.getFileList);
      const getFile = promisify(s3.getFile);
      const wf = promisify(writeFile);

      const filelist = await getFileList(id.toString());
      for (let i = 0; i < filelist.Contents.length; i++) {
        const data = filelist.Contents[i];
        const fileData = await getFile(data.Key);
        await wf(resolve(tmpFolder, data.Key), fileData.Body);
      }

      const chapterData: Chapter = JSON.parse(readFileSync(resolve(idFolder, "ChapterData.json"), "utf8"));

      //#endregion
      //#region create epub

      const options: KccOptions = {
        style: chapterData.readMode,
        splitter: chapterData.splitType
      };

      const fteRes = await folderToEpub(idFolder, options);
      if (fteRes instanceof Error) {
        console.error(fteRes);
        throw new Error("Cant convert to epub");
      }

      await unZipDirectory(`${idFolder}.epub`, `${idFolder}_unzip`);

      // edit metadata
      const metadata: Metadata = {
        title: formTitle(chapterData),
        manga: chapterData.manga!.title!,
        author: authorToString(chapterData.manga!.author),
        chapter: chapterData.chapter!,
        identifier: chapterData.manga!.uuid!
      };

      await metadataEditor(`${idFolder}_unzip`, metadata);

      //#endregion
      //#region zip and convert to mobi

      // change status
      await changeStatus(id, STATUS.CONVERTING);

      // zip epub
      await zipDirectory(`${idFolder}_unzip`, `${idFolder}.epub`)
        .then((output) => console.log(output))
        .catch((err) => {
          console.error(err);
          throw new Error("Cant convert epub");
        });

      // convert to mobi
      await epubToMobi(`${idFolder}.epub`)
        .then((output) => console.log(output))
        .catch((err) => {
          console.error(err);
          throw new Error("Cant convert epub");
        });

      //#endregion
      //#region send file

      // change status
      await changeStatus(id, STATUS.SENDING);

      await sendFile(`${idFolder}.mobi`, chapterData.email!)
        .then((val) => console.log(val))
        .catch((err) => {
          console.error(err);
          throw new Error("Cant send email");
        });

      //#endregion
      //#region delete files

      // delete from bucket
      const delFile = promisify(s3.deleteFile);
      await delFile(id.toString());

      // delete from system
      rmSync(tmpFolder, {recursive: true, force: true})

      //#endregion
      await changeStatus(id, STATUS.DONE);
    } catch (error) {
      Stats.Instance.jobFailed();
      $log.error(`Worker failed: ${error.message}`);

      await changeStatus(id, STATUS.ERROR);
      console.error(error);
    } finally {
      Stats.Instance.workerDone();
      await done();
    }
  }
}

import { join, resolve } from "path";
import { config } from "dotenv";
config({ path: resolve(__dirname, "../.env") });

import Axios from "axios";
import { Request, Response } from "express";
import { env } from "process";
import { STATUS } from "./models/Status";
import S3Storage from "./utils/S3Storage";
import { promisify } from "util";
import { access, mkdir, readFileSync, writeFile, writeFileSync } from "fs";
import { folderToEpub, KccOptions } from "./utils/kcc";
import { epubToMobi } from "./utils/kindlegen";
import { zipDirectory, unZipDirectory } from "./utils/ziputils";
import { Builder, parseStringPromise } from "xml2js";
import { Metadata } from "./models/Metadata";
import { createTransport } from "nodemailer";
import SMTPTransport = require("nodemailer/lib/smtp-transport");
import Mail = require("nodemailer/lib/mailer");
import { Chapter } from "./models/Chapter";

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

      await existDir(tmpFolder)
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

      const chapterData: Chapter = JSON.parse(readFileSync(resolve(idFolder, "ChapterData.json"), "utf8"))

      //#endregion
      //#region create epub

      const options: KccOptions = {
        style: chapterData.readMode,
        splitter: chapterData.splitType
      };

      await folderToEpub(idFolder, options).catch((err) => {
        console.error(err);
        throw new Error("Cant convert to epub");
      });

      await unZipDirectory(`${idFolder}.epub`, `${idFolder}_unzip`).catch((err) => {
        console.error(err);
        throw new Error("nono");
      });

      // edit metadata
      const metadata: Metadata = {
        title: chapterData.title!,
        manga: chapterData.manga!.title!,
        author: chapterData.manga!.author!.toString(), // TODO: try this
        chapter: chapterData.chapter!,
        identifier: chapterData.manga!.uuid!
      };

      await metadataEditor(`${idFolder}_unzip`, metadata);

      //#endregion
      //#region zip and convert to mobi

      // change status
      changeStatus(id, STATUS.CONVERTING);

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
      changeStatus(id, STATUS.SENDING);

      await sendFile(`${idFolder}.mobi`, chapterData.email!)
        .then((val) => console.log(val))
        .catch((err) => {
          console.error(err);
          throw new Error("Cant send email");
        });

      //#endregion
      //#region delete files

      const delFile = promisify(s3.deleteFile);
      await delFile(id);

      //#endregion
      // change status
      changeStatus(id, STATUS.DONE);
    } else {
      res.status(400).send("Bad Request");
    }
  } catch (error) {
    if (!res.writableEnded) {
      res.status(500).send(error.message);
    }
    changeStatus(req.params[0], STATUS.ERROR);
    console.error(error);
  } finally {
    process.exit();
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

async function metadataEditor(epubUnzipedPath: string, data: Metadata) {
  // convert xml to json
  const OEBPS_path = join(epubUnzipedPath, "/OEBPS/content.opf");
  const OEBPS_data = await parseStringPromise(readFileSync(OEBPS_path));

  if (!OEBPS_data) {
    throw new Error("No data parsed");
  }

  // edit json, add meta
  OEBPS_data.package.metadata[0]["dc:title"][0] = data.title;
  OEBPS_data.package.metadata[0]["dc:creator"][0] = { _: data.author, $: { "opf:file-as": data.author, "opf:role": "aut" } };
  OEBPS_data.package.metadata[0].meta.push({ $: { property: "belongs-to-collection", id: "c01" }, _: data.manga });
  OEBPS_data.package.metadata[0].meta.push({ $: { refines: "#c01", property: "collection-type" }, _: "series" });
  OEBPS_data.package.metadata[0].meta.push({ $: { refines: "#c01", property: "group-position" }, _: data.chapter });
  // OEBPS_data.package.metadata[0].meta.push({ $: { refines: "#c01", property: "dcterms:identifier" }, _: data.identifier }); // TODO: ESTA LINEA FALLA
  OEBPS_data.package.metadata[0]["dc:contributor"][0]._ = "Manga2Kindle v" + require("../package.json").version;

  // convert to xml again
  const xmlOEBPS = new Builder().buildObject(OEBPS_data);
  writeFileSync(OEBPS_path, xmlOEBPS);
}

function sendFile(filePath: string, mailTo: string): Promise<SMTPTransport.SentMessageInfo> {
  const config: SMTPTransport.Options = {
    host: env.MAIL_HOST,
    port: parseInt(env.MAIL_PORT || "465"),
    secure: env.MAIL_SECURE == "true",
    auth: {
      user: env.MAIL_USERNAME,
      pass: env.MAIL_PASSWORD
    }
  };

  const transporter = createTransport(config);

  const mailOptions: Mail.Options = {
    from: env.MAIL_SENDER,
    to: mailTo,
    subject: "[Manga2Kindle] Here is your Manga!",
    text: "I'm here again to deliver your manga!\n You will find it attached to this email.\n -- The Manga2Kindle Bot",
    html:
      "Hey there!<br><br>I'm here again to deliver your manga!<br>You can find it attached to this email.<br><br> <i>Bop Bee Boo,</i><br>The Manga2Kindle Bot",
    attachments: [{ path: filePath }]
  };

  if (env.MAIL_REPLY_TO && env.MAIL_REPLY_TO !== "") {
    mailOptions.replyTo = process.env.MAIL_REPLY_TO;
  }

  return transporter.sendMail(mailOptions);
}

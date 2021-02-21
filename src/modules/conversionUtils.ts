import { readFileSync, writeFileSync } from "fs";
import { createTransport } from "nodemailer";
import Mail from "nodemailer/lib/mailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { join } from "path";
import { Builder, parseStringPromise } from "xml2js";
import { Author } from "../models/Author";
import { Chapter } from "../models/Chapter";
import { Metadata } from "../models/Metadata";

export async function metadataEditor(epubUnzipedPath: string, data: Metadata) {
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

export function sendFile(filePath: string, mailTo: string): Promise<SMTPTransport.SentMessageInfo> {
  const config: SMTPTransport.Options = {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || "465"),
    secure: process.env.MAIL_SECURE == "true",
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD
    }
  };

  const transporter = createTransport(config);

  const mailOptions: Mail.Options = {
    from: process.env.MAIL_SENDER,
    to: mailTo,
    subject: "[Manga2Kindle] Here is your Manga!",
    text: "I'm here again to deliver your manga!\n You will find it attached to this email.\n -- The Manga2Kindle Bot",
    html:
      "Hey there!<br><br>I'm here again to deliver your manga!<br>You can find it attached to this email.<br><br> <i>Bop Bee Boo,</i><br>The Manga2Kindle Bot",
    attachments: [{ path: filePath }]
  };

  if (process.env.MAIL_REPLY_TO && process.env.MAIL_REPLY_TO !== "") {
    mailOptions.replyTo = process.env.MAIL_REPLY_TO;
  }

  return transporter.sendMail(mailOptions);
}

export function authorToString(author?: Author[]): string {
  let authorStr = "";
  const authorArr: string[] = [];

  if (author) {
    for (let i = 0; i < author.length; i++) {
      const authorName = author[i].name;
      if (authorName) {
        authorArr.push(authorName);
      }
    }

    authorStr = authorArr.join(", ");
  }

  return authorStr;
}

export function formTitle(chapter: Chapter): string {
  let title = "";

  if (chapter.manga!.title) {
    title += chapter.manga!.title;
    title += " ";
  }
  if (chapter.volume) {
    title += "Vol.";
    title += chapter.volume;
    title += " ";
  }
  if (chapter.chapter) {
    title += "Ch.";
    title += chapter.chapter;
    title += " ";
  }

  title.trim();

  if (chapter.title) {
    title += " - ";
    title += chapter.title;
  }

  return title.trim();
}

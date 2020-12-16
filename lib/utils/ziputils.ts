import * as archiver from "archiver";
import { Error } from "aws-sdk/clients/servicecatalog";
import { createWriteStream, createReadStream } from "fs";
import { Extract } from "unzipper";

export function zipDirectory(source: string, out: string): Promise<void> {
  const archive = archiver("zip", { zlib: { level: 0 } });
  const stream = createWriteStream(out);

  return new Promise((resolve, reject) => {
    archive
      .directory(source, false)
      .on("error", (err) => reject(err))
      .pipe(stream);

    stream.on("close", () => resolve());
    archive.finalize();
  });
}

export function unZipDirectory(source: string, out: string): Promise<void> {
  return new Promise((resolve, reject) => {
    createReadStream(source)
      .pipe(Extract({ path: out }))
      .on("finish", (err: Error) => {
        if (err) return reject(err);
        else resolve();
      });
  });
}

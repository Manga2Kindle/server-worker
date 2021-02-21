import {AWSError, S3} from "aws-sdk";
import s3 from "../config/S3Config";

export default class S3Storage {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getFileList(path: string, cb: (error: any, metadata?: any) => void): void {
    const params: S3.Types.ListObjectsRequest = {
      Bucket: process.env.S3_BUCKET as string,
      Prefix: path
    };

    s3.listObjects(params, (err: AWSError, data: S3.ListObjectsOutput) => {
      if (err) return cb(err);
      else cb(null, data);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getFile(path: string, cb: (error: any, metadata?: any) => void): void {
    const params: S3.Types.GetObjectRequest = {
      Bucket: process.env.S3_BUCKET as string,
      Key: path
    };

    s3.getObject(params, (err: AWSError, data: S3.GetObjectOutput) => {
      if (err) return cb(err);
      else cb(null, data);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public deleteFile(path: string, cb: (error: any, metadata?: any) => void): void {
    const params: S3.Types.PutObjectRequest = {
      Bucket: process.env.S3_BUCKET as string,
      Key: path
    };

    s3.deleteObject(params, (err: AWSError, data: S3.DeleteObjectOutput) => {
      if (err) return cb(err);
      else cb(null, data);
    });
  }
}

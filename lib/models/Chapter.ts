import { Manga } from "./Manga";

export class Chapter {
  public manga?: Manga;
  public title?: string;
  public chapter?: number;
  public volume?: number;
  public pages?: number;
  public email?: string;
  public readMode?: string;
  public splitType?: number;
}

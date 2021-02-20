import { Property } from "@tsed/schema";
import { Manga } from "./Manga";

export class Chapter {
  @Property()
  public manga?: Manga;
  @Property()
  public title?: string;
  @Property()
  public chapter?: number;
  @Property()
  public volume?: number;
  @Property()
  public pages?: number;
  @Property()
  public email?: string;
  @Property()
  public readMode?: string;
  @Property()
  public splitType?: number;
}

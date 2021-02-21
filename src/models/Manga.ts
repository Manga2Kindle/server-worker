import {Property} from "@tsed/schema";
import {Author} from "./Author";

export class Manga {
  @Property()
  public id?: number;
  @Property()
  public title?: string;
  @Property()
  public uuid?: string;
  @Property()
  public author?: Author[];
}

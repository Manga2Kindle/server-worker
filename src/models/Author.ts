import { Property } from "@tsed/schema";

export class Author {
  @Property()
  public id?: number;
  @Property()
  public name?: string;
}

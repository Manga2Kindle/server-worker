import {Property} from "@tsed/schema";

export const STATUS = {
  REGISTERED: 10,
  UPLOADING: 20,
  UPLOADED: 30,
  ENQUEUED: 40,
  PROCESSING: 50,
  CONVERTING: 60,
  SENDING: 70,
  DONE: 80,
  ERROR: 90
};

export class Status {
  @Property()
  public id?: number;
  @Property()
  public status?: number;
  @Property()
  public pages?: number;
}

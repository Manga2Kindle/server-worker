import axios, {AxiosResponse} from "axios";
import {join} from "path";

export async function changeStatus(id: string | number, status: string | number) {
  const url = join("chapter", id.toString(), status.toString());
  const axiosInstance = axios.create({
    baseURL: process.env.API_URL,
    timeout: 1000
  });

  const res: AxiosResponse<any> = await axiosInstance.patch(url);
  if (res.status != 204) {
    throw new Error("response to an status change was an error");
  }
}

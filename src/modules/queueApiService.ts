import { $log } from "@tsed/common";
import axios, {AxiosResponse} from "axios";

export async function register() {
  const url = "/worker/register";
  const axiosInstance = axios.create({
    baseURL: process.env.API_URL,
    timeout: 1000
  });

  $log.debug("queueApiService::register");
  const res: AxiosResponse<any> = await axiosInstance.post(url, {worker: process.env.SELF_URL});
  if (res.status != 204) {
    throw new Error("registration call failed");
  }
}

export async function done() {
  const url = "/worker/done";
  const axiosInstance = axios.create({
    baseURL: process.env.API_URL,
    timeout: 1000
  });

  $log.debug("queueApiService::done");
  const res: AxiosResponse<any> = await axiosInstance.post(url, {worker: process.env.SELF_URL});
  if (res.status != 204) {
    throw new Error("registration call failed");
  }
}

import axios from "axios";

const DEFAULT_PIPELINE_API_BASE_URL = "http://220.130.209.122:41432";

const baseURL = (
  process.env.NEXT_PUBLIC_PIPELINE_API_BASE_URL ??
  DEFAULT_PIPELINE_API_BASE_URL
).replace(/\/$/, "");

export const pipelineApi = axios.create({
  baseURL,
  timeout: 1_200_000,
  headers: {
    accept: "application/json",
  },
});

import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: "https://managehub.distinctcodes.solutions",
  headers: {
    "Content-Type": "application/json",
  },
});

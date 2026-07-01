import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.agenticx.co.in/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("candidate_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("candidate_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const getErrorMessage = (err: any): string => {
  if (!err) return "An unknown error occurred.";
  
  const detail = err.response?.data?.detail;
  if (!detail) {
    return err.message || "An unknown error occurred.";
  }
  
  if (typeof detail === "string") {
    return detail;
  }
  
  if (Array.isArray(detail)) {
    return detail.map((d: any) => {
      const field = d.loc ? d.loc[d.loc.length - 1] : "";
      return field ? `${field}: ${d.msg}` : d.msg;
    }).join(", ");
  }
  
  if (typeof detail === "object" && detail !== null) {
    if (detail.msg) return detail.msg;
    if (detail.message) return detail.message;
    return JSON.stringify(detail);
  }
  
  return String(detail);
};

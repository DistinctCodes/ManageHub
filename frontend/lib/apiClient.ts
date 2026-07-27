const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

export class ApiError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type ResponseErrorInterceptor = (error: unknown) => unknown;

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private responseErrorInterceptors: ResponseErrorInterceptor[] = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(
    onFulfilled: ResponseInterceptor,
    onRejected?: ResponseErrorInterceptor
  ) {
    this.responseInterceptors.push(onFulfilled);
    if (onRejected) {
      this.responseErrorInterceptors.push(onRejected);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    let config: RequestInit = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      },
      credentials: "include",
    };

    if (this.token) {
      (config.headers as Record<string, string>)["Authorization"] =
        `Bearer ${this.token}`;
    }

    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    try {
      let response = await fetch(url, config);

      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      if (!response.ok) {
        if (response.status === 401 && typeof window !== "undefined") {
          window.dispatchEvent(new Event("session-expired"));
        }
        let errorData: Record<string, unknown> = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }
        throw new ApiError(
          (errorData.message as string) || "An API error occurred",
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      for (const interceptor of this.responseErrorInterceptors) {
        const result = interceptor(error);
        if (result !== undefined) return result;
      }

      if (error instanceof ApiError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new ApiError(error.message);
      }
      throw new ApiError("Network error occurred");
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
    });
  }

  async post<T, D = unknown>(endpoint: string, data?: D): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T, D = unknown>(endpoint: string, data?: D): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

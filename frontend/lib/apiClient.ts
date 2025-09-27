type RequestMethod = "GET" | "POST" | "PATCH" | "DELETE";

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl =
      process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:6000/api/v1";
  }

  public setToken(token: string) {
    this.token = token;
  }
  private async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");

      if (!response.ok) {
        let errorMessage = response.statusText;

        try {
          if (isJson) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
          } else {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          }
        } catch {}

        throw new Error(`[${response.status}] ${errorMessage}`);
      }

      return isJson
        ? await response.json()
        : ((await response.text()) as unknown as T);
    } catch (error: any) {
      const isNetworkError = error instanceof TypeError;

      const fallbackMessage = isNetworkError
        ? "Network error. Please check your connection or try again later."
        : error.message || "An unexpected error occurred.";

      console.error(`[ApiClient Error] ${options.method} ${url}:`, error);
      throw new Error(fallbackMessage);
    }
  }
  private request<T>(
    endpoint: string,
    method: RequestMethod,
    data?: any
  ): Promise<T> {
    const options: RequestInit = {
      method,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    return this.fetchWithAuth<T>(endpoint, options);
  }

  public get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, "GET");
  }

  public post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, "POST", data);
  }

  public patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, "PATCH", data);
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, "DELETE");
  }
}
export default ApiClient;

export class RequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    const value = (body as { error?: unknown }).error;
    if (typeof value === "string") return value;
  }
  return "Request failed";
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await parse(res);
  if (!res.ok) throw new RequestError(res.status, errorMessage(body));
  return body as T;
}

type Method = "POST" | "PATCH" | "DELETE" | "PUT";

export async function mutateApi<T>(url: string, method: Method, payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: payload ? { "Content-Type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const body = await parse(res);
  if (!res.ok) throw new RequestError(res.status, errorMessage(body));
  return body as T;
}

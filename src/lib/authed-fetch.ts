"use client";

export async function authedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    window.location.href = `/login?from=${encodeURIComponent(window.location.pathname)}`;
  }
  return res;
}

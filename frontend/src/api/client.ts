// API client for Nestflo web app
// In dev: Vite proxies /api to localhost:8898
// In prod: served from same origin by FastAPI

interface SubmitMarketReportRequest {
  city: string;
  postcodes: string[];
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
}

interface SubmitTargetVsComparableRequest {
  url: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  errors?: string[];
}

const API_BASE = '/api';

export async function submitMarketReport(req: SubmitMarketReportRequest): Promise<ApiResponse> {
  const resp = await fetch(`${API_BASE}/market-report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  return resp.json();
}

export async function submitTargetVsComparable(req: SubmitTargetVsComparableRequest): Promise<ApiResponse> {
  const params = new URLSearchParams();
  params.append('url', req.url);
  params.append('first_name', req.first_name);
  params.append('last_name', req.last_name);
  params.append('email', req.email);
  const resp = await fetch(`${API_BASE}/target-vs-comparable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  return resp.json();
}

export async function subscribeComingSoon(email: string): Promise<ApiResponse> {
  const resp = await fetch(`${API_BASE}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return resp.json();
}

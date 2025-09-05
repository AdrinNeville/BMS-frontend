const API_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

async function apiRequest(endpoint, method="GET", body=null) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
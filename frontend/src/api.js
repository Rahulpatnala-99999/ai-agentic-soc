// Centralize browser-to-backend requests and streamed investigation events.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// Stream a complete Quick mode investigation.
export function investigate(question, password, { onProgress, onResult, onError }) {
  const url = `${API_BASE}/api/investigate?question=${encodeURIComponent(question)}&password=${encodeURIComponent(password)}`;
  const source = new EventSource(url);

  source.addEventListener("progress", (e) => {
    onProgress?.(JSON.parse(e.data));
  });

  source.addEventListener("result", (e) => {
    onResult?.(JSON.parse(e.data));
    source.close();
  });

  source.onerror = () => {
    onError?.();
    source.close();
  };

  return source;
}

// Stream the planning stage used by Advanced mode.
export function planQuery(question, password, { onProgress, onResult, onError }) {
  const url = `${API_BASE}/api/plan?question=${encodeURIComponent(question)}&password=${encodeURIComponent(password)}`;
  const source = new EventSource(url);

  source.addEventListener("progress", (e) => {
    onProgress?.(JSON.parse(e.data));
  });

  source.addEventListener("result", (e) => {
    onResult?.(JSON.parse(e.data));
    source.close();
  });

  source.onerror = () => {
    onError?.();
    source.close();
  };

  return source;
}

export async function analyze({ question, tableName, timerangeHours, kqlQuery, model }) {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      table_name: tableName,
      timerange_hours: timerangeHours,
      kql_query: kqlQuery,
      model,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { error: { title: "Analysis Failed", message: data.detail || `Request failed (${res.status})` } };
  }
  return data;
}

export async function fetchHistory(query = "") {
  const url = `${API_BASE}/api/history${query ? `?q=${encodeURIComponent(query)}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`History request failed (${res.status})`);
  const data = await res.json();
  return data.entries;
}

export async function isolateDevice(deviceName, password) {
  const res = await fetch(`${API_BASE}/api/isolate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ device_name: deviceName, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `Isolation request failed (${res.status})`);
    err.unauthorized = res.status === 401;
    throw err;
  }
  return data;
}

/**
 * 华为开发者知识 MCP 的最小客户端（streamable HTTP + JSON-RPC）。
 *
 * 为什么自己实现而不是依赖包：本地目录安装的 bundle 解析不到宿主内的依赖，
 * 且官方 MCP 只是标准 JSON-RPC；这里只用到 initialize / tools/call 两个方法。
 * 失败时由调用方降级到本地快照，并显式告警（不静默）。
 */
const DEFAULT_ENDPOINT = 'https://connect-api.cloud.huawei.com/api/developerknowledge/mcp';
const PROTOCOL_VERSION = '2025-11-25';

let nextId = 1;
let sessionId = undefined;
let initialized = false;
let failureUntil = 0;

async function post(endpoint, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const sid = res.headers.get('mcp-session-id');
    if (sid) sessionId = sid;
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    const head = text.trimStart();
    if (head.startsWith('event:') || head.startsWith('data:')) {
      const line = text.split('\n').find((l) => l.trimStart().startsWith('data:'));
      if (!line) throw new Error('SSE without data line');
      return JSON.parse(line.trimStart().slice(5).trim());
    }
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

async function rpc(endpoint, method, params, timeoutMs) {
  const reply = await post(endpoint, { jsonrpc: '2.0', id: nextId++, method, params }, timeoutMs);
  if (reply?.error) {
    throw new Error(`${method} failed: [${reply.error.code}] ${reply.error.message ?? 'unknown'}`);
  }
  return reply?.result;
}

async function ensureInit(endpoint, timeoutMs) {
  if (initialized) return;
  await rpc(
    endpoint,
    'initialize',
    {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'harmony-dev-kit', version: '0.2.0' },
    },
    timeoutMs,
  );
  // 通知不需要回复
  post(endpoint, { jsonrpc: '2.0', method: 'notifications/initialized', params: {} }, timeoutMs).catch(() => {});
  initialized = true;
}

function normalizeText(result) {
  const content = Array.isArray(result?.content) ? result.content : [];
  const texts = content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text);
  const joined = texts.join('\n');
  if (!joined) return result ?? null;
  try {
    return JSON.parse(joined);
  } catch {
    return joined;
  }
}

function pickDocs(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of ['resultList', 'documents', 'docs', 'results', 'items', 'data', 'list']) {
    if (Array.isArray(payload[key])) return payload[key];
    if (payload[key] && typeof payload[key] === 'object') {
      const nested = pickDocs(payload[key]);
      if (nested.length) return nested;
    }
  }
  return [];
}

/** 检索官方文档；失败/熔断返回 { ok:false, error }，由调用方降级。 */
export async function mcpSearchDocuments(query, { endpoint = DEFAULT_ENDPOINT, timeoutMs = 6000, topK = 3 } = {}) {
  if (Date.now() < failureUntil) {
    return { ok: false, error: 'circuit-open', skipped: true };
  }
  try {
    await ensureInit(endpoint, timeoutMs);
    const result = await rpc(
      endpoint,
      'tools/call',
      { name: 'searchDocuments', arguments: { SearchDocumentsReq: { query, topK } } },
      timeoutMs,
    );
    if (result?.isError) {
      const msg = normalizeText(result);
      throw new Error(typeof msg === 'string' ? msg.slice(0, 160) : 'searchDocuments isError');
    }
    const payload = normalizeText(result);
    const docs = pickDocs(payload)
      .slice(0, topK)
      .map((doc) => {
        const parent = doc.parent ?? doc.name ?? null;
        return {
          title: doc.title ?? null,
          docId: parent,
          parent: parent ? [parent] : [],
          snippet: String(doc.content ?? doc.text ?? doc.snippet ?? '').slice(0, 400),
        };
      });
    return {
      ok: true,
      docs,
      query: String(query),
      message: payload?.message ?? null,
      code: payload?.code ?? null,
    };
  } catch (error) {
    failureUntil = Date.now() + 60_000;
    return { ok: false, error: error?.message ?? String(error) };
  }
}

/** 按 searchDocuments 返回的 parent/名称取全文（支持批量 ≤10）。 */
export async function mcpGetDocuments(names, { endpoint = DEFAULT_ENDPOINT, timeoutMs = 6000 } = {}) {
  if (Date.now() < failureUntil) {
    return { ok: false, error: 'circuit-open', skipped: true };
  }
  try {
    await ensureInit(endpoint, timeoutMs);
    const list = (Array.isArray(names) ? names : [names]).filter(Boolean).slice(0, 10);
    const result = await rpc(
      endpoint,
      'tools/call',
      { name: 'getDocumentsById', arguments: { GetDocumentsByIdRequest: { names: list } } },
      timeoutMs,
    );
    if (result?.isError) {
      const msg = normalizeText(result);
      throw new Error(typeof msg === 'string' ? msg.slice(0, 160) : 'getDocumentsById isError');
    }
    const payload = normalizeText(result);
    const docs = pickDocs(payload).map((doc) => ({
      title: doc.title ?? null,
      name: doc.name ?? doc.parent ?? null,
      uri: doc.uri ?? null,
      content: String(doc.content ?? '').slice(0, 6000),
    }));
    return { ok: true, docs, message: payload?.message ?? null, code: payload?.code ?? null };
  } catch (error) {
    failureUntil = Date.now() + 60_000;
    return { ok: false, error: error?.message ?? String(error) };
  }
}

export const MCP_ENDPOINT = DEFAULT_ENDPOINT;

/** 插件重新激活时重置熔断与会话（模块在 ESM 缓存里，状态不会随 index.js 重载自动清）。 */
export function mcpReset() {
  failureUntil = 0;
  initialized = false;
  sessionId = undefined;
}

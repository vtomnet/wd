const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

/** @type {{ id: string, title: string, completed: boolean }[]} */
let todos = [
  { id: crypto.randomUUID(), title: "Sketch retained-DOM runtime", completed: true },
  { id: crypto.randomUUID(), title: "Build simple todo example", completed: true },
  { id: crypto.randomUUID(), title: "Prototype the next testbed app", completed: false },
];

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }

    await handleStatic(response, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`todo example listening on http://${HOST}:${PORT}`);
});

/**
 * @param {http.IncomingMessage} request
 * @param {http.ServerResponse} response
 * @param {URL} url
 */
async function handleApi(request, response, url) {
  if (url.pathname === "/api/todos" && request.method === "GET") {
    sendJson(response, 200, todos);
    return;
  }

  if (url.pathname === "/api/todos" && request.method === "POST") {
    const body = await readJson(request);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (title.length === 0) {
      sendJson(response, 400, { error: "title is required" });
      return;
    }

    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
    };
    todos = [todo, ...todos];
    sendJson(response, 201, todo);
    return;
  }

  const todoMatch = /^\/api\/todos\/([^/]+)$/.exec(url.pathname);
  if (!todoMatch) {
    sendJson(response, 404, { error: "not found" });
    return;
  }

  const id = decodeURIComponent(todoMatch[1]);
  const index = todos.findIndex((todo) => todo.id === id);
  if (index < 0) {
    sendJson(response, 404, { error: "todo not found" });
    return;
  }

  if (request.method === "PATCH") {
    const body = await readJson(request);
    const next = { ...todos[index] };

    if (typeof body.title === "string") {
      const title = body.title.trim();
      if (title.length === 0) {
        sendJson(response, 400, { error: "title must not be empty" });
        return;
      }
      next.title = title;
    }

    if (typeof body.completed === "boolean") {
      next.completed = body.completed;
    }

    todos = todos.map((todo, todoIndex) => todoIndex === index ? next : todo);
    sendJson(response, 200, next);
    return;
  }

  if (request.method === "DELETE") {
    todos = todos.filter((todo) => todo.id !== id);
    sendJson(response, 200, { ok: true });
    return;
  }

  sendJson(response, 405, { error: "method not allowed" });
}

/**
 * @param {http.ServerResponse} response
 * @param {string} pathname
 */
async function handleStatic(response, pathname) {
  const relativePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolvePath(relativePath);
  if (filePath === null) {
    sendText(response, 403, "forbidden");
    return;
  }

  let content;
  try {
    content = await fs.readFile(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      sendText(response, 404, "not found");
      return;
    }
    throw error;
  }

  response.writeHead(200, {
    "content-type": contentType(filePath),
    "cache-control": "no-cache",
  });
  response.end(content);
}

/**
 * @param {string} pathname
 */
function resolvePath(pathname) {
  const target = path.resolve(ROOT, `.${pathname}`);
  const relative = path.relative(ROOT, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return target;
}

/**
 * @param {string} filePath
 */
function contentType(filePath) {
  const extension = path.extname(filePath);
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

/**
 * @param {http.IncomingMessage} request
 */
async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw.length === 0) {
    return {};
  }
  return JSON.parse(raw);
}

/**
 * @param {http.ServerResponse} response
 * @param {number} status
 * @param {unknown} payload
 */
function sendJson(response, status, payload) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-cache",
  });
  response.end(JSON.stringify(payload));
}

/**
 * @param {http.ServerResponse} response
 * @param {number} status
 * @param {string} text
 */
function sendText(response, status, text) {
  response.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-cache",
  });
  response.end(text);
}

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.LOCAL_BLOG_GENERATOR_PORT || 4317);
const HOST = "127.0.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
  "Content-Type": "application/json",
};

let isGenerating = false;

function sendJson(res, status, body) {
  res.writeHead(status, corsHeaders);
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk.toString();
      if (raw.length > 64 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function asLines(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function runBlogGenerator(body) {
  return new Promise((resolve, reject) => {
    const args = [path.join(ROOT, "scripts", "generate-store-review-local.mjs"), "--blog"];

    if (body.store_id) args.push("--id", String(body.store_id));
    else if (body.slug) args.push("--slug", String(body.slug));
    else if (body.store) args.push("--store", String(body.store));
    else {
      reject(new Error("store_id, slug, or store is required"));
      return;
    }

    if (body.publish) args.push("--publish");
    if (body.force) args.push("--force");
    for (const url of asLines(body.reference_urls)) args.push("--ref", url);
    for (const url of asLines(body.image_urls)) args.push("--image", url);

    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error((stderr || stdout || `Generator exited with ${code}`).slice(0, 4000)));
        return;
      }

      const url = stdout.match(/Blog URL:\s*(https?:\/\/\S+)/)?.[1] || stdout.match(/Draft blog URL:\s*(https?:\/\/\S+)/)?.[1] || "";
      resolve({ stdout, stderr, url });
    });
  });
}

function runInsightGenerator(body) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "scripts", "generate-insight-local.mjs")], {
      cwd: ROOT,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { const value = chunk.toString(); stdout += value; process.stdout.write(value); });
    child.stderr.on("data", (chunk) => { const value = chunk.toString(); stderr += value; process.stderr.write(value); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error((stderr || stdout || `Generator exited with ${code}`).slice(0, 4000)));
      const url = stdout.match(/Insight URL:\s*(https?:\/\/\S+)/)?.[1] || "";
      const imageUrl = stdout.match(/Visual URL:\s*(https?:\/\/\S+)/)?.[1] || "";
      const preset = stdout.match(/Visual preset:\s*([^\r\n]+)/)?.[1]?.trim() || "";
      resolve({ stdout, stderr, url, image_url: imageUrl, preset });
    });
    child.stdin.end(JSON.stringify(body));
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, { ok: true, busy: isGenerating });
    return;
  }

  if (req.method !== "POST" || !["/generate-blog-review", "/generate-linkedin-insight"].includes(req.url)) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  if (isGenerating) {
    sendJson(res, 409, { error: "Generator is already running. Wait for the current job to finish." });
    return;
  }

  isGenerating = true;
  try {
    const body = await readJson(req);
    const result = req.url === "/generate-linkedin-insight"
      ? await runInsightGenerator(body)
      : await runBlogGenerator(body);
    sendJson(res, 200, { ok: true, ...result });
  } catch (error) {
    sendJson(res, 500, { error: error.message || String(error) });
  } finally {
    isGenerating = false;
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Local Blog Generator Bridge running at http://${HOST}:${PORT}`);
  console.log("Keep this window open, then use Admin > Insights to generate drafts.");
});

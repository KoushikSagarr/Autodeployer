import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// ✅ Fixed environment variable naming
const JENKINS_URL = process.env.JENKINS_URL;
const JENKINS_USER = process.env.JENKINS_USER;
const JENKINS_TOKEN = process.env.JENKINS_TOKEN;
const JOB_NAME = process.env.JENKINS_JOB || "YourJobName";
const USE_TOKEN_TRIGGER = process.env.USE_TOKEN_TRIGGER === "true";

const authHeader = "Basic " + Buffer.from(`${JENKINS_USER}:${JENKINS_TOKEN}`).toString("base64");

// 🛡️ CSRF crumb fetch
async function getCrumb() {
  const response = await fetch(`${JENKINS_URL}/crumbIssuer/api/json`, {
    headers: { Authorization: authHeader }
  });

  if (!response.ok) throw new Error("Failed to fetch CSRF crumb");

  const data = await response.json();
  return { [data.crumbRequestField]: data.crumb };
}

// ✅ Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// 🚀 Trigger build
app.post("/trigger-build", async (req, res) => {
  try {
    let triggerURL = `${JENKINS_URL}/job/${JOB_NAME}/build`;
    const headers = { Authorization: authHeader };

    if (USE_TOKEN_TRIGGER) {
      triggerURL += `?token=${JENKINS_TOKEN}`;
    } else {
      const crumb = await getCrumb();
      Object.assign(headers, crumb);
    }

    const response = await fetch(triggerURL, { method: "POST", headers });

    if (response.status === 201 || response.status === 200) {
      io.emit("status", {
        type: "info",
        message: `Build triggered for job '${JOB_NAME}'`,
        time: new Date().toISOString()
      });
      res.json({ message: "Build triggered successfully." });
    } else {
      throw new Error(`Jenkins responded with ${response.status}`);
    }
  } catch (error) {
    console.error("Error triggering build:", error.message);
    io.emit("status", {
      type: "error",
      message: `Failed to trigger build: ${error.message}`,
      time: new Date().toISOString()
    });
    res.status(500).json({ error: "Failed to trigger Jenkins build" });
  }
});

// 📜 Build history
app.get("/build-history", async (req, res) => {
  try {
    const response = await fetch(
      `${JENKINS_URL}/job/${JOB_NAME}/api/json?tree=builds[number,result,timestamp,duration]`,
      { headers: { Authorization: authHeader } }
    );
    const data = await response.json();
    const builds = data.builds.map(build => ({
      number: build.number,
      result: build.result,
      timestamp: build.timestamp,
      duration: build.duration
    }));
    res.json({ builds });
  } catch (error) {
    console.error("Error fetching build history:", error.message);
    res.status(500).json({ error: "Failed to fetch build history" });
  }
});

// 🔄 External status updates
app.post("/status", (req, res) => {
  const { type, message, time } = req.body;
  io.emit("status", { type, message, time });
  res.sendStatus(200);
});

// 📦 Log streaming (initial snapshot)
app.get("/logs/:buildNumber", async (req, res) => {
  const { buildNumber } = req.params;
  const url = `${JENKINS_URL}/job/${JOB_NAME}/${buildNumber}/logText/progressiveText?start=0`;

  try {
    const response = await fetch(url, { headers: { Authorization: authHeader } });
    if (!response.ok) throw new Error(`Jenkins responded with ${response.status}`);
    const text = await response.text();
    res.send(text);
  } catch (err) {
    console.error("Log fetch failed:", err.message);
    res.status(500).send("Failed to fetch log");
  }
});

// 🧠 Serve frontend
app.use(express.static(path.join(__dirname, "../public")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// 📡 WebSocket log stream
io.on("connection", socket => {
  console.log("Client connected:", socket.id);

  socket.on("watch-log", async buildNumber => {
    try {
      let start = 0;

      const streamLogs = async () => {
        const logURL = `${JENKINS_URL}/job/${JOB_NAME}/${buildNumber}/logText/progressiveText?start=${start}`;
        try {
          const response = await fetch(logURL, {
            headers: { Authorization: authHeader }
          });

          if (!response.ok) throw new Error(`Log fetch failed: ${response.status}`);
          const text = await response.text();

          const moreData = response.headers.get("X-More-Data");
          const nextStart = parseInt(response.headers.get("X-Text-Size") || "0", 10);

          if (text) socket.emit("log-update", text);
          start = nextStart;

          if (moreData === "true") {
            setTimeout(streamLogs, 1500);
          } else {
            socket.emit("log-done", buildNumber);
          }
        } catch (err) {
          console.error("Error while streaming logs:", err.message);
        }
      };

      streamLogs();
    } catch (e) {
      console.error("Streaming error:", e.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// 🟢 Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

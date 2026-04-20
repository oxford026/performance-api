const fs = require("fs");
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("db.sqlite");
function extractMetrics(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    return {
      fcp: data.audits["first-contentful-paint"].numericValue / 1000,
      lcp: data.audits["largest-contentful-paint"].numericValue / 1000,
      tbt: data.audits["total-blocking-time"].numericValue,
    };
  } catch (error) {
    console.error("Error reading Lighthouse file:", error);
    return null;
  }
}
app.get("/test-lighthouse", (req, res) => {
  const metrics = extractMetrics("./lighthouse.json");
  res.json(metrics);
});
app.get("/simulate", (req, res) => {
  const metrics = extractMetrics("./lighthouse.json");

  if (!metrics) {
    return res.status(500).json({ error: "Failed to read Lighthouse data" });
  }
  const alerts = checkPerformance(metrics);

  const query = `
    INSERT INTO metrics (commit_hash, branch, environment, fcp, lcp, tbt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      "auto-" + Date.now(),
      "main",
      "production",
      metrics.fcp,
      metrics.lcp,
      metrics.tbt,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        message: "Simulated Lighthouse data inserted",
        id: this.lastID,
        metrics: metrics,
        alerts: alerts,
      });
    },
  );
});

app.get("/", (req, res) => {
  res.send("API is running");
});

app.get("/metrics", (req, res) => {
  const { environment } = req.query;

  let query = "SELECT * FROM metrics";
  let params = [];

  if (environment) {
    query += " WHERE environment = ?";
    params.push(environment);
  }

  query += " ORDER BY created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});
app.get("/metrics/chart", (req, res) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      fcp,
      lcp,
      tbt
    FROM metrics
    ORDER BY created_at ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});
app.get("/metrics/chart/avg", (req, res) => {
  const query = `
    SELECT 
      DATE(created_at) as date,
      AVG(fcp) as fcp,
      AVG(lcp) as lcp,
      AVG(tbt) as tbt
    FROM metrics
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});
app.get("/metrics/alerts", (req, res) => {
  db.all("SELECT * FROM metrics", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const results = rows.map((row) => ({
      ...row,
      alerts: checkPerformance(row),
    }));

    res.json(results);
  });
});
app.get("/metrics/chart/structured", (req, res) => {
  db.all(
    "SELECT DATE(created_at) as date, fcp, lcp, tbt FROM metrics ORDER BY created_at ASC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        labels: rows.map((r) => r.date),
        fcp: rows.map((r) => r.fcp),
        lcp: rows.map((r) => r.lcp),
        tbt: rows.map((r) => r.tbt),
      });
    },
  );
});
app.post("/metrics", (req, res) => {
  console.log("Incoming data:", req.body);

  const { commit_hash, branch, environment, fcp, lcp, tbt } = req.body;

  if (
    !commit_hash ||
    !branch ||
    !environment ||
    fcp == null ||
    lcp == null ||
    tbt == null
  ) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (
    typeof fcp !== "number" ||
    typeof lcp !== "number" ||
    typeof tbt !== "number"
  ) {
    return res.status(400).json({ error: "Metrics must be numbers" });
  }

  const query = `
    INSERT INTO metrics (commit_hash, branch, environment, fcp, lcp, tbt)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [commit_hash, branch, environment, fcp, lcp, tbt],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID });
      }
    },
  );
});

function checkPerformance(metrics) {
  const alerts = [];

  if (metrics.lcp > 2.5) {
    alerts.push("LCP is too high (slow loading)");
  }

  if (metrics.fcp > 1.8) {
    alerts.push("FCP is slower than expected");
  }

  if (metrics.tbt > 200) {
    alerts.push("TBT indicates blocking issues");
  }

  return alerts;
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

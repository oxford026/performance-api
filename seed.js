const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("db.sqlite");

const environments = ["production", "staging", "development"];

function randomBetween(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function generateStatus(lcp, tbt) {
  if (lcp >= 4 || tbt >= 500) return "Critical";
  if (lcp >= 2.5 || tbt >= 200) return "Warning";
  return "Excellent";
}

for (let day = 30; day >= 1; day--) {
  environments.forEach((env) => {
    const fcp = randomBetween(1.0, 4.0);
    const lcp = randomBetween(1.5, 5.0);
    const tbt = Math.round(randomBetween(50, 700));

    const status = generateStatus(lcp, tbt);

    const commitHash = `seed-${env}-${day}`;

    const date = new Date();
    date.setDate(date.getDate() - day);

    db.run(
      `
      INSERT INTO metrics (
        commit_hash,
        branch,
        environment,
        fcp,
        lcp,
        tbt,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [commitHash, "main", env, fcp, lcp, tbt, date.toISOString()],
      (err) => {
        if (err) {
          console.error(err.message);
        }
      },
    );

    console.log(
      `Inserted ${env} | FCP:${fcp} | LCP:${lcp} | TBT:${tbt} | ${status}`,
    );
  });
}

db.close();

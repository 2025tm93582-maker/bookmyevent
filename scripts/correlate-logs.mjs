import fs from "node:fs";

const id = process.argv[2];
if (!id) {
    console.log("usage: node scripts/correlate-logs.mjs <correlation-id>");
    process.exit(1);
}

const services = ["catalog", "inventory", "payment", "notification", "booking"];
const rows = [];

for (const service of services) {
    const file = `logs/${service}.log`;
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
        if (!line.includes(id)) continue;
        const log = JSON.parse(line);
        if (!log.res) continue;
        rows.push({ ...log, service });
    }
}

rows.sort((a, b) => a.time - b.time);

const time = (ms) => new Date(ms).toLocaleTimeString("en-GB", { hour12: false }) + "." + String(ms % 1000).padStart(3, "0");
const short = (url) => url.replace("/api/v1", "").replace(/([0-9a-f]{8})-[0-9a-f-]{27}/g, "$1…");

console.log(`requests with correlation id ${id}, from all 5 services, in time order\n`);
for (const r of rows) {
    console.log(`${time(r.time)}  ${r.service.padEnd(12)} ${r.req.method.padEnd(4)} ${short(r.req.url).padEnd(44)} ${r.res.statusCode}`);
}
console.log(`\n${rows.length} requests`);

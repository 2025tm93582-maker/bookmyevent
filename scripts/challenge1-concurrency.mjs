const INVENTORY = "http://localhost:3002/api/v1";

const post = async (path, body) => {
    const res = await fetch(INVENTORY + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
};

const runCase = async (name, capacity, seatFor) => {
    const showId = 900000 + Math.floor(Math.random() * 99999);
    await post(`/shows/${showId}/seats`, { rows: [{ row: "A", count: capacity, tier: "GOLD" }] });

    const requests = [];
    for (let i = 0; i < 20; i++) {
        requests.push(post("/holds", { showId, seats: [seatFor(i)] }));
    }
    const results = await Promise.all(requests);

    let success = 0;
    let rejected = 0;
    let error = "";
    for (const result of results) {
        if (result.status === 201) {
            success++;
        } else {
            rejected++;
            error = result.body.error.code;
        }
    }

    console.log(`\n${name}`);
    console.log(`show ${showId}, 20 parallel requests`);
    let line = `success: ${success}, rejected: ${rejected}`;
    if (error) line += ` with ${error}`;
    console.log(line);
    console.log(success === capacity ? "RESULT: PASS" : "RESULT: FAIL");
    return success === capacity;
};

console.log("Challenge 1: concurrency control");
const case1 = await runCase("Case 1: 20 users want the same seat (capacity 1)", 1, () => "A1");
const case2 = await runCase("Case 2: 20 users want 5 seats, 4 users per seat (capacity 5)", 5, (i) => `A${(i % 5) + 1}`);
process.exit(case1 && case2 ? 0 : 1);

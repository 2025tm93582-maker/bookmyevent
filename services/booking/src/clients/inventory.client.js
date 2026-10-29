import Http from "./http.client.js";

const getSeats = (showId, ctx) => Http.call("inventory", { method: "GET", path: `/shows/${showId}/seats` }, ctx);

const hold = (showId, seats, ctx) =>
    Http.call("inventory", { method: "POST", path: "/holds", data: { showId, seats } }, ctx);

const confirm = (holdId, ctx) => Http.call("inventory", { method: "POST", path: `/holds/${holdId}/confirm` }, ctx);

const release = (holdId, ctx) => Http.call("inventory", { method: "POST", path: `/holds/${holdId}/release` }, ctx);

export default { getSeats, hold, confirm, release };

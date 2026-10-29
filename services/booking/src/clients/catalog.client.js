import Http from "./http.client.js";

const getShow = (showId, ctx) => Http.call("catalog", { method: "GET", path: `/shows/${showId}` }, ctx);

export default { getShow };

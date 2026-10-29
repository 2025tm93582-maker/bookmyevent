import Http from "./http.client.js";

const send = ({ bookingId, recipient, template, data }, ctx) =>
    Http.call(
        "notification",
        { method: "POST", path: "/notifications", data: { bookingId, recipient, template, data } },
        ctx,
    );

export default { send };

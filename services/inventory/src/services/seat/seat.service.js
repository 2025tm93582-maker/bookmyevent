import AppError from "../../utils/app-error.util.js";
import SeatRepository from "../../repositories/seat/seat.repository.js";

const summarise = (seats) =>
    seats.reduce((totals, seat) => ({ ...totals, [seat.status]: totals[seat.status] + 1 }), {
        AVAILABLE: 0,
        HELD: 0,
        SOLD: 0,
    });

const getMap = async (showId) => {
    const seats = await SeatRepository.findByShow(showId);
    if (!seats.length) throw new AppError(404, "SEATS_NOT_FOUND", `No seat layout for show ${showId}`);
    return { showId, summary: summarise(seats), seats };
};

const createLayout = async (showId, { rows }) => {
    const created = await SeatRepository.createLayout(showId, rows);
    if (created === null) throw new AppError(409, "SEAT_LAYOUT_EXISTS", `Show ${showId} already has a seat layout`);
    return getMap(showId);
};

export default { getMap, createLayout, summarise };

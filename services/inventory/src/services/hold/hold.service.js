import AppError from "../../utils/app-error.util.js";
import HoldRepository from "../../repositories/hold/hold.repository.js";
import env from "../../config/env.config.js";

const TRANSITIONS = {
    HELD: ["CONFIRMED", "RELEASED"],
    CONFIRMED: [],
    RELEASED: [],
};

const canMove = (from, to) => TRANSITIONS[from]?.includes(to) ?? false;

const get = async (id) => {
    const hold = await HoldRepository.findById(id);
    if (!hold) throw new AppError(404, "HOLD_NOT_FOUND", `Hold ${id} not found`);
    return hold;
};

const explainFailure = async (showId, seats) => {
    const found = await HoldRepository.findSeats(showId, seats);
    const missing = seats.filter((seat) => !found.some((row) => row.seat_no === seat));

    if (missing.length) {
        throw new AppError(
            422,
            "UNKNOWN_SEATS",
            "Some seats do not exist for this show",
            missing.map((seat) => ({ seat })),
        );
    }

    const taken = found
        .filter((row) => row.status !== "AVAILABLE")
        .map((row) => ({ seat: row.seat_no, status: row.status }));
    throw new AppError(409, "SEAT_UNAVAILABLE", "One or more seats are no longer available", taken);
};

const create = async ({ showId, seats }) => {
    const id = await HoldRepository.hold(showId, seats);
    if (!id) await explainFailure(showId, seats);
    return get(id);
};

const settle = async (id, target, repeatStatus, conflictCode) => {
    const result = await HoldRepository.settle(id, target, canMove);

    if (!result.found) throw new AppError(404, "HOLD_NOT_FOUND", `Hold ${id} not found`);
    if (!result.changed && result.status !== repeatStatus) {
        throw new AppError(409, conflictCode, `Hold is already ${result.status}`);
    }

    return get(id);
};

const confirm = async (id) => {
    if (env.faultConfirmFail) {
        throw new AppError(500, "SIMULATED_FAILURE", "Seat confirmation failed (FAULT_CONFIRM_FAIL is on)");
    }
    return settle(id, "CONFIRMED", "CONFIRMED", "HOLD_NOT_ACTIVE");
};

const release = (id) => settle(id, "RELEASED", "RELEASED", "HOLD_ALREADY_CONFIRMED");

export default { get, create, confirm, release, canMove };

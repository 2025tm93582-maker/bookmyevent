import AppError from "../../utils/app-error.util.js";
import EventService from "../event/event.service.js";
import ShowRepository from "../../repositories/show/show.repository.js";

const MIN_LEAD_MS = 60 * 60 * 1000;

const startsTooSoon = (startsAt, now = new Date()) => startsAt.getTime() < now.getTime() + MIN_LEAD_MS;

const listByEvent = async (eventId) => {
    await EventService.get(eventId);
    return ShowRepository.findByEvent(eventId);
};

const get = async (id) => {
    const show = await ShowRepository.findById(id);
    if (!show) throw new AppError(404, "SHOW_NOT_FOUND", `Show ${id} not found`);
    return show;
};

const create = async (eventId, data) => {
    await EventService.get(eventId);

    if (startsTooSoon(data.startsAt)) {
        throw new AppError(422, "SHOW_START_TOO_SOON", "A show must start at least 1 hour from now");
    }

    return ShowRepository.create({ eventId, ...data });
};

export default { listByEvent, get, create, startsTooSoon };

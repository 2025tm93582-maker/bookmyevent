import AppError from "../../utils/app-error.util.js";
import CategoryService from "../category/category.service.js";
import EventRepository from "../../repositories/event/event.repository.js";

const list = (filters) => EventRepository.findAll(filters);

const get = async (id) => {
    const event = await EventRepository.findById(id);
    if (!event) throw new AppError(404, "EVENT_NOT_FOUND", `Event ${id} not found`);
    return event;
};

const create = async (data) => {
    await CategoryService.ensureExists(data.category);
    return EventRepository.create(data);
};

export default { list, get, create };

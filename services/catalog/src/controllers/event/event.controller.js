import EventService from "../../services/event/event.service.js";
import Id from "../../utils/id.util.js";

const list = async (req, res) => {
    res.json(await EventService.list({ category: req.query.category?.toUpperCase() }));
};

const get = async (req, res) => {
    res.json(await EventService.get(Id.toId(req.params.id)));
};

const create = async (req, res) => {
    const event = await EventService.create(req.body);
    res.status(201).location(`/api/v1/events/${event.id}`).json(event);
};

export default { list, get, create };

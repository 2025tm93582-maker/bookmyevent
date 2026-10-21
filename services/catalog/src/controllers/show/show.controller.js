import ShowService from "../../services/show/show.service.js";
import Id from "../../utils/id.util.js";

const listByEvent = async (req, res) => {
    res.json(await ShowService.listByEvent(Id.toId(req.params.id)));
};

const get = async (req, res) => {
    res.json(await ShowService.get(Id.toId(req.params.id)));
};

const create = async (req, res) => {
    const show = await ShowService.create(Id.toId(req.params.id), req.body);
    res.status(201).location(`/api/v1/shows/${show.id}`).json(show);
};

export default { listByEvent, get, create };

import HoldService from "../../services/hold/hold.service.js";
import Id from "../../utils/id.util.js";

const create = async (req, res) => {
    const hold = await HoldService.create(req.body);
    res.status(201).location(`/api/v1/holds/${hold.id}`).json(hold);
};

const get = async (req, res) => {
    res.json(await HoldService.get(Id.toUuid(req.params.id)));
};

const confirm = async (req, res) => {
    res.json(await HoldService.confirm(Id.toUuid(req.params.id)));
};

const release = async (req, res) => {
    res.json(await HoldService.release(Id.toUuid(req.params.id)));
};

export default { create, get, confirm, release };

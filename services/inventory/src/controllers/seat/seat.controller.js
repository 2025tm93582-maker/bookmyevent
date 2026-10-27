import SeatService from "../../services/seat/seat.service.js";
import Id from "../../utils/id.util.js";

const getMap = async (req, res) => {
    res.json(await SeatService.getMap(Id.toId(req.params.id)));
};

const createLayout = async (req, res) => {
    res.status(201).json(await SeatService.createLayout(Id.toId(req.params.id), req.body));
};

export default { getMap, createLayout };

import BookingService from "../../services/booking/booking.service.js";
import Id from "../../utils/id.util.js";

const context = (req) => ({ correlationId: req.correlationId, log: req.log });

const create = async (req, res) => {
    const booking = await BookingService.create(req.body, context(req));
    res.status(201).location(`/api/v1/bookings/${booking.id}`).json(booking);
};

const get = async (req, res) => {
    res.json(await BookingService.get(Id.toUuid(req.params.id)));
};

export default { create, get };

import PaymentService from "../../services/payment/payment.service.js";
import Id from "../../utils/id.util.js";

const charge = async (req, res) => {
    const payment = await PaymentService.charge(req.body);
    res.status(201).location(`/api/v1/payments/${payment.id}`).json(payment);
};

const get = async (req, res) => {
    res.json(await PaymentService.get(Id.toUuid(req.params.id)));
};

const list = async (req, res) => {
    res.json(await PaymentService.listByBooking(req.query.bookingId));
};

const refund = async (req, res) => {
    res.json(await PaymentService.refund(Id.toUuid(req.params.id)));
};

export default { charge, get, list, refund };

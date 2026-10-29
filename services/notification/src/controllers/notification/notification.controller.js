import NotificationService from "../../services/notification/notification.service.js";

const send = async (req, res) => {
    const { notification, created } = await NotificationService.send(req.body);
    res.status(created ? 201 : 200).json(notification);
};

const list = async (req, res) => {
    res.json(await NotificationService.listByBooking(req.query.bookingId));
};

export default { send, list };

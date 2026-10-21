import CategoryService from "../../services/category/category.service.js";

const list = async (req, res) => {
    res.json(await CategoryService.list());
};

const create = async (req, res) => {
    res.status(201).json(await CategoryService.create(req.body));
};

export default { list, create };

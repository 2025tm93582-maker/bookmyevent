import AppError from "../../utils/app-error.util.js";
import CategoryRepository from "../../repositories/category/category.repository.js";

const list = () => CategoryRepository.findAll();

const create = async (data) => {
    const category = await CategoryRepository.create(data);
    if (!category) throw new AppError(409, "CATEGORY_EXISTS", `Category ${data.code} already exists`);
    return category;
};

const ensureExists = async (code) => {
    if (!(await CategoryRepository.findByCode(code))) {
        throw new AppError(400, "INVALID_CATEGORY", `Category ${code} does not exist`);
    }
};

export default { list, create, ensureExists };

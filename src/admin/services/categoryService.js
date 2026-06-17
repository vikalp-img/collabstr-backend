const Category = require("../../models/categoryModel");
const CreatorProfile = require("../../models/creatorProfileModel");
const { statusCode } = require("../../config/default.json");
const { uploadToCloudinary } = require("../../helpers/uploadToCloudinary");


exports.createCategory = async (req) => {
    try {
        const payload = req.body;
        const file = req.file;

        if (file) {
            const result = await uploadToCloudinary(file);
            payload.icon = {
                url: result.secure_url || result.url,
                public_id: result.public_id,
                resource_type: result.resource_type,
            };
        }

        const category = await Category.create(payload);
        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Category created successfully",
            data: category
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.code === 11000 ? "Category already exists" : error.message
        };
    }
};

exports.getAllCategories = async (query) => {
    try {
        const { search, page = 1, limit = 10 } = query;
        const skip = (Number(page) - 1) * Number(limit);
        const limitNum = Number(limit);

        const filter = {};
        
        if (search) {
            filter.name = { $regex: search, $options: "i" };
        }

        const total = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Add creatorCount for each category
        const categoriesWithCount = await Promise.all(categories.map(async (cat) => {
            const count = await CreatorProfile.countDocuments({ 
                category: cat.name,
                approvalStatus: 1
            });
            return {
                ...cat,
                creatorCount: count
            };
        }));

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Categories fetched successfully",
            data: {
                categories: categoriesWithCount,
                pagination: {
                    total,
                    page: Number(page),
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            }
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.updateCategory = async (req) => {
    try {
        const { id } = req.params;
        const payload = req.body;
        const file = req.file;

        if (file) {
            const result = await uploadToCloudinary(file);
            payload.icon = {
                url: result.secure_url || result.url,
                public_id: result.public_id,
                resource_type: result.resource_type,
            };
        }

        const category = await Category.findByIdAndUpdate(id, payload, { new: true });
        if (!category) throw new Error("Category not found");

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Category updated successfully",
            data: category
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

exports.deleteCategory = async (id) => {
    try {
        const category = await Category.findByIdAndDelete(id);
        if (!category) throw new Error("Category not found");

        return {
            statusCode: statusCode.OK,
            success: true,
            message: "Category deleted successfully"
        };
    } catch (error) {
        return {
            statusCode: statusCode.BAD_REQUEST,
            success: false,
            message: error.message
        };
    }
};

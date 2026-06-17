const Category = require("../../models/categoryModel");
const { statusCode } = require("../../config/default.json");


exports.getCategories = async (page, limit, search) => {
  try {
    const parsedPage = Number(page) || 1;
    const parsedLimit = Number(limit) || 12;
    const hasPagination = Number.isInteger(parsedPage) && Number.isInteger(parsedLimit) && parsedPage > 0 && parsedLimit > 0;

    const pipeline = [];

    if (search) {
      pipeline.push({
        $match: {
          name: {
            $regex: search,
            $options: "i",
          },
        },
      });
    }

    if (hasPagination) {
      const skip = (parsedPage - 1) * parsedLimit;
      pipeline.push({
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: parsedLimit },
          ],
          totalCount: [
            { $count: "count" }
          ],
        },
      }); 
    } else {
      pipeline.push({
        $facet: {
          data: [
            { $sort: { createdAt: -1 } }
          ],
          totalCount: [
            { $count: "count" }
          ],
        },
      });
    }

    const result = await Category.aggregate(pipeline);

    const categories = result[0].data;
    const total = result[0].totalCount[0]?.count || 0;

    const response = {
      statusCode: statusCode.OK || 200,
      success: true,
      data: categories,
    };

//     const [categories, total] = await Promise.all([
//   Category.find(match)
//     .sort({ createdAt: -1 })
//     .skip(skip)
//     .limit(parsedLimit)
//     .lean(),

//   Category.countDocuments(match),
// ]);

    if (hasPagination) {
      response.pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };
    }

    return response;
  } catch (error) {
    return {
      statusCode: statusCode.BAD_REQUEST,
      success: false,
      message: error.message,
    };
  }
};

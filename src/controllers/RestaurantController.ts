import { Request, Response } from "express";
import Restaurant from "../models/restaurant";

const searchRestaurants = async (req: Request, res: Response) => {
  try {
    // get the city parameter from the URL
    const city = req.params.city;

    const searchQuery = (req.query.searchQuery as string) || "";

    const selectedCuisines = (req.query.selectedCuisines as string) || "";

    const sortOption = (req.query.sortOption as string) || "lastUpdated";

    const page = parseInt((req.query.page as string) || "1");

    // console.table([city, searchQuery, selectedCuisines, sortOption, page]);

    let query: any = {};
    // check if the restaurants is available in the city or not

    // put city into query
    query["city"] = new RegExp(city, "i");

    const cityCheck = await Restaurant.countDocuments(query);

    if (cityCheck === 0) {
      return res.status(404).json({
        data: [],
        pagination: {
          total: 0,
          page: 1,
          pages: 1,
        },
      });
    }

    // now build the query
    if (selectedCuisines) {
      const cuisinesArray = selectedCuisines
        .split(",")
        .map((cuisine) => new RegExp(cuisine, "i"));

      query["cuisines"] = { $all: cuisinesArray };
    }

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");

      query["$or"] = [
        { resturantName: searchRegex },
        { cuisines: { $in: [searchRegex] } },
      ];
    }

    const pageSize = 10;

    const skip = pageSize * (page - 1);

    const restaurant = await Restaurant.find(query)
      .sort({ [sortOption]: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Restaurant.countDocuments(query);

    const response = {
      data: restaurant,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error occured while searching restaurants.",
    });
  }
};

export default {
  searchRestaurants,
};

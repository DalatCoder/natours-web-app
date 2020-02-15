class MongooseUtilities {
  constructor(mongooseQuery, URLQuery) {
    this.mongooseQuery = mongooseQuery;
    this.URLQuery = URLQuery;
  }

  filter() {
    const queryObj = { ...this.URLQuery };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];

    excludedFields.forEach(el => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);

    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, match => `$${match}`);

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));

    return this;
  }

  sort() {
    if (this.URLQuery.sort) {
      const sortBy = this.URLQuery.sort.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort('-createdAt');
    }

    return this;
  }

  limitPages() {
    if (this.URLQuery.fields) {
      const fields = this.URLQuery.fields.split(',').join(' ');
      this.mongooseQuery = this.mongooseQuery.select(fields);
    } else {
      this.mongooseQuery = this.mongooseQuery.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.URLQuery.page * 1 || 1;
    const limit = this.URLQuery.limit * 1 || 10;
    const skip = (page - 1) * limit;

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    return this;
  }
}

module.exports = MongooseUtilities;

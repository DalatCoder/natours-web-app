module.exports = (obj, allowedFields) => {
  const newObj = {};

  Object.keys(obj).forEach(field => {
    if (allowedFields.includes(field)) newObj[field] = obj[field];
  });

  return newObj;
};

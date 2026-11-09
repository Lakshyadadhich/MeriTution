export function validate(schema, source = "body") {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      if (source === "query") {
        req.validatedQuery = parsed;
      } else {
        req[source] = parsed;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default validate;

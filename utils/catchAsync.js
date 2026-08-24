const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next); // Pass any error to Express error handler
    };
};

export default catchAsync
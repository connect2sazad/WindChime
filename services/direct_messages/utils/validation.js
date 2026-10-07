import ValidationException from '../errors/ValidationException.js';

function parseRequest(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw new ValidationException('Invalid request data', {
        errors: result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))
    });
    return result.data;
}

const Validations = {
    parseRequest
}

export default Validations;
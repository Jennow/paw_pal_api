const UnauthorizedError = {
    code: 401,
    message: 'invalid_session'
}

const NotFoundError = {
    code: 404,
    message: 'not_found'
}

const ServerError = {
    code: 500,
    message: 'server_error'
}

module.exports = {
    UnauthorizedError,
    NotFoundError,
    ServerError
}
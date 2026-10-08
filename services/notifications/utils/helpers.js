/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : utils/helpers.js
 *  Module        : Application Utilities
 *  Type          : Helper Functions
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides reusable helper functions used throughout the application for
 *  common operations such as structuring standardized API responses.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Provide reusable application helper functions
 *  - Create standardized API response structures
 *  - Separate response data from response metadata
 *  - Support optional response extensions such as pagination and auth data
 *  - Attach response metadata to API responses
 *  - Automatically attach timestamps to generated responses
 *  - Maintain a consistent response format across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

export const structurize_response = (
    success,
    message = null,
    data = null,
    extras = null
) => {

    const {
        metadata = {},
        ...restData
    } = data ?? {};

    return {
        success,

        message:
            message ??
            (success ? 'Operation Successful' : 'Operation Failed'),

        data: restData,

        ...(extras ?? {}),

        metadata: {
            ...metadata,
            timestamp: new Date().toISOString(),
        },
    };
};

// example call
// structurize_response(
//     true,
//     "test",
//     {
//         id: 1,
//         name: "anmol",
//         metadata: {
//             file: "hello.txt",
//         },
//     },
//     {
//         pagination: {
//             page: 1,
//             limit: 10,
//         },
//         auth: {
//             user: 1,
//             test: false,
//         },
//         example: {
//             real: true,
//             fake: false,
//         },
//     }
// );

// example response
// {
//     success: true,
//     message: "test",
//     data: {
//         id: 1,
//         name: "anmol",
//     },
//     pagination: {
//         page: 1,
//         limit: 10,
//     },
//     auth: {
//         user: 1,
//         test: false,
//     },
//     example: {
//         real: true,
//         fake: false,
//     },
//     metadata: {
//         file: "hello.txt",
//         timestamp: "2026-09-08T..."
//     },
// }
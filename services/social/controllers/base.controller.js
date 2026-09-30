/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : controllers/base.controller.js
 *  Module        : Controllers
 *  Type          : Base Controller
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides reusable controller functionality for common resource operations,
 *  including retrieval, pagination, searching, serialization, creation,
 *  updating, deletion, and shared record-level actions.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Provide reusable controller behavior for application resources
 *  - Serialize single and multiple model records through configured schemas
 *  - Retrieve individual records and paginated record collections
 *  - Validate pagination and search query parameters
 *  - Build configurable search conditions for model queries
 *  - Support model associations when retrieving records
 *  - Create, update, and soft-delete model records
 *  - Throw standardized exceptions for missing or invalid resources
 *  - Update common record status, remarks, and tags
 *  - Remove remarks and tags from records
 *  - Forward operational errors to centralized error handling
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import {
    Op,
    col,
    fn,
    where as sequelizeWhere,
} from "sequelize";

import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import Schemas from '../schemas/registry.js';

class BaseController {

    constructor(model, { schema = null, createSchema = null, updateSchema = null, creator = false, includes = null, searchFields = [], searchConditions = null, idParam = 'id', } = {}) {
        this.model = model;
        this.schema = schema;
        this.createSchema = createSchema;
        this.updateSchema = updateSchema;
        this.creator = creator;
        this.includes = includes;
        this.searchFields = searchFields;
        this.searchConditions = searchConditions;
        this.idParam = idParam;
    }

    serialize(record, schema = this.schema) {

        if (!record) return null;

        const data = record.toJSON ? record.toJSON() : record;

        if (!schema) return data;

        return schema.parse(data);

    }

    serializeMany(records) {

        return records.map(
            record => this.serialize(record)
        );

    }

    getRequestId(req) {

        const id = req.params?.[this.idParam];

        if (id === undefined) {
            return null;
        }

        return utils.Validations.parseRequest(
            Schemas.Base.ParamsIdSchema,
            {
                id
            }
        ).id;
    }


    // get records
    async get(req, res, next) {

        try {

            const id = this.getRequestId(req);

            // No resource ID → get all records
            if (id === null) {
                return this.getAllPaginatedRecords(req, res, next);
            }

            const record = await this.model.findOne({
                where: {
                    id,
                    deleted_at: null
                },
                include: this.includes,
            });

            if (!record) {
                throw new errors.NotFoundException(
                    `${this.model.name} not found!`
                );
            }

            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: `${this.model.name} retrieved successfully.`,
                data: this.serialize(record),
            });

        } catch (error) {
            next(error);
        }

    }


    async getAllPaginatedRecords(req, res, next, where = {}) {

        try {

            // validate pagination query parameters
            const validation = Schemas.Pagination.PaginationSchema.safeParse(req.query);

            if (!validation.success) {
                throw new errors.ValidationException(
                    "Invalid Pagination Parameters",
                    {
                        errors: validation.error.issues.map(issue => ({
                            field: issue.path.join('.'),
                            message: issue.message
                        })),
                    }
                );
            }

            const { page, limit: page_size, search, status } = validation.data;
            if (status !== undefined) where = { ...where, status };

            // get offset/no of records to skip
            const offset = (page - 1) * page_size;

            if (!Number.isSafeInteger(offset)) {
                throw new errors.ValidationException(
                    "Page number is too large."
                );
            }

            // search criteria
            const normalizedSearch = search?.toLowerCase();

            const fieldConditions = normalizedSearch
                ? this.searchFields.map(field =>
                    sequelizeWhere(
                        fn(
                            "LOWER",
                            col(`${this.model.name}.${field}`)
                        ),
                        {
                            [Op.like]: `%${normalizedSearch}%`,
                        }
                    )
                )
                : [];

            const customConditions =
                search && this.searchConditions
                    ? this.searchConditions(search)
                    : [];

            const allSearchConditions = [
                ...fieldConditions,
                ...customConditions,
            ];

            const searchCondition =
                allSearchConditions.length > 0
                    ? {
                        [Op.or]: allSearchConditions,
                    }
                    : null;

            const finalWhere = searchCondition
                ? {
                    [Op.and]: [
                        where,
                        searchCondition
                    ]
                }
                : where;

            // retrieve this page & count all matching records
            const { count, rows } = await this.model.findAndCountAll({
                where: finalWhere,
                include: this.includes,
                distinct: Boolean(this.includes),
                order: [
                    ['id', 'DESC']
                ],
                limit: page_size,
                offset
            });

            const totalPages = Math.ceil(count / page_size);

            return res.status(utils.HTTP_STATUS.HTTP_200_OK.status_code).json({
                success: true,
                message: `All data related to ${this.model.name} retrieved successfully.`,
                data: this.serializeMany(rows),
                pagination: {
                    page,
                    limit: page_size,
                    total: count,
                    total_pages: totalPages,
                    has_next_page: page < totalPages,
                    has_previous_page: page > 1 && totalPages > 0,
                }
            });

        } catch (e) {
            next(e);
        }

    }

    // get a record to use internally in other functions
    async getRecord(req) {

        const id = this.getRequestId(req);

        if (id === null) {
            throw new errors.NotFoundException(
                `${this.model.name} ID not provided!`
            );
        }

        const record = await this.model.findOne({
            where: {
                id,
                deleted_at: null
            }
        });

        if (!record) {
            throw new errors.NotFoundException(
                `${this.model.name} not found!`
            );
        }

        return record;
    }

    // create a new record
    async create(req, res, next) {

        try {

            const data = this.createSchema ? utils.Validations.parseRequest(this.createSchema, req.body) : { ...req.body };

            if (this.creator) {
                data.creator_id = req.auth.id;
            }

            const record = await this.model.create(data);

            // add user role details
            await record.reload({
                include: this.includes,
            });

            return res.status(
                utils.HTTP_STATUS.HTTP_201_CREATED.status_code
            ).json({
                success: true,
                message: `${this.model.name} created successfully.`,
                data: this.serialize(record),
            });

        } catch (error) {
            next(error);
        }

    }

    // update a record
    async update(req, res, next) {

        try {

            const record = await this.getRecord(req);

            const data = this.updateSchema ? utils.Validations.parseRequest(this.updateSchema, req.body) : { ...req.body };

            // if (this.creator) {
            //     data.creator_id = req.auth.id;
            // }

            const updated_record = await record.update(data);

            // add user role details
            await updated_record.reload({
                include: this.includes,
            });

            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: `${this.model.name} updated successfully.`,
                data: this.serialize(record),
            });

        } catch (e) {
            next(e);
        }

    }

    // delete a record - soft delete
    async delete(req, res, next) {

        try {

            const record = await this.getRecord(req);

            await record.destroy();

            res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: `${this.model.name} deleted successfully!`,
            });

        } catch (e) {
            next(e);
        }

    }

    // set status to true or false
    async setStatus(req, res, next) {

        try {

            const {
                status
            } = req.body

            const record = await this.getRecord(req);

            await record.update({
                status,
            })


            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: 'Status updated successfully.',
                data: this.serialize(record),
            });

        } catch (error) {

            next(error);

        }
    }

    // set remarks
    async setRemarks(req, res, next) {

        try {

            const {
                remarks
            } = req.body

            const record = await this.getRecord(req);

            await record.update({
                remarks,
            })


            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: 'Remarks updated successfully.',
                data: this.serialize(record),
            });

        } catch (error) {

            next(error);

        }
    }

    // set tags
    async setTags(req, res, next) {

        try {

            const {
                tags
            } = req.body

            const record = await this.getRecord(req);

            await record.update({
                tags,
            })


            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: 'Tags updated successfully.',
                data: this.serialize(record),
            });

        } catch (error) {

            next(error);

        }
    }

    // remove remarks
    async removeRemarks(req, res, next) {

        try {

            const {
                remarks
            } = req.body

            const record = await this.getRecord(req);

            await record.update({
                remarks: null,
            })


            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: 'Remarks updated successfully.',
                data: this.serialize(record),
            });

        } catch (error) {

            next(error);

        }
    }

    // remove tags
    async removeTags(req, res, next) {

        try {

            const record = await this.getRecord(req);

            await record.update({
                tags: null,
            })


            return res.status(
                utils.HTTP_STATUS.HTTP_200_OK.status_code
            ).json({
                success: true,
                message: 'Tags updated successfully.',
                data: this.serialize(record),
            });

        } catch (error) {

            next(error);

        }
    }

}

export default BaseController;
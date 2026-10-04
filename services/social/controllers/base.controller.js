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

    constructor(model, { schema = null, createSchema = null, updateSchema = null, creator = false, includes = null, searchFields = [], searchConditions = null, idParam = 'id', parents = [], ownerOnly = false, } = {}) {
        this.model = model;
        this.schema = schema;
        this.createSchema = createSchema;
        this.updateSchema = updateSchema;
        this.creator = creator;
        this.includes = includes;
        this.searchFields = searchFields;
        this.searchConditions = searchConditions;
        this.idParam = idParam;
        this.parents = parents;
        this.ownerOnly = ownerOnly;
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

    parseId(value) {
        return utils.Validations.parseRequest(Schemas.Base.ParamsIdSchema, { id: value }).id;
    }

    getRequestId(req) {
        const value = req.params?.[this.idParam];
        return value === undefined ? null : this.parseId(value);
    }

    async getScope(req, transaction) {
        const scope = {};
        for (const parent of this.parents) {
            const id = this.parseId(req.params?.[parent.param]);
            const where = { id };
            // Optional relationship constraints for deeper nested parents.
            for (const [field, param] of Object.entries(parent.scope || {})) {
                where[field] = this.parseId(req.params?.[param]);
            }
            const record = await parent.model.findOne({
                where, transaction,
                ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
            });
            if (!record) throw new errors.NotFoundException(parent.model.name + ' not found');
            scope[parent.field] = id;
        }
        return scope;
    }

    assertOwner(req, record) {
        if (!this.ownerOnly) return;
        if (!req.auth) throw new errors.UnauthorizedException();
        if (record.creator_id !== req.auth.id) {
            throw new errors.ForbiddenException('You can only modify your own records');
        }
    }

    async getRecord(req, { transaction, write = true } = {}) {
        const id = this.getRequestId(req);
        if (id === null) throw new errors.NotFoundException(this.model.name + ' ID not provided');
        const scope = await this.getScope(req, transaction);
        const record = await this.model.findOne({
            where: { ...scope, id }, include: this.includes, transaction,
            ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
        });
        if (!record) throw new errors.NotFoundException(this.model.name + ' not found');
        if (write) this.assertOwner(req, record);
        return record;
    }

    async get(req, res, next) {
        try {
            if (this.getRequestId(req) === null) return this.getAllPaginatedRecords(req, res, next);
            const record = await this.getRecord(req, { write: false });
            return res.status(200).json({
                success: true,
                message: this.model.name + ' retrieved successfully.', data: this.serialize(record)
            });
        } catch (error) { return next(error); }
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

            const scope = await this.getScope(req);
            const filteredWhere = searchCondition
                ? {
                    [Op.and]: [
                        where,
                        searchCondition
                    ]
                }
                : where;

            // retrieve this page & count all matching records
            const { count, rows } = await this.model.findAndCountAll({
                where: { [Op.and]: [scope, filteredWhere] },
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

    async create(req, res, next) {
        try {
            const input = this.createSchema ? utils.Validations.parseRequest(this.createSchema, req.body) : { ...req.body };
            const data = await this.model.sequelize.transaction(async transaction => {
                const scope = await this.getScope(req, transaction);
                const values = { ...input, ...scope };
                if (this.creator) {
                    if (!req.auth) throw new errors.UnauthorizedException();
                    values.creator_id = req.auth.id;
                }
                const record = await this.model.create(values, { transaction });
                await record.reload({ include: this.includes, transaction });
                return this.serialize(record);
            });
            return res.status(201).json({
                success: true,
                message: this.model.name + ' created successfully.', data
            });
        } catch (error) { return next(error); }
    }

    async update(req, res, next) {
        try {
            const input = this.updateSchema ? utils.Validations.parseRequest(this.updateSchema, req.body) : { ...req.body };
            delete input.creator_id;
            for (const parent of this.parents) delete input[parent.field];
            const data = await this.model.sequelize.transaction(async transaction => {
                const record = await this.getRecord(req, { transaction });
                await record.update(input, { transaction });
                await record.reload({ include: this.includes, transaction });
                return this.serialize(record);
            });
            return res.status(200).json({
                success: true,
                message: this.model.name + ' updated successfully.', data
            });
        } catch (error) { return next(error); }
    }

    async delete(req, res, next) {
        try {
            await this.model.sequelize.transaction(async transaction => {
                const record = await this.getRecord(req, { transaction });
                await record.destroy({ transaction });
            });
            return res.status(200).json({ success: true, message: this.model.name + ' deleted successfully!' });
        } catch (error) { return next(error); }
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

}

export default BaseController;
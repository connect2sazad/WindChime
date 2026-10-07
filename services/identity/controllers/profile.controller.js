import { Op } from 'sequelize';
import Models from '../models/registry.js';
import Schemas from '../schemas/registry.js';
import { ProfileEditSchema } from '../schemas/identity.schema.js';
import { UsernameSchema } from '../schemas/identity.schema.js';
import { z } from '../docs/openapi.js';
import { parseRequest } from '../utils/validation.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
function serialize(user, own = false) { return { id: user.id, name: user.name, username: user.username, bio: user.bio || '', avatar_version: user.avatar_filename || null, created_at: user.created_at, ...(own ? { email: user.email, email_verified: Boolean(user.email_verified_at) } : {}) }; }
class ProfileController {
    async lookup(req,res,next){try{
        const {ids,search}=parseRequest(z.object({ids:z.array(z.number().int().positive()).max(100),search:z.string().trim().max(100).default('')}).strict(),req.body);
        const users=await Models.User.findAll({where:{id:{[Op.in]:ids},status:true},attributes:['id','name','username']});
        const query=search.toLowerCase();const data=users.map(user=>({id:user.id,name:user.name,username:user.username})).filter(user=>!query||user.name.toLowerCase().includes(query)||user.username.toLowerCase().includes(query));
        return res.json({success:true,data});
    }catch(error){next(error);}}
    async get(req, res, next) {
        try {
            if (!req.auth) throw new errors.UnauthorizedException();
            const { id } = parseRequest(Schemas.ParamsIdSchema, req.params); const user = await Models.User.findByPk(id);
            if (!user || !user.status) throw new errors.NotFoundException('Profile not found');
            return res.json(utils.helpers.structurize_response(true, 'Profile retrieved', serialize(user, req.auth.id === id)));
        } catch (e) { next(e); }
    }
    async update(req, res, next) {
        try {
            if (!req.auth) throw new errors.UnauthorizedException();
            const input = parseRequest(ProfileEditSchema, req.body);
            const data = await Models.User.sequelize.transaction(async transaction => {
                const user = await Models.User.findByPk(req.auth.id, { transaction, lock: transaction.LOCK.UPDATE });
                if (!user || !user.status) throw new errors.UnauthorizedException();
                if (input.username) { const existing = await Models.User.findOne({ paranoid: false, where: { username: input.username, id: { [Op.ne]: req.auth.id } }, transaction }); if (existing) throw new errors.ConflictException('Username is already taken'); }
                await user.update(input, { transaction }); await user.reload({ transaction }); return serialize(user, true);
            }); return res.json(utils.helpers.structurize_response(true, 'Profile updated', data));
        } catch (e) { next(e); }
    }

    async getByUsername(req, res, next) {
        try {
            if (!req.auth) throw new errors.UnauthorizedException();

            const username = parseRequest(
                UsernameSchema,
                req.params.username
            );

            const user = await Models.User.findOne({
                where: { username, status: true },
            });

            if (!user) {
                throw new errors.NotFoundException('Profile not found');
            }

            return res.json(
                utils.helpers.structurize_response(
                    true,
                    'Profile retrieved',
                    serialize(user, req.auth.id === user.id)
                )
            );
        } catch (error) {
            next(error);
        }
    }
}
export default new ProfileController();

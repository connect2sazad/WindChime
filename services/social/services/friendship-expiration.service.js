import Models from '../models/registry.js';

const REQUEST_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

async function expireOne(friendshipId) {
    return Models.Friendship.sequelize.transaction(async transaction => {
        const friendship = await Models.Friendship.findByPk(friendshipId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!friendship || friendship.status !== 'pending') {
            return false;
        }

        const deadline =
            friendship.requested_at.getTime() + REQUEST_LIFETIME_MS;

        if (Date.now() < deadline) {
            return false;
        }

        const recipient_id =
            friendship.requester_id === friendship.user_low_id
                ? friendship.user_high_id
                : friendship.user_low_id;

        await Models.Follow.findOrCreate({
            where: {
                follower_id: friendship.requester_id,
                following_id: recipient_id,
            },
            transaction,
        });

        await friendship.update({
            status: 'expired',
            accepted_at: null,
        }, { transaction });

        return true;
    });
}

const FriendshipExpirationService = { expireOne };

export default FriendshipExpirationService;
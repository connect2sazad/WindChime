import MessageReaction from './message-reaction.model.js';
import Conversation from './conversation.model.js';
import Message from './message.model.js';
Conversation.hasMany(Message,{foreignKey:'conversation_id',as:'messages'});
Message.belongsTo(Conversation,{foreignKey:'conversation_id',as:'conversation'});
Message.hasMany(MessageReaction,{foreignKey:'message_id',as:'reactions'});
MessageReaction.belongsTo(Message,{foreignKey:'message_id',as:'message'});
export default {Conversation,Message,MessageReaction};

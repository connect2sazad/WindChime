import Conversation from './conversation.model.js';
import Message from './message.model.js';
Conversation.hasMany(Message,{foreignKey:'conversation_id',as:'messages'});
Message.belongsTo(Conversation,{foreignKey:'conversation_id',as:'conversation'});
export default {Conversation,Message};


const tableName = "ProcessedMessage";

class IdempotentMessageHandler {
    constructor(subscriber_id, db) {
        if (!subscriber_id || typeof subscriber_id !== "string") {
            throw new Error("subscriber_id is required and must be a string");
        }

        if (!db || typeof db !== "object") {
            throw new Error("db is required and must be an object");
        }

        this.subscriber_id = subscriber_id;
        this.db = db;
    }
    
    async existOrCreate(messageUUID, t=null) {
        if (!messageUUID || typeof messageUUID !== "string") {
            throw new Error("message_uuid is required and must be a string");
        }
        
        const executeTransaction = async (transaction) => {
            const subscriberID = this.subscriber_id;
            const message = await this.db[tableName].findOne(
                { where: { messageUUID, subscriberID } },
                { transaction }
            );

            if (message) {
                return true;
            }

            await this.db[tableName].create(
                { subscriberID, messageUUID },
                { transaction }
            );
        }

        if (t) await executeTransaction(t);
        else await this.db.sequelize.transaction(executeTransaction);

        return false;
    }
}

export default IdempotentMessageHandler;

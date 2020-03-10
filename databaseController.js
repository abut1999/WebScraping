const { MongoClient } = require('mongodb');

const dbUrl = '';
const databaseController = {};

databaseController.save = async (database, collection, data) => {
  const client = await MongoClient.connect(dbUrl,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  const session = client.startSession({ readPreference: { mode: 'primary' } });
  const db = client.db(database);
  const col = db.collection(collection);
  const cols = await db.listCollections({ name: collection }).toArray();

  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  });

  try {
    if (cols.length > 0) await col.drop();
    await col.insertMany(data);
  } catch (error) {
    session.abortTransaction();
    throw error;
  }

  await session.commitTransaction();
  session.endSession();
  client.close();
  process.stdout.write('\nSaved the scraped data in the database.\n');
};

module.exports = databaseController;

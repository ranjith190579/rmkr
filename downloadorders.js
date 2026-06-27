import dotenv from 'dotenv';
import sql from 'mssql';
import { MongoClient } from 'mongodb';

dotenv.config();

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

export async function downloadOrders() {

    let mongoClient;
    let sqlPool;
    let transaction;

    try {

        // MongoDB
        mongoClient = await MongoClient.connect(process.env.MONGO_URI);

        const mongoDb = mongoClient.db(process.env.MONGO_DB);

        const ordersCollection = mongoDb.collection('orders');


        

        // Get Pending Orders
        const orders = await ordersCollection.find({
            status: 'Pending'
        }).toArray();
        const count = orders.length;

        if (orders.length === 0) {
            console.log('No Pending Orders');
            return {
                count: 0
            };
        }

        console.log(`Found ${orders.length} Orders`);

        // Mark as Processing
        const ids = orders.map(x => x._id);

        await ordersCollection.updateMany(
            { _id: { $in: ids } },
            {
                $set: {
                    status: 'Processing'
                }
            }
        );

        // SQL Connection
        sqlPool = await sql.connect(sqlConfig);

        transaction = new sql.Transaction(sqlPool);

        await transaction.begin();

        try {

            for (const order of orders) {

                // Insert Header
                await new sql.Request(transaction)
                    .input('order_id', sql.VarChar(50), order._id.toString())
                    .input('customer_id', sql.Int, order.customer_id)
                    .input('customer_name', sql.VarChar(100), order.customer_name)
                    .input('order_date', sql.DateTime, new Date(order.order_date))
                    .query(`
                        INSERT INTO OrderMaster
                        (
                            OrderID,
                            CustomerID,
                            CustomerName,
                            OrderDate
                        )
                        VALUES
                        (
                            @order_id,
                            @customer_id,
                            @customer_name,
                            @order_date
                        )
                    `);

                    
                // Insert Items
                if (order.items && order.items.length > 0) {

                    for (const item of order.items) {

                        await new sql.Request(transaction)
                            .input('order_id', sql.VarChar(50), order._id.toString())
                            .input('product_id', sql.Int, item.prod_id)
                            .input('qty', sql.Decimal(18,2), item.qty)
                            .query(`
                                INSERT INTO OrderDetail
                                (
                                    OrderID,
                                    ProductID,
                                    Qty
                                )
                                VALUES
                                (
                                    @order_id,
                                    @product_id,
                                    @qty
                                )
                            `);
                    }
                }
            }

            // Commit SQL
            await transaction.commit();

            // Update Mongo Status
            await ordersCollection.updateMany(
                { _id: { $in: ids } },
                {
                    $set: {
                        status: 'Downloaded',
                        downloaded_date: new Date()
                    }
                }
            );

            console.log('Orders Downloaded Successfully');
            return {
                count: count
            };
        }
        catch (err) {

            await transaction.rollback();

            // Reset Status
            await ordersCollection.updateMany(
                { _id: { $in: ids } },
                {
                    $set: {
                        status: 'Pending'
                    }
                }
            );

            throw err;
        }

    }
    catch (err) {

        console.error(err);

    }
    finally {

        if (sqlPool)
            await sqlPool.close();

        if (mongoClient)
            await mongoClient.close();
    }
}

//downloadOrders();
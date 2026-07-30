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

async function migrateProducts() {

    let mongoClient;

    try {

        // SQL Server Connection
        await sql.connect(sqlConfig);
        console.log("SQL Server Connected");

        // Read Customers
        const result = await sql.query(`
            SELECT *
            FROM dbo.tbl_customer_mas
        `);

        const data = result.recordset.map(item => ({
            id: item.id,
            name: item.name,
            name_tam: item.name_in_tam,
            mob_no: item.mob_no,
            dob:item.dob,
            syncDate: new Date()
        }));


        // Read Table 2
        const result2 = await sql.query(`
            SELECT * FROM dbo.tbl_product_mas
        `);

       
       const data2 = result2.recordset.map(item => ({
            prod_id: item.id,
            name: item.prod_name,
            name_tam: item.prod_name_in_tam,
            sal_rate: item.sal_rate,
            stk_in_nos:item.stk_in_nos,
            prod_grp1_id:item.prod_grp1_id,
            syncDate: new Date()    
        
        }));

        // Read Table 3
        const result3 = await sql.query(`
            SELECT * FROM dbo.tbl_prod_grp1_mas
        `);

       
       const data3 = result3.recordset.map(item => ({
            id: item.id,
            name: item.name,
            name_tam: item.name_in_tam,
            syncDate: new Date()    
        
        }));

        // MongoDB Connection
        mongoClient = new MongoClient(process.env.MONGO_URI);

        await mongoClient.connect();

        console.log("MongoDB Connected");

        const db = mongoClient.db(process.env.MONGO_DB);

        const collection = db.collection(
            process.env.MONGO_COLLECTION_SHOP_KUTTI_CUST_MAS
        );

        const collection2 = db.collection(
            process.env.MONGO_COLLECTION_SHOP_KUTTI_PROD_MAS
        );

        const collection3 = db.collection(
            process.env.MONGO_COLLECTION_SHOP_KUTTI_PROD_GRP1_MAS
        );

   // Insert both collections simultaneously
        await Promise.all([

            collection.deleteMany({}),
            collection2.deleteMany({}),
            collection3.deleteMany({})

        ]);

        await Promise.all([

            collection.insertMany(data),
            collection2.insertMany(data2),
            collection3.insertMany(data3)

        ]);
        console.log("All tables synced successfully");


/*
        // Delete all documents
        await collection.deleteMany({});

        const resultInsert = await collection.insertMany(customerData);
        */

/*
        for (const customer of customerData) {

            await collection.updateOne(
                { cus_id: customer.cus_id },
                { $set: customer },
                { upsert: true }
            );

        }            
*/
/*
        console.log(`${resultInsert.insertedCount} records inserted into MongoDB`);
        //console.log("Customers synced successfully");
        //console.log("Total Customers:", customerData.length);*/

    } catch (err) {

        console.error(err);

    } finally {

        await sql.close();

        if (mongoClient) {
            await mongoClient.close();
        }

        console.log("Connections Closed");
    }
}

migrateProducts();
import dotenv from 'dotenv';
import sql from 'mssql';
import { MongoClient } from 'mongodb';

dotenv.config();

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE_FLOWER_PKS,
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
            FROM dbo.tbl_mer_mas
        `);

        const data = result.recordset.map(item => ({
            id: item.mer_id,
            name: item.Name,
            name_tam: item.name_in_tam,
            mob_no: item.mob_no,
            dob:item.dob,
            syncDate: new Date()
        }));


        // Read Table 2
        const result2 = await sql.query(`
            SELECT * FROM dbo.tbl_mer_ledger_mas WHERE (pur>0 or rec>0 or pay>0) and dt >= DATEADD(DAY, -40, GETDATE())
        `);

       
       const data2 = result2.recordset.map(item => ({
            id: item.mer_id,
            dt: item.dt,
            opg: item.opg,
            pur: item.pur,
            rec:item.rec,
            pay:item.pay,
            clg:item.clg,
            det_pur_wt:item.det_pur_wt,
            det_rec:item.det_rec,
            det_pay:item.det_pay,            
            det_pur_auc:item.det_pur_auc,
            opg_pur:item.opg_pur,
            closed_pur:item.closed_pur,
            clg_pur:item.clg_pur,
            commn:item.commn,
            clg_after_commn:item.clg_after_commn,
            det_pay_closed:item.det_pay_closed,
            syncDate: new Date()
        }));



        // MongoDB Connection
        mongoClient = new MongoClient(process.env.MONGO_URI);

        await mongoClient.connect();

        console.log("MongoDB Connected");

        const db = mongoClient.db(process.env.MONGO_DB_FLOWER_PKS);

        const collection = db.collection(
            process.env.MONGO_COLLECTION_FLOWER_PKS_MER_MAS
        );

        const collection2 = db.collection(
            process.env.MONGO_COLLECTION_FLOWER_PKS_MER_LEDGER_MAS
        );

   // Insert both collections simultaneously
        await Promise.all([

            collection.deleteMany({}),
            collection2.deleteMany({})

        ]);

        await Promise.all([

            collection.insertMany(data),
            collection2.insertMany(data2)

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
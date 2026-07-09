import express from 'express';
import session from 'express-session';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
//import { downloadOrders } from './downloadorders.js';
import path from 'path';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));


app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        //maxAge: 24 * 60 * 60 * 1000 // 1 day
        maxAge: 2 * 60 * 1000 // 2 min
    }
}));

const client = new MongoClient(process.env.MONGO_URI);

await client.connect();

const db = client.db(process.env.MONGO_DB);
const db_flower_pks = client.db(process.env.MONGO_DB_FLOWER_PKS);

const dbSaravanan =
client.db(process.env.MONGO_DB_SARAVANAN);

const cashbook =
dbSaravanan.collection("daily_cashbook");

console.log("Mongo Connected");

app.listen(3000, () => {
    console.log("Server Running");
});


// ======================
// CUSTOMER LOGIN
// ======================

app.post('/login', async (req, res) => {

    const {
        phone,
        birthDate,
        birthMonth
    } = req.body;

    
      
    
    const customer =
    await db.collection("tbl_customer_mas")
       
    .findOne({
        mob_no: Number(phone)
    });

     //console.log("Records Found:");
       // console.log(customer);
    if (!customer) {

        return res.json({
            success: false
        });

    }

    const dob =
    new Date(customer.dob);

    const day =
    dob.getDate();

    const month =
    dob.getMonth() + 1;

    if (
        day === Number(birthDate) &&
        month === Number(birthMonth)
    ) {

        req.session.customer = {
            id: customer.id,
            phone: customer.phone
        };

        return res.json({
            success: true,
            customer
        });

    }

    return res.json({
        success: false
    });

});


// ======================
// PRODUCT LIST
// ======================

app.get('/products', async (req, res) => {

    const products =
    await db.collection("tbl_product_mas")
    .find({})
    .sort({ name: 1 })
    .toArray();

    res.json(products);

});


// ======================
// LOAD PENDING ORDER
// ======================

app.get('/pendingorder/:cusid', async (req, res) => {

    const order =
    await db.collection("orders")
    .findOne({

        customer_id:
        Number(req.params.cusid),

        status:
        "Pending"

    });
    res.json(order || null);

});


// ======================
// SAVE ORDER
// ======================

app.post('/saveorder', async (req, res) => {

    const order = req.body;

    try {

        // Customer already loaded a pending order
        if (order.order_id) {

            const existing =
            await db.collection("orders")
            .findOne({

                _id:
                new ObjectId(
                    order.order_id
                ),

                status:
                "Pending"

            });

            if (!existing) {

                return res.json({

                    success: false,

                    message:
                    "This order was already downloaded by our company for billing purpose."

                });

            }

            await db.collection("orders")
            .updateOne(

                {
                    _id:
                    new ObjectId(
                        order.order_id
                    )
                },

                {
                    $set: {

                        customer_name:
                        order.customer_name,

                        order_date:
                        new Date(),

                        items:
                        order.items

                    }
                }

            );

            return res.json({

                success: true,

                message:
                "Order Updated Successfully"

            });

        }

        // No pending order found
        // Create new order

        const result =
        await db.collection("orders")
        .insertOne({

            customer_id:
            order.customer_id,

            customer_name:
            order.customer_name,

            order_date:
            new Date(),

            status:
            "Pending",

            items:
            order.items

        });

        res.json({

            success: true,

            order_id:
            result.insertedId,

            message:
            "Order Saved Successfully"

        });

    }
    catch (err) {

        console.log(err);

        res.json({

            success: false,

            message:
            "Server Error"

        });

    }

});


// ======================
// DOWNLOAD ORDERS
// AFTER IMPORT TO SQL
// ======================

app.post('/markdownloaded', async (req, res) => {

    const result =
    await db.collection("orders")
    .updateMany(

        {
            status:
            "Pending"
        },

        {
            $set: {

                status:
                "Downloaded",

                downloaded_date:
                new Date()

            }
        }

    );

    res.json({

        success: true,

        count:
        result.modifiedCount

    });

});
app.post('/login_pks', async (req, res) => {

    const {
        mob_no,
        birthDate,
        birthMonth
    } = req.body;

    const customer =
    await db_flower_pks.collection("tbl_mer_mas")
    .findOne({
        mob_no: String(mob_no)
    });
     //console.log("Records Found:");
       // console.log(customer);

    if (!customer) {

        return res.json({
            success: false
        });

    }

    const dob =
    new Date(customer.dob);

    const day =
    dob.getDate();

    const month =
    dob.getMonth() + 1;

    if (
        day === Number(birthDate) &&
        month === Number(birthMonth)
    ) {

        req.session.customer = {
            id: customer.id,
            phone: customer.phone
        };

        return res.json({
            success: true,
            customer
        });



    }

    return res.json({
        success: false
    });

});

app.get('/ledger/:id', async (req, res) => {

    const data =
    await db_flower_pks.collection("tbl_mer_ledger_mas")
    .find({
        id: req.params.id
    })
    .sort({
        dt: 1
    })
    .toArray();

    res.json(data);

});


app.get('/pending-order-count', checkAdmin, async (req, res) => {
    const ordersCollection = db.collection('orders');
    const count = await ordersCollection.countDocuments({
        status: 'Pending'
    });

    res.json({
        count
    });

});

/*
app.get('/download-orders', checkAdmin, async (req, res) => {

    try {

        const result = await downloadOrders();

        res.json({
            success: true,
            count: result?.count || 0
        });

    }
    catch (err) {

        res.status(500).json({
            success: false,
            message: err.message
        });

    }

});
*/

app.post('/admin-login', (req, res) => {

    const { password } = req.body;

    if (password === process.env.ADMIN_PASSWORD) {

        req.session.isAdmin = true;

        res.json({
            success: true
        });

    } else {

        res.json({
            success: false,
            message: 'Invalid Password'
        });

    }

});

function checkAdmin(req, res, next) {

    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Please login'
        });
    }

}

app.get('/admin-check', (req, res) => {

    res.json({
        loggedIn: !!req.session.isAdmin
    });

});

app.get('/admin-logout', (req, res) => {

    req.session.destroy(() => {

        res.json({
            success: true
        });

    });

});

/*
app.get('/downloadorders', (req, res) => {

    if (!req.session.isAdmin) {

        //return res.redirect('/login1.html');
    res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_admin_devadas.html')
    );        

    }

    res.sendFile(
        path.join(process.cwd(),
        'private',
        'downloadorders.html')
    );

});
*/

app.get('/devadas', (req, res) => {

    res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_devadas.html')
    );

});
app.get('/devadas-admin', (req, res) => {

    res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_admin_devadas.html')
    );

});

app.get('/order', (req, res) => {




    //if (!req.session.customer) {
    //    return res.redirect('/');
    //}

    if (!req.session.customer) {

        //return res.redirect('/login1.html');
        return res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_devadas.html')
    );        

    }


    res.sendFile(
        path.join(
            process.cwd(),
            'private',
            'order.html'
        )
    );

});

app.get('/pks', (req, res) => {

    res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_pks.html')
    );

});

app.get('/mer_trans_det', (req, res) => {




    //if (!req.session.customer) {
    //    return res.redirect('/');
    //}

    if (!req.session.customer) {

        //return res.redirect('/login1.html');
        return res.sendFile(
        path.join(process.cwd(),
        'private',
        'login_pks.html')
    );        

    }


    res.sendFile(
        path.join(
            process.cwd(),
            'private',
            'merchant_transaction_details.html'
        )
    );

});

/*=========================================
        SAVE CASH BOOK
=========================================*/

app.post("/savecashbook", async (req, res) => {

    try {

        const data = req.body;

        /*-----------------------------
            Validation
        -----------------------------*/

        if (!data.entry_date)
            return res.json({
                success: false,
                message: "Entry Date Required."
            });

        if (!data.type)
            return res.json({
                success: false,
                message: "Type Required."
            });

        if (Number(data.amount) <= 0)
            return res.json({
                success: false,
                message: "Invalid Amount."
            });

        saveCashBook(data, res);

    }
    catch (ex) {

        console.log(ex);

        res.json({
            success: false,
            message: ex.message
        });

    }

});
/*=========================================
        SAVE CASH BOOK
=========================================*/

async function saveCashBook(data, res){

    try{

        /*-------------------------
            Validate Date
        --------------------------*/

        const valid =
        await validateEntryDate(
            data.entry_date
        );

        if(!valid){

            return res.json({

                success:false,

                message:"Entry date should not be earlier than last entry."

            });

        }


        /*-------------------------
            Get Last Entry
        --------------------------*/

        const last =
        await cashbook
        .find()
        .sort({
            created_at:-1
        })
        .limit(1)
        .toArray();


        let opening = 0;

        if(last.length>0){

            opening =
            Number(
            last[0].closing
            );

        }


        /*-------------------------
            Calculate Closing
        --------------------------*/

        let closing = opening;

        if(data.type=="Receipt"){

            closing =
            opening +
            Number(data.amount);

        }
        else{

            closing =
            opening -
            Number(data.amount);

        }


        /*-------------------------
            Build Document
        --------------------------*/

        const doc={

            entry_date : data.entry_date,

            entry_time : getCurrentTime(),
            created_at:new Date(),

            opening : opening,

            amount : Number(data.amount),

            type : data.type,

            closing : closing,

            remarks : data.remarks

        };


        /*-------------------------
            Insert
        --------------------------*/

        await cashbook.insertOne(doc);


        /*-------------------------
            Success
        --------------------------*/

        res.json({

            success:true

        });

    }
    catch(ex){

        console.log(ex);

        res.json({

            success:false,

            message:ex.message

        });

    }

}

/*=========================================
        CURRENT TIME
=========================================*/

function getCurrentTime(){

    const d = new Date();

    let hh = d.getHours();

    let mm = d.getMinutes();

    hh = String(hh).padStart(2,"0");

    mm = String(mm).padStart(2,"0");

    return hh + ":" + mm;

}

/*=========================================
        DATE VALIDATION
=========================================*/

async function validateEntryDate(entryDate){

    const last =
    await cashbook
    .find()
    .sort({created_at:-1})
    .limit(1)
    .toArray();

    if(last.length==0){

        return true;

    }

    if(entryDate < last[0].entry_date){

        return false;

    }

    return true;

}

/*=========================================
        CASH BOOK LIST
=========================================*/

app.get("/cashbooklist", async (req, res) => {

    try {

        const today = new Date();

        const fromDate = new Date();

        fromDate.setDate(today.getDate() - 45);

        const yyyy = fromDate.getFullYear();

        const mm = String(fromDate.getMonth() + 1).padStart(2, "0");

        const dd = String(fromDate.getDate()).padStart(2, "0");

        const startDate =
            `${yyyy}-${mm}-${dd}`;

        const rows =
        await cashbook
        .find({

            entry_date: {

                $gte: startDate

            }

        })
        .sort({

            created_at: 1

        })
        .toArray();

        res.json(rows);

    }
    catch (ex) {

        console.log(ex);

        res.json([]);

    }

});

/*=========================================
        FORMAT DATE
=========================================*/

function formatDate(date){

    const d = new Date(date);

    const months = [

        "Jan","Feb","Mar","Apr","May","Jun",

        "Jul","Aug","Sep","Oct","Nov","Dec"

    ];

    const dd =
    String(d.getDate()).padStart(2,"0");

    const mm =
    months[d.getMonth()];

    const yyyy =
    d.getFullYear();

    return `${dd}-${mm}-${yyyy}`;

}

/*=========================================
        UPDATE CASH BOOK
=========================================*/

app.put("/updatecashbook", async (req, res) => {

    try {

        const data = req.body;

        if (!data._id) {

            return res.json({

                success: false,

                message: "Invalid Entry."

            });

        }

        await updateCashBook(data, res);

    }
    catch (ex) {

        console.log(ex);

        res.json({

            success: false,

            message: ex.message

        });

    }

});

/*=========================================
        UPDATE CASH BOOK
=========================================*/

/*=========================================
        UPDATE CASH BOOK
=========================================*/

async function updateCashBook(data,res){

    try{

        const last =
        await isLastEntry(data._id);

        if(!last){

            return res.json({

                success:false,

                message:"Only last entry can be edited."

            });

        }


        const doc =
        await cashbook.findOne({

            _id:new ObjectId(data._id)

        });

        if(!doc){

            return res.json({

                success:false,

                message:"Entry not found."

            });

        }


        let closing =
        Number(doc.opening);

        if(data.type=="Receipt"){

            closing += Number(data.amount);

        }
        else{

            closing -= Number(data.amount);

        }


        await cashbook.updateOne(

        {

            _id:new ObjectId(data._id)

        },

        {

            $set:{

                amount:Number(data.amount),

                type:data.type,

                closing:closing,

                remarks:data.remarks

            }

        }

        );


        res.json({

            success:true

        });

    }
    catch(ex){

        console.log(ex);

        res.json({

            success:false,

            message:ex.message

        });

    }

}

/*=========================================
        CHECK LAST ENTRY
=========================================*/

async function isLastEntry(id){

    const last =
    await cashbook
    .find()
    .sort({
        created_at:-1
    })
    .limit(1)
    .toArray();

    if(last.length==0)
        return false;

    return last[0]._id.toString()==id;

}

/*=========================================
        DELETE CASH BOOK
=========================================*/

app.delete("/deletecashbook/:id", async (req, res) => {

    try {

        const id = req.params.id;

        if (!id) {

            return res.json({

                success: false,

                message: "Invalid Entry."

            });

        }

        await deleteCashBook(id, res);

    }
    catch (ex) {

        console.log(ex);

        res.json({

            success: false,

            message: ex.message

        });

    }

});

/*=========================================
        DELETE CASH BOOK
=========================================*/

async function deleteCashBook(id, res){

    try{

        const last =
        await isLastEntry(id);

        if(!last){

            return res.json({

                success:false,

                message:"Only last entry can be deleted."

            });

        }

        const result =
        await cashbook.deleteOne({

            _id:new ObjectId(id)

        });

        if(result.deletedCount==0){

            return res.json({

                success:false,

                message:"Entry not found."

            });

        }

        res.json({

            success:true

        });

    }
    catch(ex){

        console.log(ex);

        res.json({

            success:false,

            message:ex.message

        });

    }

}
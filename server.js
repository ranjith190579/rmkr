import express from 'express';
import session from 'express-session';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import cors from 'cors';
import { downloadOrders } from './downloadorders.js';
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
    await db.collection("customers")
    
    .findOne({
        phone: Number(phone)
    });
     //console.log("Records Found:");
        //console.log(customer);
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
app.post('/login_flower_pks', async (req, res) => {

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
    res.sendFile(
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
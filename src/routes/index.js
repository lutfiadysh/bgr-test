var express = require('express');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var crypto = require('crypto');
var router = express.Router();
var db = require('../../db');


router.get('/', (req, res) => {
    if (req.user) {
        db.all("SELECT * FROM products ORDER BY created_at DESC", (err, rows) => {
            db.all("SELECT * FROM cart WHERE user_id = ? ORDER BY created_at DESC", [req.user.id], (err, cart) => {
                res.render('dashboard/dashboard_page', {
                    user: req.user,
                    url: req.url,
                    product: rows,
                    cart: cart,
                });
            });

        });

    } else {
        res.redirect('/login');
    }
});

router.get('/product', (req, res) => {
    if (req.user) {
        db.all("SELECT * FROM products ORDER BY created_at DESC", (err, rows) => {
            res.render('dashboard/product_page', {
                user: req.user,
                url: req.url,
                result: rows,
            });
        });

    } else {
        res.redirect('/login');
    }
});

router.get('/report', (req, res) => {
    if (req.user) {
        db.all(`SELECT 
                payment_products.*,
                payments.invoice_id AS invoice,
                payments.payment_type AS payment_type,
                products.name AS product_name,
                payments.subtotal AS totalAfterTax
            FROM 
                payment_products
            LEFT JOIN
                payments
            ON 
                payments.id = payment_products.payment_id
            LEFT JOIN 
                products
            ON
                products.id = payment_products.product_id
            ORDER BY
                payment_products.created_at DESC`, (err, rows) => {
            res.render('dashboard/report_page', {
                user: req.user,
                url: req.url,
                rows,
            });
        });
    } else {
        res.redirect('/login');
    }
});

router.get('/checkout', (req, res) => {
    if (req.user) {
        db.all(`
                SELECT 
                    cart.*,
                    products.name AS product_name,
                    products.price AS product_price,
                    products.description AS product_description
                FROM 
                    cart 
                LEFT JOIN
                    products
                ON 
                    products.id = cart.product_id
                WHERE 
                    cart.user_id = ? 
                ORDER BY created_at DESC
            `, [req.user.id], (err, rows) => {
            if (err) {
                console.log(err)
            }
            let total = 0;
            let totalTax = 0;
            rows.forEach(element => {
                total += element.product_price * element.qty;
                totalTax = total * 11 / 100;
            });
            res.render('dashboard/checkout_page', {
                user: req.user,
                url: req.url,
                cart: rows,
                total: total,
                totalTax: total + totalTax,
            });
        });

    } else {
        res.redirect('/login');
    }
});

router.post('/checkout', (req, res) => {
    if (req.body.payment) {

        db.all(`
                SELECT 
                    cart.*,
                    products.price AS product_price,
                    products.stock AS product_stock
                FROM 
                    cart
                LEFT JOIN
                    products
                ON
                    products.id = cart.product_id
                WHERE 
                    user_id = ? 
            `, [req.user.id], (err, rows) => {

            let carts = [];
            console.log(rows);
            rows.forEach(element => {
                carts.push(element);
            });
            var number;
            do {
                number = Math.floor(Math.random() * 999);
            } while (number < 100);


            var datetime = new Date();
            let invoicenum = 'INV/' + romanize(datetime.getMonth()) + '/' + datetime.getFullYear() + '/' + number;
            console.log(invoicenum);
            db.run(`
                INSERT INTO payments (invoice_id, total, subtotal, payment_type) VALUES (?, ?, ?, ?)    
            `, [
                invoicenum,
                req.body.total,
                req.body.subtotal,
                req.body.payment,
            ], function (err) {
                if (err) {
                    console.log(err);
                } else {
                    var id = this.lastID;
                    carts.forEach(element => {
                        db.run(`
                            INSERT INTO payment_products (payment_id, product_id, total, qty) 
                            VALUES (?, ?, ?, ?)    
                        `, [
                            id,
                            element.product_id,
                            element.product_price * element.qty,
                            element.qty
                        ]);

                        let qtyResult = element.product_stock - element.qty;
                        db.run(`
                                UPDATE products SET stock = ? WHERE id = ?
                            `, [qtyResult, element.product_id]);
                    });

                    db.run(`
                        DELETE FROM cart WHERE user_id = ?
                        `, [req.user.id],
                    );
                }
            });

            return res.redirect('/');
        });
    } else {
        return res.redirect('/checkout');
    }

});

router.get('/add-product', (req, res) => {
    if (req.user) {
        res.render('dashboard/add_product_page', {
            user: req.user,
            url: req.url,
        });


    } else {
        res.redirect('/login');
    }
});

router.get('/edit-product/:id', (req, res) => {
    if (req.user) {
        var id = req.params.id;
        db.get("SELECT * FROM products WHERE id = ?", [id], (err, rows) => {
            res.render('dashboard/edit_product_page', {
                detail: rows,
                url: req.url,
                user: req.user,
                id: id
            });
        });

    } else {
        res.redirect('/login');
    }
});

router.get('/user', (req, res) => {
    if (req.user) {
        var result = [];
        db.all("SELECT users.*,roles.name AS role_name FROM users LEFT JOIN roles ON roles.id = users.role_id", (err, rows) => {

            res.render('dashboard/user_page', {
                user: req.user,
                url: req.url,
                result: rows,
            });
        });
    } else {
        res.redirect('/login');
    }
});

router.get('/add-user', (req, res) => {
    if (req.user) {
        db.all(`SELECT * FROM roles`, (err, roles) => {
            res.render('dashboard/add_user_page', {
                user: req.user,
                url: req.url,
                roles
            });
        });
    } else {
        res.redirect('/login');
    }
});

router.post('/submit-user', (req, res) => {
    var salt = crypto.randomBytes(16);
    db.run(`INSERT OR IGNORE INTO users (username, hashed_password, salt, role_id, email) VALUES (?, ?, ?, ?, ?)`,
        [
            req.body.username,
            crypto.pbkdf2Sync(req.body.password, salt, 310000, 32, 'sha256'),
            salt,
            req.body.role,
            req.body.email
        ]
    );

    res.redirect('/user');
});

router.get('/login', (req, res) => {
    if (req.user) {
        res.redirect('/');
    } else {
        res.render('login/login_page', {
            url: req.url
        });
    }
});

router.post('/submit-product', async (req, res, next) => {
    db.run(`INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)`, [
        req.body.name,
        req.body.description,
        req.body.price,
        req.body.stock,
    ]);
    res.redirect('/product');
});

router.post('/update-product/:id', async (req, res, next) => {
    db.run(`UPDATE products SET name = ?, description = ?, price = ?, stock = ? WHERE id = ?`, [
        req.body.name,
        req.body.description,
        req.body.price,
        req.body.stock,
        req.params.id,
    ]);
    res.redirect('/product');
});

router.get('/add-cart/:id', async (req, res, next) => {
    db.get(`SELECT * FROM products WHERE id = ?`, [req.params.id], function (err, rowsdata) {
        if (err) {
            console.log(err)
        }
        // console.log(rowsdata.stock)
        console.log(`SELECT * FROM cart WHERE product_id = ${req.params.id} AND user_id = ${req.user.id}`)
        if (rowsdata) {
            if (rowsdata.stock > 0) {
                db.get(`SELECT * FROM cart WHERE product_id = ? AND user_id = ?`, [
                    req.params.id,
                    req.user.id
                ], function (err, row) {
                    if (err) {
                        console.log(err)
                    }
                    console.log(row)
                    if (row) {
                        console.log('update');
                        let qty = row.qty + 1;
                        db.run(`UPDATE cart SET qty = ? WHERE id = ?`, [qty, row.id,]);
                    } else {
                        console.log('insert');
                        db.run(`INSERT INTO cart (product_id, qty, user_id) VALUES (?, ?, ?)`, [
                            req.params.id,
                            1,
                            req.user.id
                        ]);
                    }
                });
            }
        }
    });


    res.redirect('/');
});

router.get('/min-cart/:id', async (req, res, next) => {
    db.get(`SELECT * FROM cart WHERE product_id = ? AND user_id = ?`, [
        req.params.id,
        req.user.id
    ], function (err, row) {
        if (err) {
            console.log(err)
        }
        if (row) {
            if (row.qty > 1) {
                let qty = row.qty - 1;
                db.run(`UPDATE cart SET qty = ? WHERE id = ?`, [qty, row.id,]);
            } else {
                db.run(`DELETE FROM cart WHERE id = ?`, [row.id]);
            }
        }
    });

    res.redirect('/');
});

function romanize(num) {
    if (!+num)
        return false;
    var digits = String(+num).split(""),
        key = ["", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
            "", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
            "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"],
        roman = "",
        i = 3;
    while (i--)
        roman = (key[+digits.pop() + (i * 10)] || "") + roman;
    return Array(+digits.join("") + 1).join("M") + roman;
}

module.exports = router
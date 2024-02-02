// Import utilities
const morgan = require('morgan');
const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const cookieParser = require("cookie-parser");
const session = require('express-session');
const request = require('request');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const crypto = require('crypto');
const DOMPurify = createDOMPurify(window);
const { json } = require('express');
const cors = require("cors");


// Create app
var app = express();


// Middleware
app.set('view engine', 'ejs');

app 
    .use(cors())
    .use(express.static('views'))
    .use(morgan('dev'))
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(cookieParser())
    .use(session({
        secret: 'eded86a3cc66acc7698950a73ed9a5df2091255243f08dde8fdde3b5e8774d98af959153a0d5efe4ba2b8dcbb42f1db7',
        resave: false,
        saveUninitialized: true,
        cookie: { maxAge: 24 * 60 * 60 * 1000, // 1 day
         }, 
    }))
    .use((req, res, next) => { // Prevent user from going back after a logout
        if (!req.userId) {
            res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            res.header('Expires', '-1');
            res.header('Pragma', 'no-cache');
        }
        next();
    });
    

// Auxiliary functions
const NotLoggedOn = (req, res, next) => {
    if (typeof req.session.userId == 'undefined' || req.session.userId <= 0) {
        res.redirect('/');
    }
    else {
        next();
    }
};

const LoggedOn = (req, res, next) => {
    if (typeof req.session.userId !== 'undefined' && req.session.userId > 0) {
        res.redirect('/dashboard');
    }
    else {
        next();
    }
};

const getNumReviewsPerUser = function (id) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetUserReviewsNUM(?)';

        dbconnection.query(sql, [id], (err, data) => {
            if (err) {
                reject(err);
            }

            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetUserReviewsNUM(' + id + ')';
                resolve(data[0][str]);
            }

            else {
                resolve(0);
            }
        });
    });
};

const getAvgRatingUser = function (id) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetAvgRatingUser(?)';

        dbconnection.query(sql, [id], (err, data) => {
            if (err) {
                reject(err);
            }

            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetAvgRatingUser(' + id + ')';
                resolve(data[0][str]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const getNumRatingsPerMovie = function (numSerie) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetMovieRatingsNUM(?)';

        dbconnection.query(sql, [numSerie], (err, data) => {
            if (err) {
                reject(err);
            }
            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetMovieRatingsNUM(' + "'" + numSerie + "'" + ')';
                resolve(data[0][str]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const getNumReviewsPerMovie = function (numSerie) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetMovieReviewsNUM(?)';

        dbconnection.query(sql, [numSerie], (err, data) => {
            if (err) {
                reject(err);
            }
            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetMovieReviewsNUM(' + "'" + numSerie + "'" + ')';
                resolve(data[0][str]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const getAvgRatingMovie = function (numSerie) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetAvgRatingMovie(?)';

        dbconnection.query(sql, [numSerie], (err, data) => {
            if (err) {
                reject(err);
            }
            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetAvgRatingMovie(' + "'" + numSerie + "'" + ')';
                resolve(data[0][str]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const getMovieReviewsDetails = function (numSerie) {
    return new Promise((resolve, reject) => {

        var sql = 'CALL spGetMovieReviewsDetails(?)';

        dbconnection.query(sql, [numSerie], (err, data) => {
            if (err) {
                reject(err);
            }
            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'spGetMovieReviewsDetails(' + "'" + numSerie + "'" + ')';
                resolve(data[0]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const getMovieRatingUser = function (numSerie, usrID) {
    return new Promise((resolve, reject) => {

        var sql = 'SELECT udfGetMovieRatingUser(?,?)';

        dbconnection.query(sql, [numSerie, usrID], (err, data) => {
            if (err) {
                reject(err);
            }
            if (typeof data !== 'undefined' && data.length > 0) {
                str = 'udfGetMovieRatingUser(' + "'" + numSerie + "'," + usrID + ')';
                resolve(data[0][str]);
            }
            else {
                resolve(0);
            }
        });
    });
};

const sanitizeValue = function (value) {
    return DOMPurify.sanitize(value);
}


// Connect to database (MUST USE LEGACY AUTHENTICATION METHOD (RETAIN MYSQL 5.X COMPATIBILITY))
const dbconnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'SIO21G04',
    database: 'film_review',
    multipleStatements: true,
});

dbconnection.connect((error) => {

    if (error) {
        console.log("ERROR: Problems connecting to database!");
    }

    else {
        console.log("Connected to database successfully!");
    }

});


// Listen to requests
const port = process.env.port || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));


// Routes
app.get('/', (req, res) => {

    res.render('index', { session: req.session });

});

app.get('/login', LoggedOn, (req, res) => {

    res.render('login', { session: req.session, failed: 0 });

});


app.get('/uap-auth', LoggedOn, (req, res) => { // WILL REDIRECT TO THE UAP, IN ORDER TO REQUEST AUTHENTICATION
    request('http://localhost:4000/uap-auth/' +  encodeURIComponent('http://localhost:3000') + encodeURIComponent('/echap_handshake'), (error, response, body) => {
        if (error) {
            res.status(503).render('503');
        }
        else {
            res.redirect(301, 'http://localhost:4000/uap-auth/' + encodeURIComponent('http://localhost:3000')+ encodeURIComponent('/echap_handshake'))
        }
    });
});

app.get('/signup', LoggedOn, (req, res) => {

    res.render('signup', { session: req.session, failed: 0 });

});

app.get('/dashboard', NotLoggedOn, (req, res) => {

    getNumReviewsPerUser(req.session.userId).then((data1) => {

        getAvgRatingUser(req.session.userId).then((data2) => {
            res.render('dashboard', { session: req.session, failed: 0, numRev: data1, avgRat: data2 });
        });
    });

});

app.get('/catalog', (req, res) => {
    dbconnection.query("SELECT * FROM movies", (err, data) => {

        if (err) {
            console.log('Error in query');
        }
        else {
            res.render('catalog', { session: req.session, movieSet: data });
        }
    });
});

app.get('/alterPassword', (req, res) => {

    res.redirect('dashboard');

});

app.get('/movieReview/:id', (req, res) => {

    if (req.params.id.length != 8) {
        throw new Error("Bad request")
    }

    getMovieRatingUser(req.params.id, req.session.userId).then((data1) => {

        getAvgRatingMovie(req.params.id).then((data2) => {

            getNumRatingsPerMovie(req.params.id).then((data3) => {

                getNumReviewsPerMovie(req.params.id).then((data4) => {

                    getMovieReviewsDetails(req.params.id).then((data5) => {

                        var sql = 'SELECT * FROM movies where numSerie = ?';

                        dbconnection.query(sql, [req.params.id], (err, data6) => {
                            if (err) {
                                console.log("Error in query")
                                res.redirect('/catalog')
                            }
                            else {
                                res.render('movieReview', { session: req.session, usrRate: data1, avgRat: data2, numRat: data3, numReviews: data4, reviewDet: data5, movieSet: data6 });
                            }
                        });
                    });
                });
            });
        });
    });
});


////////////////////////////////////////////////////////////////////////////////////////
//////                                                                            //////
//////                  ECHAP PROTOCOL IMPLEMENTATION STARTS HERE                 //////
//////                                                                            //////
//////////////////////////////////////////////////////////////////////////////////////// 

app.post('/echap_handshake', (req, res) => {
    if (req.body.step == "HANDSHAKE" && req.body.msg == "Hello"){
        res.send(JSON.stringify({msg: "Hello", step:"HANDSHAKE", nextPoint:"/echap_challenge", Val: 0}));
    }
    else{
        res.send(JSON.stringify({msg: "Hello", step:"HANDSHAKE", nextPoint:"/echap_challenge", Val: 1}));
    }
});    

app.post('/echap_challenge', (req, res) => {
    if (req.body.step == "AUTHORIZATION" && req.body.val == 0){

        const sql = 'SELECT username, salt FROM film_review.users WHERE email=?';

        dbconnection.query(sql, [req.body.msg], (err, data) => {
            if (err) {
                res.send(JSON.stringify({msg: Date.now()+crypto.randomBytes(32).toString('base64'), step:"CHALLENGE", nextPoint:"/echap_validate", salt: crypto.randomBytes(32).toString('base64'), Val: 1}));
            }
            else {
                if (data == null || data == 0){
                    res.send(JSON.stringify({msg: Date.now()+crypto.randomBytes(32).toString('base64'), step:"CHALLENGE", nextPoint:"/echap_validate", salt: crypto.randomBytes(32).toString('base64'), Val: 1}));
                }
                else{ // If the email given by the client exists in the database, he is authorized
                    res.send(JSON.stringify({msg: Date.now()+crypto.randomBytes(32).toString('base64'), step:"CHALLENGE", nextPoint:"/echap_validate", salt: data[0]["salt"], Val: 0}));
                }
            }
        });
    }
    else{
        res.send(JSON.stringify({msg: Date.now()+crypto.randomBytes(32).toString('base64'), step:"CHALLENGE", nextPoint:"/echap_validate", salt: crypto.randomBytes(32).toString('base64'), Val: 1}));
    }
});    

app.post('/echap_validate', (req, res) => {
    if (req.body.step == "CHALLENGE_RESPONSE" && req.body.val == 0){

        const sql = 'SELECT passwordHash FROM film_review.users WHERE email=?';

        dbconnection.query(sql, [req.body.email], (err, data) => {
            if (err) {
                res.send(JSON.stringify({msg: "FAILURE"}));            
            }

            else {
                if (data == null || data == 0){
                    res.send(JSON.stringify({msg: "FAILURE"}));                
                }
                else{
                    cmp = crypto.createHash('sha256').update(req.body.Unonce+data[0]["passwordHash"]).digest('hex');

                    if(req.body.msg==cmp){ // If the challenge is completed, the protocol is successfull, send url to where the client should be redirected to
                        res.send(JSON.stringify({msg: "SUCCESS", goTo: 'http://localhost:3000/echap_login/' + encodeURIComponent(req.body.msg) + '/' + encodeURIComponent(req.body.Unonce) + '/' + encodeURIComponent(req.body.email)}));        
                    }
                    else{
                        res.send(JSON.stringify({msg: "FAILURE"}));  
                    }                                  
                }
            }
        });
    }
    else{
        res.send(JSON.stringify({msg: "FAILURE"}));    }
}); 

app.get('/echap_login/:clg/:nc/:eml', (req, res) => {

    var validate = 'SELECT * FROM users WHERE email =?';

    dbconnection.query(validate, [req.params.eml], (err, data) => {
        if (err) {
            res.redirect('/')
        }

        cmp = crypto.createHash('sha256').update(req.params.nc+data[0]["passwordHash"]).digest('hex');

        if (data.length > 0) {
            if (req.params.clg==cmp) {
                req.session.userId = data[0].id;
                req.session.username = data[0].username;
                req.session.email = data[0].email;
                req.session.isAdmin = data[0].isAdmin;
                res.redirect('/')
            }
            else {
                res.redirect('/')
            }
        }
        else {
            res.redirect('/')
        }
    });                               
});
////////////////////////////////////////////////////////////////////////////////////////
//////                                                                            //////
//////                  ECHAP PROTOCOL IMPLEMENTATION ENDS HERE                   //////
//////                                                                            //////
//////////////////////////////////////////////////////////////////////////////////////// 


// User Register
app.post('/signup', (req, res) => {

    var username = req.body.username;
    var email = req.body.email;
    var password = req.body.password;
    var repeat_password = req.body.repeat_password;

    var sql = 'SELECT * FROM film_review.users WHERE email = ?'

    dbconnection.query(sql, [email], (err, data) => {
        if (err) {
            res.render('signup', { session: req.session, failed: 1 });
        }

        if (data.length > 0) {
            res.render('signup', { session: req.session, failed: 2 });
        }

        else if (repeat_password != password) {
            res.render('signup', { session: req.session, failed: 3 });
        }

        else {
            var sql = 'INSERT INTO film_review.users (email, username, passwordHash, salt) VALUES (?,?,?,?)';

            bcrypt.genSalt(10, function(err, salt) {
                bcrypt.hash(password, salt, function(err, hash) {
                    dbconnection.query(sql, [email, username, hash, salt], (err, data) => {
                        if (err) {
                            res.render('signup', { session: req.session, failed: 1 });
                        }
                        else {
                            res.redirect('/login');
                        }
                    });
                });
            });
        }
    });
});


// User Login 
app.post('/login', (req, res) => {
    var email = req.body.email;
    var password = req.body.password;

    var validate = 'SELECT * FROM users WHERE email =?';

    dbconnection.query(validate, [email], (err, data) => {
        if (err) {
            res.render('login', { session: req.session, failed: 1 });
        }

        if (data.length > 0) {
            bcrypt.compare(password, data[0].passwordHash, (err, result) => {
                if (result) {
                    req.session.userId = data[0].id;
                    req.session.username = data[0].username;
                    req.session.email = data[0].email;
                    req.session.isAdmin = data[0].isAdmin;
                    res.redirect('/');
                }
                else {
                    res.render('login', { session: req.session, failed: 2 });
                }
            });
        }
        else {
            res.render('login', { session: req.session, failed: 2 });
        }
    });
});


// Alter password 
app.post('/alterPassword', (req, res) => {
    var email = req.session.email;
    var password = req.body.current_password;
    var newPassword = req.body.new_password;
    var repeatNewPassword = req.body.repeat_new_password;

    if (req.body.current_password == newPassword) {
        getNumReviewsPerUser(req.session.userId).then((data1) => {
            getAvgRatingUser(req.session.userId).then((data2) => {
                res.render('dashboard', { session: req.session, failed: 2, numRev: data1, avgRat: data2 });
            });
        });
    }

    else if (newPassword != repeatNewPassword) {
        getNumReviewsPerUser(req.session.userId).then((data1) => {
            getAvgRatingUser(req.session.userId).then((data2) => {
                res.render('dashboard', { session: req.session, failed: 3, numRev: data1, avgRat: data2 });
            });
        });
    }

    else {
        var validate = 'SELECT id, passwordHash FROM users WHERE email =?';

        dbconnection.query(validate, [email], (err, data) => {
            if (err) {
                getNumReviewsPerUser(req.session.userId).then((data1) => {
                    getAvgRatingUser(req.session.userId).then((data2) => {
                        res.render('dashboard', { session: req.session, failed: 1, numRev: data1, avgRat: data2 });
                    });
                });
            }
            if (data.length > 0 && data[0].id == req.session.userId) {
                var sql = 'UPDATE film_review.users SET passwordHash=?, salt=? WHERE id=?';

                bcrypt.compare(password, data[0].passwordHash, (err, result) => {

                    if (result) {

                        bcrypt.genSalt(10, function(err, salt) {
                            bcrypt.hash(newPassword, salt, (err, hash) => {
                                dbconnection.query(sql, [hash, salt, req.session.userId], (err, data) => {
                                    if (err) {
                                        getNumReviewsPerUser(req.session.userId).then((data1) => {
                                            getAvgRatingUser(req.session.userId).then((data2) => {
                                                res.render('dashboard', { session: req.session, failed: 1, numRev: data1, avgRat: data2 });
                                            });
                                        });
                                    }
                                    if (data.affectedRows == 1) {
                                        getNumReviewsPerUser(req.session.userId).then((data1) => {
                                            getAvgRatingUser(req.session.userId).then((data2) => {
                                                res.render('dashboard', { session: req.session, failed: 5, numRev: data1, avgRat: data2 });
                                            });
                                        });
                                    }
                                    else {
                                        getNumReviewsPerUser(req.session.userId).then((data1) => {
                                            getAvgRatingUser(req.session.userId).then((data2) => {
                                                res.render('dashboard', { session: req.session, failed: 1, numRev: data1, avgRat: data2 });
                                            });
                                        });
                                    }
                                });
                            });
                        });
                    }
                    else {
                        getNumReviewsPerUser(req.session.userId).then((data1) => {
                            getAvgRatingUser(req.session.userId).then((data2) => {
                                res.render('dashboard', { session: req.session, failed: 4, numRev: data1, avgRat: data2 });
                            });
                        });
                    }
                });
            }
            else {
                getNumReviewsPerUser(req.session.userId).then((data1) => {
                    getAvgRatingUser(req.session.userId).then((data2) => {
                        res.render('dashboard', { session: req.session, failed: 4, numRev: data1, avgRat: data2 });
                    });
                });
            }
        });
    }
});


// Find movies by title
app.post('/searchTitle', (req, res) => {

    const sql = 'SELECT * FROM movies WHERE title LIKE ?'
    var aux = '%' + req.body.first + '%'
    dbconnection.query(sql, [aux], (err, data) => {

        if (err) {
            console.log("Error in query")
            res.redirect('/catalog');
        }
        else {
            res.json({ session: req.session, movieSet: data });
        }
    });
});


// Post comment on movie
app.post('/postComment', (req, res) => {

    var sql = 'INSERT INTO review(user_id, numSerie, review) VALUES (?,?,?)';
    dbconnection.query(sql, [req.session.userId, req.body.mvToPost, sanitizeValue(req.body.cmtToPost)], (err, data) => {

        if (err) {
            console.log("Error in query")
        }
        else {

            getMovieRatingUser(req.body.mvToPost, req.session.userId).then((data1) => {

                getAvgRatingMovie(req.body.mvToPost).then((data2) => {

                    getNumRatingsPerMovie(req.body.mvToPost).then((data3) => {

                        getNumReviewsPerMovie(req.body.mvToPost).then((data4) => {

                            getMovieReviewsDetails(req.body.mvToPost).then((data5) => {

                                var sql = 'SELECT * FROM movies where numSerie = ?';

                                dbconnection.query(sql, [req.params.id], (err, data6) => {
                                    if (err) {
                                        console.log("Error in query");
                                        res.redirect('/catalog');
                                    }
                                    else {
                                        if (data1 == null) {
                                            res.json({ session: req.session, usrRate: 0, avgRat: data2, numRat: data3, numReviews: data4, reviewSet: data5, movieSet: data6 });
                                        }
                                        else {
                                            res.json({ session: req.session, usrRate: data1, avgRat: data2, numRat: data3, numReviews: data4, reviewSet: data5, movieSet: data6 });
                                        }
                                    }
                                });
                            });
                        });
                    });
                });
            });
        }
    });
});


// Give a movie a rating x out of 5
app.post('/giveRating', (req, res) => {

    var mv = req.body.mvToPost;
    var rt = req.body.rate;
    var usr = req.session.userId;

    if (rt < 1 || rt > 5 || rt % 1 != 0) {
        res.json({ session: req.session });
    }
    else {

        const sql1 = 'SELECT rating FROM rating WHERE numSerie=? AND user_id=?';

        dbconnection.query(sql1, [mv, usr], (err, data) => {

            if (err) {
                console.log("Error in query")
                res.redirect('/catalog');
            }

            if (data == null || data == 0) {

                const sql2 = 'INSERT INTO rating VALUES (?,?,?)';

                dbconnection.query(sql2, [usr, mv, rt], (err, data) => {

                    if (err) {
                        console.log("Error in query");
                        res.redirect('/catalog');
                    }
                    else {
                        getNumReviewsPerMovie(mv).then((data1) => {
                            res.json({ session: req.session, usrRate: rt, numRat: data1 });
                        });
                    }
                });
            }
            else {
                const sql3 = 'UPDATE rating SET rating=? WHERE user_id=? AND numSerie=?';

                dbconnection.query(sql3, [rt, usr, mv], (err, data2) => {

                    if (err) {
                        console.log("Error in query");
                        res.redirect('/catalog');
                    }
                    else {
                        getNumReviewsPerMovie(mv).then((data1) => {
                            res.json({ session: req.session, usrRate: rt, numRat: data2 });
                        });
                    }
                });
            }
        });
    }
});


// User Logout
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.redirect('/dashboard');
        }
    });
    res.redirect('/login');
});


// 404
app.all('*', function (req, res) {
    throw new Error("Bad request");
});

app.use((e, req, res, next) => {

    if (e.message === "Bad request") {
        res.status(400).render('404');
    }
});

var express = require('express')
var bodyParser = require('body-parser');
var passport = require('passport');

var session = require('express-session');
var path = require('path');
var logger = require('morgan');
var csrf = require('csurf');
var cookieParser = require('cookie-parser');
var createError = require('http-errors');
var ensureLogIn = require('connect-ensure-login').ensureLoggedIn;

var SQLiteStore = require('connect-sqlite3')(session);
var db = require('./db');
var helper = require('./src/helper');

var app = express()
var port = 3000

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));



var authenticationRouter = require('./src/routes/authentication');
var indexRouter = require('./src/routes/index');


// Initialize Passport
app.use(session({
    secret: 'Lutfi@BGR',
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({ db: 'sessions.db', dir: './var/db' })
}));
app.use(csrf());
app.use(passport.authenticate('session'));

app.use(function (req, res, next) {
    var msgs = req.session.messages || [];
    res.locals.messages = msgs;

    res.locals.hasMessages = !!msgs.length;
    req.session.messages = [];
    next();
});

app.use(function (req, res, next) {
    res.locals.csrfToken = req.csrfToken();

    next();
});

app.use('/api', authenticationRouter);
app.use('/', indexRouter);

app.use(function (req, res, next) {
    next(createError(404));
});


app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;

    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

// app.listen(port, () => {
//     console.log(`Example app listening on port ${port}`)
// })

module.exports = app
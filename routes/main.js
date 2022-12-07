module.exports = (app, shopData) => {
    
    // Handle our routes
    // pasword encryption module 
    const bcrypt = require('bcrypt');
    // once logged in can pages be accessed
    const redirectLogin = (req, res, next) => {
        if (!req.session.userId)  res.redirect('./login')
        else next(); 
    }
    // validation
    const { check, validationResult } = require('express-validator');
    // home page route
    app.get('/', (req, res) => res.render('index.ejs', shopData));
    
    // about page route
    app.get('/about', (req, res) => res.render('about.ejs', shopData));
    
    //search page route
    app.get('/search', redirectLogin, (req, res) => res.render("search.ejs", shopData));
    
    // search result page route
    app.get('/search-result', check('keyword').exists().isAlphanumeric(), (req, res) => {
        //searching in the database
        let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + req.sanitize(req.query.keyword) + "%'"; // query database to get all the books
        // execute sql query
        db.query(sqlquery, (err, result) => {
            //redirect to home page if there's an error
            if (err) res.redirect('./');
            // if query returns empty set
            else if (result.length === 0) res.send('Book does not exists. If you want to add it' + '<a href=./addbook>Add book</a>');
            // creating new object to combine the query result and shop data into a single object
            let newData = Object.assign({}, shopData, { availableBooks: result });
            console.log(newData);
            res.render("list.ejs", newData);
        });
    });
    // register page route
    app.get('/register', (req, res) => res.render('register.ejs', shopData));
    
    // registering user to database
    app.post('/registered', [
        // check email 
        check('email', 'Not an email').exists().isEmail(),
        // check password
        check('password').exists().isLength({ min: 8 }).withMessage('Password Must Be at Least 8 Characters'),
        //checks username
        check('username').exists().isAscii()], (req, res) => {
            // checks validation
            const errors = validationResult(req);
            //if there are error, redirect to the register page
            if (!errors.isEmpty()) res.redirect('./register');
            else {
                // saving data in database
                const saltRounds = 10;
                // sanitising the password
                const plainPassword = req.sanitize(req.body.password);
                bcrypt.hash(plainPassword, saltRounds, (err, hashedPassword) => {
                    if (err) return err.stack;
                    // Store hashed password in your database
                    let sqlquery = 'INSERT INTO users (first, last, username, email, password) VALUES( ?, ?, ?, ?, ?)';
                    let newUser = [req.sanitize(req.body.first), req.sanitize(req.body.last), req.sanitize(req.body.username), req.sanitize(req.body.email), hashedPassword];
                    db.query(sqlquery, newUser, (err, result) => {
                        if (err) return console.error(err.message);
                    });
                    
                    message = 'Hello ' + req.sanitize(req.body.first) + ' ' + req.sanitize(req.body.last) + ' you are now registered! We will send an email to you at ' + req.sanitize(req.body.email);
                    message += ' Your password is: ' + plainPassword + ' and your hashed password is: ' + hashedPassword;
                    res.send(message + '<a href=' + './' + '> Home page</a>');
                });
            }
        });
        
        // login page route
        app.get('/login', (req, res) => { res.render('login.ejs', shopData) });
        // logging in user
        app.post('/loggedin', (req, res) => {
            // user object for sanitised form inputs
            let user = { username: req.sanitize(req.body.username), password: req.sanitize(req.body.password) };
            //checks if user exists
            let sqlquery = "SELECT username, password FROM users WHERE username = ?";
            db.query(sqlquery, user.username, (err, result) => {
                //redirect to home page if there's an error
                if (err) console.log(err.message);
                // checks if an empty set is returned
                else if (result.length === 0) res.send("User" + user.username + " doesn't exists. If you want you can register with it." + '<a href=' + './register' + '>Register page</a>')
                // user exists
                else {
                    console.log("User " + user.username + " does exist.");
                    // Compare the password supplied with the password in the database
                    bcrypt.compare(user.password, result[0].password, (err, result) => {
                        // return error message if there's an error
                        if (err) console.error(err.message);
                        // passwords match
                        else if (result) {
                            // Save user session here, when login is successful
                            req.session.userId = user.username;
                            console.log(user.username + " has logged in successfully.");
                            res.send(user.username + " has logged in successfully " + '<a href=./>Home page</a>');
                        }
                        // password don't match
                        else {
                            res.send("Incorrect Password");
                            res.redirect('/login');
                        }
                    });
                }
            });
        });
        //logout route
        app.get('/logout', redirectLogin, (req, res) => {
            req.session.destroy(err => {
                //redirect to home page if there's an error
                if (err) return res.redirect('./')
                res.send('you are now logged out. <a href=' + './' + '> Home page</a>');
            });
        });
        // lists books in the database
        app.get('/list', redirectLogin, (req, res) => {
            // execute sql query
            db.query("SELECT * FROM books", (err, result) => {
                //redirect to home page if there's an error
                if (err) res.redirect('./');
                // creating new object to combine the query result and shop data into a single object
                let newData = Object.assign({}, shopData, { availableBooks: result });
                res.render("list.ejs", newData)
            });
        });
        
        // list users page
        app.get('/listusers', redirectLogin, (req, res) => {
            db.query("SELECT first, last, username, email FROM users", (err, result) => {
                //redirect to home page if there's an error
                if (err) res.redirect('./');
                // creating new object to combine the query result and shop data into a single object
                let newData = Object.assign({}, shopData, { users: result });
                res.render("listusers.ejs", newData)
            });
        });
        
        // delete users with a given username
        app.get('/deleteusers', redirectLogin, (req, res) => {
            res.render('deleteusers.ejs', shopData);
        });
        // deletes user 
        app.post('/deleteduser', check('username').exists().isAscii(), (req, res) => {
            let username = req.sanitize(req.body.username);
            // checks if username exits within the database
            let sqlquery = "SELECT * FROM users WHERE username = ? ";
            db.query(sqlquery, username, (err, result) => {
                console.log(result);
                //return error message if there's an error
                if (err) console.error(err.message);
                // checks if an empty set is returned
                else if (result.length === 0) {
                    console.log("Username: " + username + " doesn't exist");
                    res.send("User " + username + " doesn't exist. " + 'Please enter a registered username to delete <a href=' + './deleteusers' + '> Delete users page</a>');
                }
                // if the user exists then delete the user.
                else {
                    console.log("User " + username + " exists");
                    let sqlquery = 'DELETE FROM users WHERE username = ? ';
                    db.query(sqlquery, username, (err, result) => {
                        //return error message if there's an error
                        if (err) console.error(err.message);
                        else {
                            console.log("User " + username + " has been deleted");
                            res.send("User " + username + " has been deleted" + '<a href=' + './listusers' + '> List users page</a>');
                        }
                    });
                }
            });
        });
        
        // add book page route
        app.get('/addbook', redirectLogin, (req, res) => {
            res.render('addbook.ejs', shopData);
        });
        
        // adding book to database
        app.post('/bookadded', [check('name').exists().isAlphanumeric(), check('price').exists().isDecimal({ force_decimal: true, decimal_digits: 2, locale: 'en-US' })], (req, res) => {
            // saving data in database
            let sqlquery = "INSERT INTO books (name, price) VALUES (?,?)";
            // execute sql query
            let newBook = [req.sanitize(req.body.name), req.sanitize(req.body.price)];
            db.query(sqlquery, newBook, (err, result) => {
                //return error message if there's an error
                if (err) return console.error(err.message);
                
                else res.send(req.body.name + " with price £" + req.body.price + " has been added. " + '<a href=./addbook>Add another book</a>');
            });
        });
        
        // select all books below £20
        app.get('/bargainbooks', redirectLogin, (req, res) => {
            let sqlquery = "SELECT * FROM books WHERE price < 20";
            db.query(sqlquery, (err, result) => {
                //redirect to home page if there's an error
                if (err) res.redirect('./');
                // creating new object to combine the query result and shop data into a single object
                let newData = Object.assign({}, shopData, { availableBooks: result });
                console.log(newData)
                res.render("bargains.ejs", newData)
            });
        });
        
        //weather page route
        app.get('/weather', (req, res) => res.render('weather.ejs', shopData));
        //weather api
        app.get('/weather-result', [check('city').exists().isAlpha()], (req, res) => {
            const request = require('request');
            let apiKey = '3c944b26a99110b9157e34f63e62de59';
            let city = req.sanitize(req.query.city);
            let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;
            request(url, function (err, response, body) {
                if (err) console.log('error:', error);
                else {
                    // res.send(body);
                    var weather = JSON.parse(body);
                    if (weather !== undefined && weather.main !== undefined) {
                        var wmsg = 'It is ' + weather.main.temp + ' ºC in ' + weather.name + '!' +
                        '<br> The humidity now is: ' + weather.main.humidity + "%" +
                        '<br> The wind now has a speed of ' + weather.wind.speed + ' meters/sec' +
                        '<br> Sunrise is at ' + unixToTime(weather.sys.sunrise) +
                        '<br> Sunset is at ' + unixToTime(weather.sys.sunset);
                        console.log(weather);
                        res.send(wmsg + '<br> <a href=./>Home page</a>');
                    }
                    else res.send("No data found");
                }
            });
        });
        // api route
        app.get('/api', (req, res) => {
            // console.log(req.query);
            if (Object.entries(req.query).length === 0 || Object.keys(req.query).length === 0) {
                // Query database to get all the books
                let sqlquery = "SELECT * FROM books";
                // Execute the sql query
                db.query(sqlquery, (err, result) => {
                    if (err) res.redirect('./');
                    console.log(result);
                    // Return results as a JSON object
                    res.json(result);
                });
            } 
            else{
                // get keyword from url
                let keyword = req.sanitize(req.query.keyword);
                // query database to get all the books
                let sqlquery = "SELECT * FROM books WHERE name LIKE '%" + keyword + "%'";
                // Execute the sql query
                db.query(sqlquery, (err, result) => {
                    if (err) res.redirect('./');
                    console.log(result);
                    // Return results as a JSON object
                    res.json(result);
                });
            }
        });
        // tv shows route
        app.get('/tvshows', (req, res) => res.render('tvshows.ejs', shopData));
        
        // tv shows api
        app.get('/tvshows-result', 
        // checks if the name is has only letters and numbers
        check('name').exists().isAlphanumeric(),
        (req, res) => {
            const request = require('request');
            // console.log(req.query);
            let name = req.sanitize(req.query.name);
            let url = `https://api.tvmaze.com/search/shows?q=${name}`;
            request(url, function (err, response, body) {
                if (err) console.log('error:', error);
                else {
                    let showDetails = JSON.parse(body);
                    // console.log(showDetails);
                    if (showDetails !== undefined || showDetails.show !== undefined) {
                        var details = "";
                        showDetails.forEach(element => {
                            // show that has ended
                            console.log(element.show.image);
                            if (element.show.ended != null) {
                                if (element.show.network == null) {
                                    
                                    var msg = 
                                    "Name: " + element.show.name + "<br>" + 
                                    "<img src'" + element.show.image.medium + "></img> <br>" +
                                    "Network: Unknown <br>" + 
                                    "Status: " + element.show.status + "<br>" +
                                    "Duration: " + new Date(element.show.premiered).getFullYear() + " - " +  new Date(element.show.ended).getFullYear() + "<br>" +
                                    "Genre: " + element.show.genres + "<br>";
                                }
                                else{
                                    var msg = 
                                    "Name: " + element.show.name + "<br>" +
                                    "<img src=" + element.show.image.medium +"></img> <br>" +
                                    "Network: " + element.show.network.name + "<br>" + 
                                    "Status: " + element.show.status + "<br>" +
                                    "Duration: " + new Date(element.show.premiered).getFullYear() + " - " +  new Date(element.show.ended).getFullYear() + "<br>" +
                                    "Genre: " + element.show.genres + "<br>";
                                }
                            }
                            // on going show
                            else{
                                if (element.show.network == null){
                                    var msg = 
                                    "Name: " + element.show.name + "<br>" +
                                    "<img src=" + element.show.image.medium +"></img> <br>" +
                                    "Network: Unknown <br>" + 
                                    "Status: " + element.show.status + "<br>" +
                                    "Duration: " + new Date(element.show.premiered).getFullYear() + " - " +  new Date(element.show.ended).getFullYear() + "<br>" +
                                    "Genre: " + element.show.genres + "<br>";
                                }
                                else{
                                    var msg = 
                                    "Name: " + element.show.name + "<br>" +
                                    "<img src=" + element.show.image.medium +"></img> <br>" +
                                    "Network: " + element.show.network.name + "<br>" + 
                                    "Status: " + element.show.status + "<br>" +
                                    "Duration: " + new Date(element.show.premiered).getFullYear() + " - Now <br>" +
                                    "Genre: " + element.show.genres + "<br>";
                                }
                            }
                            details += msg +"<br>";
                        });
                        res.send(details);
                    }
                    else res.send("No data found");
                }
            })
        });
        //convert unix timestamp which is in seconds to 12 hour time string
        //date constructor requires milliseconds 
        const unixToTime = (unixTimeStamp) => new Date(unixTimeStamp * 10**3).toLocaleTimeString('en-US');
    }
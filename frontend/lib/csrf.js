'use strict';

var debug = require('debug')('frontend:csrf');
var uid = require('uid2');
var crypto = require('crypto');

var saltedToken, checkToken, createToken, generateSalt;
module.exports.setToken = function (req, res, next) {

    var secret;

    if(!req.session.csrfSecret){
        uid(24, function(err, res){
            if (err) {
                return next(err);
            }
            secret = res;
            req.session.csrfSecret = secret;
            return;
        });
    }

    if(!req.session.token){
        req.session.token = saltedToken(secret);
    }
    next();
    return;
};

module.exports.check = function (req, res, next) {

    // determine user-submitted token
    var reqToken = req.body._csrf;
    var secret = req.session.csrfSecret;

    // check
    if (!reqToken || !checkToken(reqToken, secret)) {
        console.error('invalid csrf token');
        res.send('403');
        return;
    }
    next();
    return;
};

function saltedToken(secret) {
    return createToken(generateSalt(10), secret);
}

function createToken(salt, secret) {
    return salt + crypto.createHash('sha1').update(salt + secret).digest('base64');
}

function checkToken(token, secret) {
    if ('string' != typeof token) {
        return false;
    }
    return token === createToken(token.slice(0, 10), secret);
}

function generateSalt(length) {
    var SALTCHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var i, salt = [];
    for (i = 0; i < length; ++i) {
        salt.push(SALTCHARS[Math.floor(Math.random() * SALTCHARS.length)]);
    }
    return salt.join('');
}


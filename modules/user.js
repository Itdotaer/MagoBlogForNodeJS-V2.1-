var settings = require('../settings');
var mongodb = require('mongodb').Db;
var crypto = require('crypto');

function User(user){
    this.name = user.name;
    this.password = user.password;
    this.email = user.email;
}

module.exports = User;

User.prototype.save = function(callback){
    var md5 = crypto.createHash('md5'),
        email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
        head = "http://www.gravatar.com/avatar/" + email_MD5 + "?s=48";
    var user = {
        name: this.name,
        password: this.password,
        email:this.email,
        head:head
    };
    mongodb.connect(settings.url, function(err, db){
        if(err){
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if(err){
                db.close();
                return callback(err);
            }
            collection.insert(user, {safe: true}, function (err, user) {
               db.close();
               if(err){
                   return callback(err);
               }
                callback(null, user[0]);
            });
        });
    });
}
User.get = function (name ,callback) {
    mongodb.connect(settings.url, function (err, db) {
        console.log('go to search');
        if(err){
            console.log('mongodb err');
            return callback(err, null);
        }
        db.collection('users', function (err, collection) {
            if(err){
                console.log('collection err');
                db.close();
                return callback(err, null);
            }
            collection.findOne({
                name: name
            }, function (err, user) {
                console.log('go to findOne');
                db.close();
                if(err){
                    console.log('findOne err');
                    return callback(err, null);
                }
                console.log('search successed');
                callback(null, user);
            });
        });
    });
}
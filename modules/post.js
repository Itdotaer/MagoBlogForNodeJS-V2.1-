var settings = require('../settings');
var mongodb = require('mongodb').Db;

function Post(name, head, title, tags, des, content) {
    this.name = name;
    this.head = head;
    this.title = title;
    this.tags = tags;
    this.des = des;
    this.content = content;
}

module.exports = Post;

//存储一篇文章及其相关信息
Post.prototype.save = function(callback) {
    var date = new Date();
    //存储各种时间格式，方便以后扩展
    var time = {
        date: date,
        year : date.getFullYear(),
        month : date.getFullYear() + "-" + (date.getMonth() + 1),
        day : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate(),
        minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
    }
    //要存入数据库的文档
    var post = {
        name: this.name,
        head: this.head,
        time: time,
        title:this.title,
        tags: this.tags,
        des: this.des,
        content: this.content,
        pv: 0
    };
    //打开数据库
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //将文档插入 posts 集合
            collection.insert(post, {
                safe: true
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);//失败！返回 err
                }
                callback(null);//返回 err 为 null
            });
        });
    });
};

//读取文章及其相关信息
Post.getAll = function(name, callback) {
    //打开数据库
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function(err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            var query = {};
            if (name) {
                query.name = name;
            }
            //根据 query 对象查询文章
            collection.find(query).sort({
                time: -1
            }).toArray(function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);//失败！返回 err
                }
                callback(null, docs);//成功！以数组形式返回查询的结果
            });
        });
    });
};
//取10篇文章
Post.getTen = function(name, page, number, callback){
    mongodb.connect(settings.url, function (err, db) {
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                db.close();
                return callback(err);
            }
            var query = {};
            if(name){
                query.name = name;
            }
            collection.count(query, function(err, total){
                collection.find(query,{skip: (page -1)*10,limit: number}).sort({time:-1}).toArray(
                    function(err, docs){
                        db.close();
                        if(err){
                            return callback(err);
                        }
                        callback(null, docs, total);
                    });
            });
        });
    });
};

//获取一篇文章
Post.getOne = function(name, day, title, callback){
    mongodb.connect(settings.url, function (err, db) {
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                db.close();
                return callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            },function(err,doc){
                if(err){
                    db.close();
                    return callback(err);
                }
                if(doc){
                    collection.update({
                        "name": name,
                        "time.day": day,
                        "title": title
                    },{$inc: {"pv":1}},function(err){
                        db.close();
                        if(err){
                            return callback(err);
                        }
                    });
                }
                callback(null, doc);
            });
        });
    });
};

//修改一篇文章
Post.edit = function(name, day, title, callback){
    mongodb.connect(settings.url, function (err, db) {
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                db.close();
                return callback(err);
            }
            collection.findOne({
                "name": name,
                "time.day": day,
                "title": title
            },function(err, doc){
                db.close();
                if(err){
                    return callback(err);
                }
                callback(null, doc);
            });
        });
    });
};

//更新一篇文章及其相关信息
Post.update = function(name, day, title, post, callback) {
    //打开数据库
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //更新文章内容
            collection.update({
                "name": name,
                "time.day": day,
                "title": title
            }, {
                $set: {des: des, content: content}
            }, function (err) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

Post.remove = function(name, day, title, callback){
    mongodb.connect(settings.url, function (err, db) {
        if(err){
            return callback(err);
        }
        db.collection('posts', function(err, collection){
            if(err){
                db.close();
                return callback(err);
            }
            collection.remove({
                "name": name,
                "time.day": day,
                "title": title
            },{w:1}, function (err) {
                db.close();
                if(err){
                    return callback(err);
                }
                callback(null);
            });
        });
    });
};

//返回所有文章存档信息
Post.getArchive = function(callback) {
    //打开数据库
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        //读取 posts 集合
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //返回只包含 name、time、title 属性的文档组成的存档数组
            collection.find({}, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};
//返回所有标签
Post.getTags = function(callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //distinct 用来找出给定键的所有不同值
            collection.distinct("tags", function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};
//返回含有特定标签的所有文章
Post.getTag = function(tag, callback) {
    mongodb.connect(settings.url, function (err, db) {
        if (err) {
            return callback(err);
        }
        db.collection('posts', function (err, collection) {
            if (err) {
                db.close();
                return callback(err);
            }
            //查询所有 tags 数组内包含 tag 的文档
            //并返回只含有 name、time、title 组成的数组
            collection.find({
                "tags": tag
            }, {
                "name": 1,
                "time": 1,
                "title": 1
            }).sort({
                time: -1
            }).toArray(function (err, docs) {
                db.close();
                if (err) {
                    return callback(err);
                }
                callback(null, docs);
            });
        });
    });
};
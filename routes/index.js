
/*
 * Control the web access routes
 */
var blog_name = 'MagoBlogForNodeJS';
var crypto = require('crypto');
var fs = require('fs');
var User = require('../modules/user');
var Post = require('../modules/post');
var $ = require('jquery');

function isEmpty(str) {
    return (!str || 0 === str.length);
}
function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        res.redirect('/login');
    }
    next();
}

function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');
    }
    next();
}

module.exports = function(app){
	//index page
	app.get('/', function(req, res){
		res.render('index', {title: blog_name, user: req.session.user, info: req.flash('info').toString()});
	});

    app.get('/login' , checkNotLogin);
    app.get('/login' , function (req, res) {
        res.render('login', {title: '用户登录', user: req.session.user, info: req.flash('info').toString()});
    });

    app.post('/login' , checkNotLogin);
	app.post('/login', function(req, res){
        var user_name = req.body.user_name;
        var password = req.body.password;
        var md5 = crypto.createHash('md5');
        password = md5.update(password).digest('hex');
        if(isEmpty(user_name) || isEmpty(password)){
            req.flash('info', '用户名或密码为空!');
            return res.redirect('/');
        }else{
            User.get(user_name, function (err, user) {
                if(err){
                    //system exception
                    req.flash('info', err.message);
                    return res.redirect('/login');
                }
                if(!user){
                    //user is not exist
                    req.flash('info', '用户不存在!');
                    return res.redirect('/login');
                }else if(password != user.password){
                    //password is not right
                    req.flash('info', '密码错误!');
                    return res.redirect('/login');
                }else {
                    //the right user
                    //用户名密码都匹配后，将用户信息存入 session
                    req.session.user = user;
                    req.flash('info', '登陆成功!');
                    res.redirect('/');
                }
            });
        }

	});
    app.get('/logout' , checkLogin);
    app.get('/logout', function (req, res) {
        req.flash('info', null);
        req.session.user = null;
        res.redirect('/')
    });

    //通过路径实现用户注册，有利于掩藏注册接口
    app.get('/reg' , checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('register', {title: '用户注册', user: null, info: req.flash('info').toString()});
    });

    app.post('/reg' , checkNotLogin);
    app.post('/reg', function(req, res){
        var md5 = crypto.createHash('md5');
        var user_name = req.body.reg_user_name;
        var password = req.body.reg_password;
        var re_password = req.body.reg_repeat_password;
        var email = req.body.reg_email;

        if(isEmpty(user_name) || isEmpty(password) || isEmpty(re_password) || isEmpty(email)){
            req.flash('info', '注册信息某项为空!');
            return res.redirect('/reg');
        }else{

            if(password != re_password){
                req.flash('info', '两次输入的密码不一致!');
                return res.redirect('/reg');
            }

            var password = md5.update(password).digest('hex');
            var newUser = new User({
                name:user_name,
                password:password,
                email:email
            });
            //check if user exist
            User.get(user_name, function(err, user){
                if(user){
                    //user has exist
                    req.flash('info', '用户已存在!');
                    return res.redirect('/reg');
                }else{
                    newUser.save(function(err, user){
                        //register the new user
                        if(err){
                            req.flash('info', err.message);
                            return res.redirect('/reg');
                        }else{
                            req.session.user = user;
                            req.flash('info', '注册成功!');
                            res.redirect('/');
                        }
                    });
                }
            });
        }
    });
    //发表文章
    app.get('/post' , checkLogin);
    app.get('/post', function (req, res) {
        res.render('post', {title: '发表博文', user: req.session.user, info: req.flash('info').toString()});
    });

    app.post('/post' , checkLogin);
    app.post('/post', function (req, res) {
        var currentUser = req.session.user;
        var title = req.body.title;
        var tags = req.body.tags;
        var des = req.body.description;
        var post = req.body.post;
        console.log('name:'+currentUser.name+';title:'+title+';tags:'+tags+';des:'+des+';post:'+post);
        if(isEmpty(title) || isEmpty(tags) || isEmpty(des) || isEmpty(post)){
            return res.redirect('/post');
        }
        var newArticle = new Post(currentUser.name,currentUser.head,title,tags,des,post);
        newArticle.save(function (err) {
            if(err){
                req.flash('info', err.message);
                return res.redirect('/post');
            }
            req.flash('info', '文章发表成功!');
            res.redirect('/blog');
        })

    });

    //显示所有博客列表
    app.get('/blog', function (req, res) {
        Post.getAll(null, function (err, posts) {
            if (err) {
                posts = [];
            }
            res.render('blogList', {
                title: '主页',
                user: req.session.user,
                posts: posts,
                info: req.flash('info')
            });
        });
    });
    app.get('/error', function (req, res) {
        var error_info = req.flash('err_info').toString();
        res.render('error', {title: '错误页面', error_info: err_info});
    });
    //404: page not found
    app.use(function(req,res){
        res.render('404', {title: blog_name});
    });
};

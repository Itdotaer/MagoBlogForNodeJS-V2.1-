
/*
 * app路由控制
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
            return res.redirect('/login');
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
                    res.redirect('/blog');
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
        var content = req.body.content;
        if(isEmpty(title) || isEmpty(tags) || isEmpty(des) || isEmpty(content)){
            return res.redirect('/post');
        }
        var newArticle = new Post(currentUser.name,currentUser.head,title,tags,des,content);
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
        //判断是否是第一页
        var page = req.query.page_num ? parseInt(req.query.page_num) : 1;
        //页面大小为5
        var page_size = 5;
        //查询自定页面的内容
        Post.getNumPost(null, page, page_size, function (err, posts, total) {
            if(err){
                posts = [];
            }
            res.render('blogList', {
                title: '博客',
                user: req.session.user,
                posts: posts,
                page_num: page,
                total_page: parseInt(total/page_size) + 1
            });
        });
    });

    //显示用户的博客列表
    app.get('/user/:user_name', function (req, res) {
        var user_name = req.params.user_name;
        //判断是否是第一页
        var page = req.query.page_num ? parseInt(req.query.page_num) : 1;
        //页面大小为5
        var page_size = 5;
        //查询自定页面的内容
        Post.getNumPost(user_name, page, page_size, function (err, posts, total) {
            if(err){
                posts = [];
            }
            res.render('blogList', {
                title: '博客-作者:' + user_name,
                user: req.session.user,
                posts: posts,
                page_num: page,
                total_page: parseInt(total/page_size) + 1
            });
        });
    });

    //显示博客详细
    app.get('/blog/:_id', function (req, res) {
        var _id = req.params._id;
        Post.getOne(_id, function (err, post) {
            if(err){
                post = [];
            }
            res.render('article', {
                title: post.title,
                user: req.session.user,
                post: post,
                info: req.flash('info')
            });
        });
    });

    //修改博文
    app.get('/edit/:_id', checkLogin);
    app.get('/edit/:_id', function (req, res) {
        var _id = req.params._id;
        var current_user = req.session.user;
        Post.edit(current_user.name, _id, function (err, post) {
            if(err){
                res.render('error', {
                    title: '页面出错',
                    error_info: '系统出错!' +  err.message
                });
            }
            res.render('edit', {
                title: post.title,
                user: req.session.user,
                post: post,
                info: req.flash('info')
            });
        });
    });

    //确认修改
    app.post('/edit/:_id', checkLogin);
    app.post('/edit/:_id', function (req, res) {
        var _id = req.params._id;
        var des = req.body.description;
        var content = req.body.content;
        Post.update(_id, des, content, function (err) {
            if(err){
                res.render('error', {
                    title: '页面出错',
                    error_info: '系统出错!' +  err.message
                });
            }
            //修改成功，跳转查看
            Post.getOne(_id, function (err, post) {
                res.render('article', {
                    title: post.title,
                    user: req.session.user,
                    post: post,
                    info: req.flash('info')
                });
            });
        });
    });

    //删除博文
    app.get('/remove/:_id', checkLogin);
    app.get('/remove/:_id', function (req, res) {
        var _id = req.params._id;
        var current_user = req.session.user;
        Post.remove(current_user.name, _id, function (err, post) {
            if(err){
                res.render('error', {
                    title: '页面出错',
                    error_info: '系统出错!' +  err.message
                });
            }
            res.redirect('/blog');
        });
    });

    //我的足迹
    app.get('/archives', function (req, res) {
       Post.getArchive(function (err, archives) {
           res.render('archive', {
               title: '我的足迹',
               user: req.session.user,
               archives: archives,
               info: req.flash('info')
           });
       });
    });

    //标签
    app.get('/tags', function (req, res) {
        Post.getTags(function (err, tags) {
            console.log(tags);
            if(err){
                tags = [];
            }
            res.render('tags', {
                title: '标签',
                user: req.session.user,
                tags: tags
            });
        });
    });

    //获取标签文章
    app.get('/tags/:tag', function (req, res) {
        var tag = req.params.tag;
        //判断是否是第一页
        var page = req.query.page_num ? parseInt(req.query.page_num) : 1;
        //页面大小为5
        var page_size = 5;
        //查询自定页面的内容
        Post.getTag(tag, page, page_size, function (err, posts, total){
            if(err){
                posts = [];
            }
            res.render('blogList', {
                title: '博客-标签:' + tag,
                user: req.session.user,
                posts: posts,
                page_num: page,
                total_page: parseInt(total/page_size) + 1
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
	function checkLogin(req, res, next) {
		if (!req.session.user) {
			req.flash('info', '未登录!');
			res.redirect('/login');
		}
		next();
	}

	function checkNotLogin(req, res, next) {
		if (req.session.user) {
			req.flash('info', '已登录!');
			res.redirect('/blog');
		}
		next();
	}
};

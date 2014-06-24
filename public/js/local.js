$(document).ready(function(){
    $('#user_name').focus(function(){
        $('#login_info').text('');
    });
    $('#password').focus(function(){
        $('#login_info').text('');
    });
    function isEmpty(str) {
        return (!str || 0 === str.length);
    }
});



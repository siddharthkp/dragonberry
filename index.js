var https = require('https');
function fetch() {
    var options = {
        host: 'ray.practo.com',
        path: '/api/v1/status'
    };
    var callback = function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            data = JSON.parse(data);
            console.log(data);
        });
    }
    https.get(options, callback).end();

}
fetch();

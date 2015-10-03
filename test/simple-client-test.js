var simple_pc_1 = require('../simple-pc');
var Fiber = require('fibers');
console.log(process.argv);
Fiber(function () {
    var client = simple_pc_1.default.create_unix_client('test.sock');
    console.log('sending...');
    var reply = client.send(5000, 'hello', []);
    console.log('reply:', reply);
}).run();

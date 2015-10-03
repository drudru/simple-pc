var simple_pc_1 = require('../simple-pc');
var Fiber = require('fibers');
console.log(process.argv);
Fiber(function () {
    var srv = simple_pc_1.default.create_unix_server('test.sock');
    console.log('waiting for msg');
    var msg = srv.receive(15 * 1000);
    console.log('got msg:', msg);
}).run();

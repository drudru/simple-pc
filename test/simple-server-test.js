var simple_pc_1 = require('../simple-pc');
var Fiber = require('fibers');
//console.log(process.argv);
if (process.argv.length != 3) {
    console.log('error, requires an arg of 1, 2, or 3');
    process.exit(1);
}
// Receive just 1 message
if (process.argv[2] == '1') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('waiting for msg');
        var msg = srv.receive(15 * 1000);
        console.log('got msg:', msg);
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
    }).run();
}
else if (process.argv[2] == '2') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('waiting for msg');
        srv.receive_multi(15 * 1000, 2, function (msg) {
            console.log('got msg:', msg);
        });
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
    }).run();
}
else if (process.argv[2] == '3') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('sleepily waiting for msg');
        srv.sleep(5000);
        console.log('waiting for msg');
        var msg = srv.receive(15 * 1000);
        console.log('got msg:', msg);
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
    }).run();
}
else if (process.argv[2] == '4') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('sleepily waiting for 2 msgs');
        srv.sleep(5000);
        srv.receive_multi(15 * 1000, 2, function (msg) {
            console.log('got msg:', msg);
        });
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
    }).run();
}

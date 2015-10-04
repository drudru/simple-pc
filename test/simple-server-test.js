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
        process.exit(0);
    }).run();
}
else if (process.argv[2] == '2') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('waiting for msgs');
        var num_msgs = 2;
        while (num_msgs--) {
            var msg = srv.receive(15 * 1000);
            console.log('got msg:', msg);
        }
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
        process.exit(0);
    }).run();
}
else if (process.argv[2] == '3') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        console.log('sleepily waiting for msg');
        // If client sends message during sleep, it should get queued
        // up so that receive after sleep is effectively instant
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
        process.exit(0);
    }).run();
}
else if (process.argv[2] == '4') {
    Fiber(function () {
        var srv = simple_pc_1.default.create_unix_server('test.sock');
        // If multiple clients send messages during sleep,
        // they should get queued up so that receive after
        // sleep is effectively instant
        console.log('sleepily waiting for 2 msgs');
        srv.sleep(5000);
        var num_msgs = 2;
        while (num_msgs--) {
            var msg = srv.receive(15 * 1000);
            console.log('got msg:', msg);
        }
        /*
        console.log('handles');
        console.log(process["_getActiveHandles"]());
        console.log('requests');
        console.log(process["_getActiveRequests"]());
        */
        process.exit(0);
    }).run();
}

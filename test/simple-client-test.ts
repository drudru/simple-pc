

import spc from '../simple-pc';
import Fiber = require('fibers');

//console.log(process.argv);

Fiber(() => {
    let client = spc.create_unix_client('test.sock');
    
    console.log('sending...');
    let reply = client.send(5000, 'hello', []);
    console.log('reply:', reply);

    /*
    console.log('handles');    
    console.log(process["_getActiveHandles"]());
    console.log('requests');    
    console.log(process["_getActiveRequests"]());
    */
    
}).run();
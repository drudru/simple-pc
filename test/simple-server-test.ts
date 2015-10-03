

import spc from '../simple-pc';
import Fiber = require('fibers');

console.log(process.argv);

Fiber(() => {
    let srv = spc.create_unix_server('test.sock');
    
    console.log('waiting for msg');
    let msg = srv.receive(15 * 1000);
    console.log('got msg:', msg);
}).run();
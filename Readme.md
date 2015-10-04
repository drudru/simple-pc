# simple-pc

__simple-pc__ is a simple library for communicating between processes on a local or remote machine.
At this point, it only supports unix domain sockets. In the future, it will support other transports.
It is designed to be used in a node environment with fibers.

## Node Example

** LOOK AT THE TESTS IN TEST **

```JavaScript
    var spc = require('simple-pc');

    // PROVIDE EXAMPLE
```

## Building

This project is written in TypeScript and builds with gulp. The result is just one file.


    $ ./node_modules/.bin/tsd query node --action install
    $ ./node_modules/.bin/tsd query fibers --action install
    $ ./node_modules/.bin/gulp typescript


## Credits

This code was developed by Dru Nelson (<https://github.com/drudru>).

## License

(The MIT License)

Copyright (c) 2015 Dru Nelson

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WIT

var spc = require('../simple-pc');
var fs = require('fs');

var should = require('should');

describe('simple-pc', function() {

  it('should create a server', function() {

    var o = spc.create_unix_listener('srv.sock');
    should.exist(o);
  });

  it('should create a client', function() {

    var o = spc.create_unix_client('srv.sock');
    should.exist(o);
  });

  it('should handle two clients at once', function() {
    var o = spc.create_unix_client('srv.sock');
    should.exist(o);
  });
    
  afterEach(function() {
    fs.unlinkSync('srv.sock');
  });
});
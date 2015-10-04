var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var net = require('net');
var fs = require('fs');
var fibers = require('fibers');
function left_pad(txt, pad, total) {
    if (txt.length >= total)
        return txt;
    if (pad.length != 1)
        throw 'invalid pad';
    var num = total - txt.length;
    var array = new Array(num);
    array.push(txt);
    var result = array.join(pad);
    return result;
}
var SimplePC_Base = (function () {
    function SimplePC_Base(path) {
        this.path = path;
    }
    SimplePC_Base.prototype.create_rq_packet = function (cmd, payload) {
        var packet = ["rq2"];
        var json = JSON.stringify([cmd, payload]);
        var buff_len = Buffer.byteLength(json, 'utf8');
        packet.push(left_pad(buff_len.toString(10), "0", 8));
        packet.push(json);
        return packet.join(' ');
    };
    return SimplePC_Base;
})();
var SimplePC_Packet = (function () {
    function SimplePC_Packet() {
        this.msg = null;
        this.pkt = '';
    }
    SimplePC_Packet.prototype.add_data = function (data) {
        this.pkt = this.pkt + data;
    };
    SimplePC_Packet.prototype.is_ready = function () {
        // Avoid being clever for now by building a neat state machine    
        if (this.pkt.length < 12)
            return false;
        var hdr_ver = this.pkt.slice(0, 4);
        var hdr_size = this.pkt.slice(4, 12);
        var payload = this.pkt.slice(13);
        if (hdr_ver != 'rq2 ')
            throw new Error('invalid protocol');
        var len = parseInt(hdr_size, 10);
        if (len < Buffer.byteLength(payload, 'utf8'))
            return false;
        // throw new Error('invalid protocol - length mismatch');
        // Ok, extract json
        var json = this.pkt.slice(13, 13 + len);
        this.msg = JSON.parse(json);
        // Ok - if we make it to here, we are done
        // consume the data
        this.pkt = this.pkt.slice(13 + len + 1);
        return true;
    };
    return SimplePC_Packet;
})();
var SimplePC_UnixDomain_Server = (function (_super) {
    __extends(SimplePC_UnixDomain_Server, _super);
    function SimplePC_UnixDomain_Server(path) {
        var _this = this;
        _super.call(this, path);
        this.in_box = [];
        this.fiber = fibers.current;
        this.out_box = this.create_rq_packet('ok', []);
        try {
            fs.unlinkSync(path);
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
        }
        this.listen_sock = net.createServer(function (sock) {
            // We get a connection
            var pkt = new SimplePC_Packet();
            sock.on('data', function (d) {
                pkt.add_data(d);
                if (pkt.is_ready()) {
                    //console.log('writing reply: ', this.out_box);
                    sock.write(_this.out_box); // send standard 'ok' reply
                    sock.end();
                    _this.in_box.push(pkt.msg);
                    if (!_this.in_sleep)
                        _this.fiber.run();
                }
            });
            sock.on('close', function () { });
            sock.on('end', function () { });
            sock.on('error', function (e) {
                console.log('got error', e);
                throw new Error('socket error: ' + e);
            });
        });
        this.listen_sock.listen(path);
    }
    SimplePC_UnixDomain_Server.prototype.sleep = function (millis) {
        var _this = this;
        this.in_sleep = true;
        setTimeout(function () {
            _this.in_sleep = false;
            _this.fiber.run();
        }, millis);
        fibers.yield();
    };
    SimplePC_UnixDomain_Server.prototype.shutdown = function () {
        this.listen_sock.close();
        this.listen_sock = null;
    };
    SimplePC_UnixDomain_Server.prototype.receive = function (timeout_ms) {
        var _this = this;
        if (this.fiber !== fibers.current)
            throw new Error('Invalid fiber');
        if (this.in_box.length != 0) {
            var x = this.in_box.shift(); //interesting - how would we prove
            this.shutdown();
            return x; // to a prover that this cannot
        }
        var timer = setTimeout(function () {
            _this.in_box.unshift('timeout');
            _this.fiber.run();
        }, timeout_ms);
        fibers.yield();
        clearTimeout(timer);
        timer = null;
        if (this.in_box.length == 0)
            throw new Error('bad result');
        if (this.in_box[0] == 'timeout')
            throw new Error('timeout');
        var result = this.in_box.shift();
        this.shutdown();
        return result;
    };
    SimplePC_UnixDomain_Server.prototype.receive_multi = function (timeout_ms, num_msgs, cb) {
        var _this = this;
        if (this.fiber !== fibers.current)
            throw new Error('Invalid fiber');
        while (num_msgs) {
            if (this.in_box.length != 0) {
                console.log('already here');
                num_msgs--;
                var x = this.in_box.shift(); //interesting - how would we prove
                cb(x); // to a prover that this cannot
                // return 'timeout'
                continue;
            }
            var timer = setTimeout(function () {
                _this.in_box.unshift('timeout');
                _this.fiber.run();
            }, timeout_ms);
            fibers.yield();
            clearTimeout(timer);
            timer = null;
            if (this.in_box.length == 0)
                throw new Error('bad result');
            if (this.in_box[0] == 'timeout')
                throw new Error('timeout');
            var result = this.in_box.shift();
            num_msgs--;
            cb(result);
        }
        this.shutdown();
    };
    return SimplePC_UnixDomain_Server;
})(SimplePC_Base);
exports.SimplePC_UnixDomain_Server = SimplePC_UnixDomain_Server;
var SimplePC_UnixDomain_Client = (function (_super) {
    __extends(SimplePC_UnixDomain_Client, _super);
    function SimplePC_UnixDomain_Client(path) {
        var _this = this;
        _super.call(this, path);
        var sock = net.connect(path);
        this.sock = sock;
        this.connected = false;
        this.in_box = [];
        // sigh... connect may take a while...
        sock.on("connect", function () {
            _this.connected = true;
            if (_this.out_box) {
                sock.write(_this.out_box);
            }
        });
        var pkt = new SimplePC_Packet();
        sock.on('data', function (d) {
            pkt.add_data(d);
            if (!pkt.is_ready())
                return;
            if (pkt.msg[0] != "ok")
                throw new Error('server error: ' + pkt.msg);
            _this.in_box.push(pkt.msg);
            _this.fiber.run();
        });
        sock.on('close', function () { });
        sock.on('end', function () { });
        sock.on('error', function (e) {
            console.log('got error', e);
            throw new Error('socket error: ' + e);
        });
    }
    SimplePC_UnixDomain_Client.prototype.send = function (timeout_ms, cmd, payload) {
        var _this = this;
        var pkt = this.create_rq_packet(cmd, payload);
        if (this.connected)
            this.sock.write(pkt);
        else
            this.out_box = pkt;
        this.fiber = fibers.current;
        var timer = setTimeout(function () {
            _this.in_box.unshift('timeout');
            _this.fiber.run();
        }, timeout_ms);
        fibers.yield();
        clearTimeout(timer);
        timer = null;
        if (this.in_box.length == 0)
            throw new Error('bad state');
        if (this.in_box[0] == 'timeout')
            throw new Error('timeout');
        var result = this.in_box.shift();
        this.fiber = null; // Free up for GC
        return result;
    };
    return SimplePC_UnixDomain_Client;
})(SimplePC_Base);
exports.SimplePC_UnixDomain_Client = SimplePC_UnixDomain_Client;
// TODO
// enum for status
// objects for msg and msg-id
// logging with levels
var SimplePC = (function () {
    function SimplePC() {
    }
    SimplePC.create_unix_server = function (path) {
        var o = new SimplePC_UnixDomain_Server(path);
        return o;
    };
    SimplePC.create_unix_client = function (path) {
        var o = new SimplePC_UnixDomain_Client(path);
        return o;
    };
    return SimplePC;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SimplePC;

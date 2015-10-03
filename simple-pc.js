var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var net = require('net');
var fs = require('fs');
var path = require('path');
var SimplePC_Base = (function () {
    function SimplePC_Base(path) {
        this.path = path;
    }
    SimplePC_Base.prototype.left_pad = function (txt, pad, total) {
        if (txt.length >= total)
            return txt;
        if (pad.length != 1)
            throw 'invalid pad';
        var num = total - txt.length;
        var array = new Array(num);
        array.push(txt);
        var result = array.join(pad);
        return result;
    };
    SimplePC_Base.prototype.create_rq_packet = function (cmd, payload) {
        var packet = ["rq1"];
        var json = JSON.stringify(payload);
        var data = cmd + " " + json;
        var buff_len = Buffer.byteLength(data, 'utf8');
        packet.push(this.left_pad(buff_len.toString(10), "0", 8));
        packet.push(data);
        return packet.join(' ');
    };
    SimplePC_Base.prototype.send_packet = function (queue_name, packet, callback) {
        // Open unix domain socket
        var que_path = path.join(this.path, 'queue', queue_name, 'queue.sock');
        var client = net.createConnection(que_path);
        console.log(que_path);
        client.on("connect", function () {
            console.log(packet);
            client.write(packet);
        });
        var body = [];
        client.on('data', function (d) { body.push(d); });
        client.on('close', function () { });
        client.on('error', function (e) { console.log('got error', e); });
        client.on('end', function () {
            var resp = body.join('');
            console.log("Got response: " + resp);
            var parts = [resp.slice(0, 4), resp.slice(4, 12), resp.slice(13)];
            if (parts[0] != 'rq1 ')
                return callback('invalid protocol', null);
            var len = parseInt(parts[1], 10);
            if (len != Buffer.byteLength(parts[2], 'utf8'))
                return callback('invalid response - len mismatch', null);
            var msg = JSON.parse(parts[2]);
            if (msg[0] == "ok")
                callback(null, msg[1]);
            else
                callback("server", msg);
        });
    };
    return SimplePC_Base;
})();
var SimplePC_UnixDomain_Server = (function (_super) {
    __extends(SimplePC_UnixDomain_Server, _super);
    function SimplePC_UnixDomain_Server(path) {
        _super.call(this, path);
        this.sockets = [];
        try {
            fs.unlinkSync(path);
        }
        catch (e) {
            if (e.code !== 'ENOENT')
                throw e;
        }
        var srv = net.createServer(function (sock) {
        });
    }
    SimplePC_UnixDomain_Server.prototype.on_msg = function (msg_cb) {
        this.msg_cb = msg_cb;
    };
    return SimplePC_UnixDomain_Server;
})(SimplePC_Base);
var SimplePC_UnixDomain_Client = (function (_super) {
    __extends(SimplePC_UnixDomain_Client, _super);
    function SimplePC_UnixDomain_Client(path) {
        var _this = this;
        _super.call(this, path);
        var sock = net.createConnection(path);
        this.sock = sock;
        this.connected = false;
        // sigh... connect may take a while...
        sock.on("connect", function () {
            _this.connected = true;
            if (_this.out_box) {
                sock.write(_this.out_box);
            }
        });
        var body = [];
        sock.on('data', function (d) { body.push(d); });
        sock.on('close', function () { });
        sock.on('error', function (e) { console.log('got error', e); });
        sock.on('end', function () {
            var resp = body.join('');
            console.log("Got response: " + resp);
            var parts = [resp.slice(0, 4), resp.slice(4, 12), resp.slice(13)];
            if (parts[0] != 'rq1 ')
                return this.err_cb('invalid protocol');
            var len = parseInt(parts[1], 10);
            if (len != Buffer.byteLength(parts[2], 'utf8'))
                return this.err_cb('invalid response - len mismatch');
            var msg = JSON.parse(parts[2]);
            if (msg[0] == "ok")
                this.reply_cb(msg[1]);
            else
                this.err_cb("server", msg);
        });
    }
    SimplePC_UnixDomain_Client.prototype.send = function (cmd, payload) {
        var pkt = this.create_rq_packet(cmd, payload);
        if (this.connected)
            this.sock.write(pkt);
        else
            this.out_box = pkt;
    };
    SimplePC_UnixDomain_Client.prototype.on_reply = function (cb) {
        this.reply_cb = cb;
    };
    SimplePC_UnixDomain_Client.prototype.on_err = function (cb) {
        this.err_cb = cb;
    };
    return SimplePC_UnixDomain_Client;
})(SimplePC_Base);
// TODO
// enum for status
// objects for msg and msg-id
// logging with levels
var SimplePC = (function () {
    function SimplePC() {
    }
    SimplePC.create_unix_listener = function (path) {
        var o = new SimplePC_UnixDomain_Server(path);
        return o;
    };
    SimplePC.create_unix_client = function (path) {
        var o = new SimplePC_UnixDomain_Client(path);
        return o;
    };
    return SimplePC;
})();
module.exports = SimplePC;

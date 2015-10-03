

import net = require('net');
import fs = require('fs');
import path = require('path');


class SimplePC_Base
{
  
  path:string;
  
  constructor(path:string)
  {
    this.path = path;
  }
  
  private left_pad(txt:string, pad:string, total:number):string
  {
    if (txt.length >= total)
      return txt;
    if (pad.length != 1)
      throw 'invalid pad';

    let num = total - txt.length;
    
    let array = new Array(num);
    array.push(txt);

    let result = array.join(pad); 
    return result;
    
  }

  protected create_rq_packet(cmd:string, payload:any):string
  {
      let packet = ["rq1"];
      var json = JSON.stringify(payload);
      var data = cmd + " " + json;
      var buff_len = Buffer.byteLength(data, 'utf8');
      packet.push(this.left_pad(buff_len.toString(10), "0", 8));
      packet.push(data);
      
      return packet.join(' ');
  }
  
  private send_packet(queue_name:string, packet:string, callback:(err:string, result:any) => void):any
  {
    // Open unix domain socket
    var que_path = path.join(this.path, 'queue', queue_name, 'queue.sock');
    var client = net.createConnection(que_path);
    console.log(que_path);
    client.on("connect", function() {
      console.log(packet);
      client.write(packet);
    });
    
    var body = [];
    client.on('data', function (d) { body.push(d) });
    client.on('close', function () { });
    client.on('error', function (e) { console.log('got error', e) });
    client.on('end', function () {
      var resp = body.join('');
      console.log("Got response: " + resp);
  
      var parts = [ resp.slice(0,4), resp.slice(4,12), resp.slice(13) ];
    
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
  
  }
  
  
}

class SimplePC_UnixDomain_Server extends SimplePC_Base
{
  sockets:net.Socket[];
  msg_cb:(msg:any)=>void;
  
  constructor(path:string)
  {
    super(path);
    this.sockets = [];
    fs.unlinkSync(path);
    var srv = net.createServer((sock) => {
    });
  }
  
  on_msg(msg_cb:(msg:any)=>void)
  {
    this.msg_cb = msg_cb;
  }
}

class SimplePC_UnixDomain_Client  extends SimplePC_Base
{
  sock:net.Socket;
  err_cb:(msg:string)=>void;
  reply_cb:(msg:any)=>void;
  connected:boolean;
  out_box:any;
  
  constructor(path:string)
  {
    super(path);
    var sock = net.createConnection(path);
    this.sock = sock;
    this.connected = false;
    
    // sigh... connect may take a while...
    sock.on("connect", () => {
      this.connected = true;
      if (this.out_box) {
        sock.write(this.out_box);
      }
    });
    
    var body = [];
    sock.on('data', function (d) { body.push(d) });
    sock.on('close', function () { });
    sock.on('error', function (e) { console.log('got error', e) });
    sock.on('end', function () {
      var resp = body.join('');
      console.log("Got response: " + resp);
  
      var parts = [ resp.slice(0,4), resp.slice(4,12), resp.slice(13) ];
    
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
  
  send(cmd:string, payload:any):any
  {
    let pkt = this.create_rq_packet(cmd, payload);
    if (this.connected)
      this.sock.write(pkt);
    else
      this.out_box = pkt;
  }
  
  on_reply(cb:(msg:any)=>void)
  {
    this.reply_cb = cb;
  }

  on_err(cb:(msg:any)=>void)
  {
    this.err_cb = cb;
  }
}

// TODO
// enum for status
// objects for msg and msg-id
// logging with levels

class SimplePC
{

  static create_unix_listener(path:string):SimplePC_UnixDomain_Server
  {
    let o = new SimplePC_UnixDomain_Server(path);
      
    return o;
  }

  static create_unix_client(path:string):SimplePC_UnixDomain_Client
  {
    let o = new SimplePC_UnixDomain_Client(path);
      
    return o;
  }
}

module.exports = SimplePC;